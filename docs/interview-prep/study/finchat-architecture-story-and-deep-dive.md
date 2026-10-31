if# FinChat: The Architectural Story & Deep-Dive Guide
### How to Explain FinChat to Recruiters, Hiring Managers, and Senior Engineers

---

## Prologue: The Elevator Pitch (The Problem and the Vision)

Imagine you are an equity research analyst sitting at an investment desk. Every single day, you are bombarded by two completely different types of information. 

On one side, you have **hard, volatile numbers**: live stock prices fluctuating every second, price-to-earnings ratios, dividend yields, debt-to-equity figures, and complex financial statements. 

On the other side, you have a mountain of **unstructured legal text**: hundred-page annual reports, quarterly regulatory disclosures, management discussion transcripts, and fast-moving industry news.

To make an investment decision, an analyst has to mentally combine both worlds. They have to run valuation models on the numbers to calculate what a stock is genuinely worth, while simultaneously reading dense filings to discover what risks could wipe out the company's profits.

When generative AI first exploded, many developers thought: *"Why not just feed all of this into ChatGPT and ask it for stock advice?"* 

That naive idea led to an immediate disaster known across computer science as the **Stochastic Parrot trap**. 

Large Language Models (LLMs) are predictive language engines; they calculate probability distributions over words. They are fundamentally incapable of reliable arithmetic. If you ask an LLM to take a company's free cash flows, project them five years into the future, discount them back by a 9% cost of capital, and calculate the intrinsic share price, the model will output a number that *sounds* sophisticated, but the underlying math is completely hallucinated. In finance, trading on fabricated numbers leads to catastrophic losses.

**FinChat was born to solve this exact problem.** 

Instead of letting an AI guess financial math, FinChat was engineered around a **Dual-Pillar Hybrid Architecture**:
1. **The Mathematical Pillar:** A rock-solid, deterministic Python engine that executes exact financial formulas (Discounted Cash Flow, WACC, and Monte Carlo risk simulations) using scientific libraries like NumPy. The AI is strictly prohibited from touching the calculator.
2. **The Qualitative Reasoning Pillar:** An intelligent AI layer that reads human language, pulls relevant paragraphs from real company filings using Retrieval-Augmented Generation (RAG), orchestrates specialized tools, and explains the quantitative numbers in clear, grounded English.

Now, let us tell the story of how this entire system works under the hood.

---

# Act 1: The Journey of a Click — The Architecture as a Living City

Let us take a journey through the system, not by listing filenames, but by watching what happens from the moment a user sits at their desk, opens FinChat in their browser, and submits a prompt:
> *"Analyze the valuation and risks of Reliance Industries."*

```
[ THE BROWSER ]                     [ THE NETWORK ]                    [ THE ENGINE ]
  User types query                        |                                  |
  UI creates loading card                 |                                  |
         |                                |                                  |
         v                                v                                  |
  Dual-Track Dispatch -----------> HTTP POST JSON -------------------> FastAPI Server
  (Track 1: Stock UI)              (CORS Clearance)                    (Pydantic Validation)
  (Track 2: RAG Pipe)              (90s Timeout)                             |
                                                                             v
                                                                   Autonomous Agent
                                                                   - Calls Quote Tool
                                                                   - Calls Quant Engine
                                                                   - Calls RAG Retriever
                                                                             |
  UI receives response <---------- HTTP 200 JSON <---------------------------+
  - Replaces loading card          (Answer + Citations + Badge)
  - Shows green Groq pill
  - Smooth auto-scroll
```

---

### Scene 1: The Front Desk (The React Terminal)
The user interface is a modern Single Page Application built with React and TypeScript. Think of this as the trading desk terminal. 

When the user types a company name into the chat box, the browser does not wait for a full page reload. Every single keystroke updates an internal variable in the browser's memory, ensuring that typing feels crisp and responsive.

When the user presses **Enter**, the browser's native instinct is to reload the entire web page. The application immediately steps in and cancels this default behavior. It takes the user's message, pins it to the screen, and immediately creates a temporary placeholder message that shows an animated pulsing three-dot indicator. This gives the user immediate visual confirmation that their request was received and the engine is at work. At the same moment, the input box is disabled so the user cannot accidentally submit duplicate requests while one is already in flight.

Now, the application does something brilliant: it splits the workload into **two independent, parallel tracks**:
* **Track 1 (The Speed Track):** It extracts the ticker symbol and asks the server for the current market quote and candlestick chart. This takes only about 400 milliseconds. Almost instantly, the left side of the analyst's screen updates to show Reliance Industries' live price, daily percentage change, and valuation multiples.
* **Track 2 (The Intelligence Track):** Simultaneously, it launches the deep analytical query across the network. Because Track 1 and Track 2 are completely independent, the user is never stuck staring at a frozen, unresponsive screen.

---

### Scene 2: Crossing the Bridge (The Network Boundary)
To send the deep analytical query to the server, the browser packages the user's request into a standardized digital envelope known as an **HTTP POST request**. 

Inside this envelope is a plain-text message formatted as JSON, specifying the user's question, the stock ticker, and the session settings.

Before this envelope can leave the browser, two critical engineering mechanisms kick in:
1. **The Emergency Lifeline (`AbortSignal.timeout`):** The browser attaches a 90-second countdown timer to the request. If the server ever crashes, hangs, or encounters a network blackout, the browser will not wait forever with a frozen spinner. The moment the 90 seconds elapse, the browser cuts the connection and displays an honest error message.
2. **The Security Clearance (CORS):** The browser is running on port 5173, but the server lives on port 8000. Under internet security rules, browsers forbid one website from secretly talking to a different port. Before sending the real data, the browser sends an invisible preliminary check asking the server: *"Are you willing to accept a POST request containing JSON from me?"* The server responds with security headers granting permission, and the real data crosses the bridge.

---

### Scene 3: The Digital Bouncer (FastAPI and Pydantic)
On the server side sits **FastAPI**, running on an asynchronous engine called **Uvicorn**.

Unlike older web servers that assign an entire operating system thread to every single user (which quickly runs out of memory if hundreds of people connect at once), this server uses an **asynchronous event loop**. While it is waiting for an AI model or a market provider across the internet to answer, it pauses that specific task and handles other incoming requests, allowing a single server to handle thousands of simultaneous connections effortlessly.

When our HTTP envelope arrives at the `/api/rag-query` doorway, the server does not immediately pass it to the business logic. Standing at the door is a digital bouncer powered by **Pydantic**. 

Pydantic inspects the contents of the envelope:
* Is the query present? Yes.
* Is it a text string? Yes.
* Are the boolean flags valid? Yes.

If a corrupted or malicious program sends a number where text was expected, Pydantic stops it right at the door and throws it out with an **HTTP 422 Unprocessable Entity** error. No broken data is ever allowed to reach the core engine.

Once cleared, the request enters the server's brain.

---

# Act 2: The Deep Dive into RAG (What It Really Is, Stripped of Buzzwords)

Now we arrive at one of the most important concepts you will be tested on in any modern technical interview: **Retrieval-Augmented Generation (RAG)**.

Interviewers love to ask about RAG because many candidates use it as a buzzword without understanding the underlying computer science. Here is how you explain it clearly.

```
[ RAW PDF FILINGS ]
        |
        v
[ 1. Chunking Engine ] --------> Breaks 100-page PDF into 700-character blocks
        |                        with 120-character overlapping seams
        v
[ 2. Embedding Model ] --------> Translates text blocks into 384-dimensional
        |                        vectors (coordinates in semantic space)
        v
[ 3. Vector Database ] --------> Indexes coordinates (Pinecone / FAISS)
        |
        +<----------------------- User asks: "What are the risks of Reliance?"
        |                         (Query is embedded into the same 384D space)
        v
[ 4. Cosine Search ] ----------> Measures geometric angle between vectors
        |                        Filters for high similarity (>= 0.55 threshold)
        v
[ 5. Grounded Prompt ] --------> Hands top 4 passages to the LLM:
                                 "Answer using ONLY these passages. Cite pages."
```

---

### The Problem RAG Solves: The Brilliant Student in a Soundproof Room
Think of a Large Language Model as a brilliant student who graduated with top honors two years ago. They know general finance, accounting principles, and economics inside out. 

However, they are locked inside a soundproof room with no internet connection. They have no idea what Reliance Industries reported in their annual report last week, and they have never seen your private corporate documents.

If you ask this student: *"What are the exact environmental litigation risks facing Reliance this quarter?"*, they have two bad choices:
1. Admit they don't know.
2. Guess based on general patterns, inventing believable-sounding lawsuits that do not actually exist (hallucination).

**RAG is the process of slipping the exact, relevant textbook pages under the door to the student right before they answer your question.**

Here is the exact 5-step pipeline that makes this happen:

---

### Step 1: The Paper Shredder & Glue (Chunking with Overlap)
You cannot simply dump a 200-page PDF into an AI prompt. It would overflow the model's memory (context window) and cost a fortune.

Instead, when an annual report is uploaded, FinChat runs it through an extraction engine that reads every page. Then, a text splitter slices the document into bite-sized paragraphs called **Chunks** (in FinChat, each chunk is roughly 700 characters long).

**Why do chunks need overlap?**  
Imagine a crucial sentence in a filing:  
> *"Due to unprecedented fluctuations in European energy markets, the refining division suffered a 14% contraction in gross margins."*

If your text splitter blindly cuts the document exactly at character 700, the knife might fall right between the words *"suffered a"* and *"14% contraction"*. 
Chunk 1 gets the cause, Chunk 2 gets the effect, and the meaning of both chunks is destroyed.

To prevent this, FinChat uses a **120-character sliding overlap**. The end of Chunk 1 repeats at the beginning of Chunk 2. This guarantees that no thought or financial fact is severed in half by an arbitrary boundary.

---

### Step 2: Translating Human Thoughts into Geometry (Embeddings)
Computers cannot read English; they can only do math. To compare the user's question with thousands of document chunks, we must translate text into numbers.

FinChat passes every chunk into a specialized neural network called an **Embedding Model** (`BAAI/bge-small-en-v1.5`). 

This model maps every chunk of text to a point in a **384-dimensional geometric space**. That means every paragraph is represented by an array of 384 decimal numbers:
`[0.0421, -0.1983, 0.8812, ..., -0.0514]`

In this geometric space, **meaning equals location**. 
* The phrase *"refining margin compression"* and the phrase *"oil processing profitability decline"* use completely different words, but because their underlying concept is identical, the embedding model places them right next to each other in the 384-dimensional space.
* A paragraph about *"office catering menus"* will be placed miles away in a completely different corner of the coordinate system.

---

### Step 3: The Geometric Compass (Cosine Similarity)
When the user types *"What are the risks of Reliance?"*, that question is also passed into the embedding model, generating its own 384-dimensional coordinate.

Now, the vector database acts like a high-speed radar. It measures the angle between the user's query vector and every stored chunk vector. This mathematical calculation is called **Cosine Similarity**:

$$\text{Cosine Similarity} = \frac{\mathbf{A} \cdot \mathbf{B}}{\|\mathbf{A}\| \|\mathbf{B}\|}$$

* If two vectors point in the exact same direction, the cosine is **1.0** (perfect semantic match).
* If they are completely orthogonal and unrelated, the cosine drops toward **0.0**.

---

### Step 4: The Hallucination Bouncer (The 0.55 Similarity Threshold)
This is a critical architectural detail that separates amateur projects from production-grade engineering.

In early testing, we had our similarity threshold set to a low value (0.28). When a user asked about a company whose documents were *not* in the database (for example, Accenture), the system searched for the closest matches anyway. It pulled up paragraphs from an accounting textbook by Richard Pike simply because the textbook contained the words "corporate revenue". The AI then tried to answer an Accenture question using an unrelated textbook, hallucinating wild answers!

To fix this, we raised the threshold to **0.55**. 

If the user asks a question and the highest-scoring document in the database only achieves a 0.42 similarity score, the system recognizes that it has no relevant information. It **refuses to hallucinate**. Instead, it returns `found_documents: false` and displays two interactive choices to the user:
* 📁 *Upload relevant PDF files to the vault for this company.*
* 🌐 *Continue with a general financial market search.*

---

### Step 5: Grounded Prompt Injection
If matching chunks *do* exceed 0.55, the top 4 passages are retrieved, complete with their document names and page numbers.

The server constructs an ironclad prompt for the LLM:
> *"You are FinChat. Answer the user's question using ONLY the retrieved document passages below. Cite the exact document names and page numbers. If the answer cannot be found in the passages, state that you do not have sufficient data."*

The LLM is now anchored in physical reality. When it speaks about refining margins, it cites `Page 42 of Reliance_Annual_Report.pdf`. The human analyst can verify the claim with a single click.

---

# Act 3: The Deep Dive into Tool Calling (A User-Centric Masterclass)

The second cornerstone of modern AI systems is **Tool Calling** (also known as Function Calling). 

To explain this to an interviewer, you must first demystify how AI models actually work.

### The Myth vs. The Reality
* **The Common Myth:** Many people believe that when an AI calls a tool, the AI itself opens a network connection, runs Python code inside its neural network, fetches data, and continues talking.
* **The Engineering Reality:** An LLM is simply a text-in, text-out machine. An LLM **cannot** execute code, cannot ping an API, and cannot access your local hard drive. 

Tool calling is actually a **cooperative dance** between the AI and the host server.

Let us walk through an exact, step-by-step example from the user's perspective.

---

```
[ USER ] asks: "What is the intrinsic DCF fair value of Reliance with a 9% WACC?"
   |
   v
[ HOST BACKEND ] sends prompt to AI along with a "Toolbox Catalog":
   "You have access to a tool named `run_dcf_valuation(ticker, wacc, terminal_growth)`"
   |
   v
[ AI MODEL ] reasons internally:
   "I am an LLM. I must NOT calculate DCF math myself because I will hallucinate.
    I must call the tool `run_dcf_valuation`."
   |
   v
[ AI MODEL ] stops generating human text and outputs a structured command:
   `TOOL_CALL: run_dcf_valuation(ticker="RELIANCE.NS", wacc=0.09, terminal_growth=0.025)`
   |
   v
[ HOST BACKEND ] intercepts this command:
   - Does NOT show this raw code to the user.
   - Executes the REAL Python function: `FinancialQuantEngine.calculate_dcf(...)`
   - NumPy runs the exact math: projects cash flows, discounts them, applies Gordon Growth.
   - Result: Fair value = ₹1,480.00 (+10.8% upside).
   |
   v
[ HOST BACKEND ] feeds the result back to the AI as an "Observation":
   "Tool Observation: Fair Value is ₹1,480.00, Implied Upside is +10.8%."
   |
   v
[ AI MODEL ] reads the observation and finishes its answer to the user:
   "Based on our deterministic 5-year Discounted Cash Flow model using a 9% WACC,
    the intrinsic fair value of Reliance Industries is ₹1,480.00, representing a +10.8% upside."
```

---

### Step-by-Step Breakdown of the Tool Calling Dance

#### 1. Equipping the AI with a "Toolbox Catalog"
When the server sends the user's prompt to the LLM, it does not send the prompt alone. In the background, it provides a list of specifications describing the tools the server knows how to run:
* **Tool Name:** `get_live_quote` | **Description:** Fetches current stock price and market cap.
* **Tool Name:** `get_fundamentals` | **Description:** Fetches P/E ratios, profit margins, and debt-to-equity.
* **Tool Name:** `run_dcf_valuation` | **Description:** Executes deterministic Discounted Cash Flow valuation in Python.
* **Tool Name:** `search_knowledge_base` | **Description:** Searches vector database for 10-K filing disclosures.

#### 2. The AI's Decision to Pause
The AI reads the user's question: *"What is the valuation of Reliance with a 9% WACC?"*

The AI's internal reasoning loop (the **ReAct** pattern) evaluates the situation:
> *"The user is asking for an exact DCF valuation. If I calculate this myself, I will make an arithmetic error. In my toolbox catalog, there is a tool specifically designed for this: `run_dcf_valuation`. I will invoke this tool."*

#### 3. The Structured Command
Instead of returning regular conversational English to the user, the AI intentionally outputs a special structured data block (usually a JSON payload):
```json
{
  "tool_name": "run_dcf_valuation",
  "arguments": {
    "ticker": "RELIANCE.NS",
    "wacc": 0.09,
    "terminal_growth": 0.025
  }
}
```

#### 4. The Server Interception & Execution
The AI pauses and yields control back to our FastAPI backend.

The backend intercepts this JSON payload. It recognizes that the AI is not finished speaking; it is requesting a tool execution. 

Our Python code in `backend/agent_engine.py` reads the tool name, matches it to the real Python function, and executes it:
```python
dcf_result = FinancialQuantEngine.calculate_dcf(
    ticker="RELIANCE.NS",
    wacc=0.09,
    terminal_growth=0.025
)
```
Python connects to scientific computing libraries. NumPy calculates the exact five-year cash flow projections, discounts them to the present value, computes the terminal value using the Gordon Growth Model, subtracts net debt, divides by total shares, and produces the verified answer: **₹1,480.00 per share**.

#### 5. Handing the Evidence Back (The Observation)
The backend takes this verified mathematical output and appends it to the AI's conversation history as a new message labeled with the role `"tool"` or `"observation"`:
> *"Observation from run_dcf_valuation: Base Fair Value is ₹1,480.00, Implied Upside is +10.8%."*

#### 6. The Final Grounded Narrative
The backend asks the AI to resume generating text, now equipped with the observation.

The AI reads the observation and speaks directly to the human analyst:
> *"Based on our deterministic 5-year Discounted Cash Flow model using a 9% WACC and a 2.5% terminal growth rate, the intrinsic fair value of Reliance Industries is ₹1,480.00 per share. With the stock currently trading at ₹1,335.50, this represents an implied upside of +10.8%."*

**The result is perfection:** The user experienced an intelligent, conversational assistant, but every single digit, percentage, and valuation metric came from a verified, deterministic Python calculation. Zero math was left to chance.

---

# Act 4: The Safety Nets (Circuit Breakers and Resilience)

In computer science, anyone can build a system that works when everything goes right. Senior engineers are hired because they build systems that survive when everything goes wrong.

FinChat implements two critical resilience architectures:

---

### The Hugging Face 25-Second Circuit Breaker
Our fine-tuned model (a custom Llama-3 3B GGUF) is deployed on a free Hugging Face Space. Free spaces run on basic **2-vCPU hardware** without GPU acceleration.

When an analyst submitted a query with a large RAG context, prefilling the prompt and generating tokens on two virtual CPUs took upwards of 45 to 60 seconds. This reliably exceeded Hugging Face's 60-second gateway proxy timeout, causing the connection to drop and the frontend to display:
> *"Could not complete RAG query. Please check your backend connection."*

To fix this without spending thousands of dollars on cloud GPUs, we engineered an automatic **server-side circuit breaker**:
1. We optimized the prompt for the CPU space: trimming context to 650 characters and capping tokens to 45.
2. We wrapped the request in a **strict 25-second deadline**: `requests.post(..., timeout=25)`.
3. If the CPU space does not finish within 25 seconds, the server catches the timeout exception immediately and logs:
   `[NOTE] Seamlessly falling back to Groq Cloud model due to CPU Space timeout/error...`
4. The server instantly re-routes the prompt to **Groq Cloud** running Qwen 3.8-27b on dedicated Language Processing Units (LPUs). Groq generates the full grounded answer in **380 milliseconds**.
5. The frontend receives the answer with a green badge: `Groq Cloud Fallback (qwen/qwen3.8-27b)`.

The user never experiences a broken screen or a crash; the system self-heals in real time.

---

### The 4-Tier Market Data Cascade
If Yahoo Finance goes down or blocks the server with an HTTP 429 rate limit, FinChat does not crash. It automatically cascades through four levels of defense:
1. **Tier 1:** Query `yfinance`.
2. **Tier 2:** If empty, query `Alpha Vantage`.
3. **Tier 3:** If international ticker resolution is needed, query `MarketStack`.
4. **Tier 4:** If all third-party APIs fail, load verified historical financial statements from an internal cached database (`STOCK_DATABASE`).

When Tier 4 activates, the frontend displays an amber notification banner:
> *"Live provider unavailable. Displaying sample historical data."*

This adheres to the financial engineering standard of **Honest Data Provenance**: you never display cached or simulated numbers as live market prices without explicit disclosure.

---

# Act 5: How to Tell This Story in an Interview

Here are exact scripts you can use when talking to recruiters, HR interviewers, and senior technical leads.

---

### The 60-Second Version (Perfect for HR or Recruiter Screeners)
> *"FinChat is an institutional-grade financial intelligence platform that combines conversational AI with deterministic quantitative modeling. 
> 
> The core problem we solved is that Large Language Models frequently hallucinate numbers when asked to calculate financial valuations like Discounted Cash Flows. We solved this by creating a Dual-Pillar Architecture: all mathematical modeling—such as DCF, WACC, and Monte Carlo risk simulations—is executed deterministically in pure Python using NumPy. The AI is strictly reserved for qualitative reasoning: parsing user intent, reading regulatory 10-K filings through Retrieval-Augmented Generation (RAG), and synthesizing grounded research memos.
> 
> We decoupled the application into a React 18 and TypeScript frontend modeled after a Bloomberg terminal, communicating over asynchronous REST APIs with a high-throughput FastAPI backend. It features multi-layered circuit breakers, including automatic failover from slow CPU models to ultra-fast Groq LPU inference, ensuring sub-second response times and zero mathematical hallucination."*

---

### The 3-Minute Version (For Technical Leads & System Architects)
> *"When designing FinChat, our primary architectural objective was zero mathematical hallucination with high I/O concurrency. 
> 
> We rejected monolithic frameworks like Streamlit because their full-script re-execution model locks user interfaces. Instead, we built a decoupled 3-tier system: a React 18 Single Page Application on Vite, a FastAPI asynchronous backend running on Uvicorn, and a multi-provider external layer encompassing market APIs, vector databases, and LLM inference.
> 
> On the frontend, when an analyst enters a query, we execute a dual-track asynchronous pattern. Track 1 resolves the ticker and updates market price charts in under 400 milliseconds, while Track 2 executes our grounded RAG pipeline concurrently, keeping the UI completely non-blocking.
> 
> On the backend, requests are validated at the gateway using Pydantic schemas. For valuation queries, we use an autonomous ReAct agent loop in `agent_engine.py` that orchestrates tool calling. The agent calls pure-Python mathematical functions in `quant_engine.py` to project 5-year free cash flows, discount them using WACC, compute terminal values via the Gordon Growth Model, and stress-test them across a 5x5 sensitivity matrix.
> 
> For qualitative filing analysis, we built a RAG pipeline using dense 384-dimensional vector embeddings with a strict cosine similarity threshold of 0.55 to prevent false-positive matches. If filings are relevant, excerpts are injected into the prompt, and the model cites exact page numbers.
> 
> Finally, we engineered defensive resilience across the entire stack: if our fine-tuned CPU model on Hugging Face exceeds a 25-second deadline, our server-side circuit breaker automatically fails over to Groq Cloud running Qwen on LPUs in under 400 milliseconds. If live market providers rate-limit, our 4-tier data cascade falls back to verified cached datasets with clear UI provenance banners."*

---

### The Behavioral Question: "Tell me about a time you solved a hard technical bug."
> *"During integration testing of our fine-tuned Llama-3 3B model on Hugging Face, we kept encountering gateway 504 timeouts. 
> 
> Because the model was hosted on a free 2-vCPU instance without GPU acceleration, processing large RAG prompt prefill with multiple document chunks took upwards of 50 seconds, which tripped our frontend's timeout and caused intermittent user dropouts.
> 
> I approached this systematically: first, I profiled the endpoint using direct HTTP payloads to isolate whether the bottleneck was network latency or token generation delay. Finding it was CPU prefill latency, I optimized the prompt structure, trimmed prefill context to 650 characters, and capped generation to 45 tokens. 
> 
> More importantly, I introduced a defensive architectural pattern: an automated server-side circuit breaker with a 25-second deadline. If the CPU space fails to respond within 25 seconds, the backend immediately catches the timeout and fails over seamlessly to Groq Cloud running Qwen 3.8-27b on LPUs, which completes in 400 milliseconds. I then increased the frontend AbortSignal deadline to 90 seconds to provide headroom for both attempts.
> 
> This eliminated our 504 drops entirely and taught me the importance of designing asynchronous systems that gracefully degrade rather than failing hard."*

---

# Summary Checklist: The 10 Core Concepts You Now Own

1. **The Dual-Pillar Principle:** Math belongs to deterministic code (NumPy); narrative belongs to generative models (LLMs).
2. **Decoupled Architecture:** React on port 5173 for smooth 60fps UI; FastAPI on port 8000 for secure, asynchronous compute.
3. **Dual-Track Asynchrony:** Stock card updates in ~400ms (Track 1) while RAG analysis runs concurrently in the background (Track 2).
4. **Controlled Inputs & `preventDefault`:** Intercepting browser events to maintain a smooth Single Page Application without screen reloads.
5. **CORS & Pre-flight:** How the browser checks origin security via `OPTIONS` before transmitting JSON payloads.
6. **Pydantic Validation:** Type enforcement at the network boundary that rejects bad payloads with HTTP 422 before code executes.
7. **RAG Mechanics:** Document chunking with 120-character overlap $\rightarrow$ 384-dimensional vector embeddings $\rightarrow$ cosine similarity search $\rightarrow$ 0.55 threshold filter $\rightarrow$ grounded prompt injection.
8. **Tool Calling Mechanics:** The AI pauses, outputs a structured JSON tool request; the host server executes the real Python function, returns the numerical observation, and the AI resumes with verified numbers.
9. **The 25-Second Circuit Breaker:** Preventing CPU space hangs by falling over to Groq Cloud LPUs in 400ms.
10. **Honest Data Provenance:** Cascading through 4 market data tiers and explicitly warning the user when fallback sample data is displayed.

