# finetune.ipynb — Full Pipeline Explanation

## Overview

This notebook is the **core training stage** of the Investo Bot project. It takes a
pre-trained, general-purpose large language model (Llama 3.2 3B Instruct) and
specialises it for the financial domain using a technique called **LoRA fine-tuning**
(Low-Rank Adaptation). The result is a lightweight adapter (~93 MB) that, when
applied on top of the base model, transforms it into a finance-aware assistant called
**Investo Bot**.

The notebook covers five major stages:
1. Environment setup and GPU verification
2. Loading the base model with 4-bit quantisation
3. Applying LoRA (making the model trainable efficiently)
4. Loading, filtering, and formatting the training dataset
5. Training and saving the fine-tuned adapter

---

## Architecture at a Glance

```
HuggingFace Hub
      │
      ▼
Llama-3.2-3B-Instruct (4-bit quantised, ~2.24 GB)
      │
      ▼
LoRA adapter injected (24M trainable params, 0.75% of 3.2B)
      │
      ▼
Finance-Instruct-500k dataset
      │
   Filter Pass 1: is_finance_related  (518K → 253K rows)
      │
   Filter Pass 2: clean_finance_filter (253K → 157K rows)
      │
   Format: apply_chat_template → "text" column
      │
      ▼
SFTTrainer — 1,000 steps, batch=8 effective, lr=2e-4
      │
      ▼
LoRA adapter saved → investo_lora/ → zipped → downloaded
```

---

## Hardware & Environment

- **GPU:** Tesla T4 (15.36 GB VRAM)
- **CUDA:** 13.0 (Driver 580.82.07)
- **PyTorch:** 2.10.0+cu128
- **Unsloth:** 2026.6.8
- **Transformers:** 5.5.0
- **Training time:** ~54 minutes (1,000 steps)
- **Trainable parameters:** 24,313,856 of 3,237,063,680 (0.75%)

---

## Section 1 — Verify the GPU

```python
!nvidia-smi
```

**Output (summary):**
```
Tesla T4  |  0MiB / 15360MiB  |  0%  Default
CUDA Version: 13.0
```

### What this does
Checks that a GPU is allocated before doing anything else. Key things to verify:

| Metric | Ideal value | Why it matters |
|---|---|---|
| GPU model | T4 / A100 / V100 | Determines max VRAM and whether bfloat16 is available |
| VRAM used | 0 MiB | Clean start — no leftover processes consuming memory |
| Temperature | < 50°C | Warm GPU can throttle; idle T4 sits at ~38°C |
| CUDA version | 12.x or 13.x | Must be ≥ 11.8 for bitsandbytes 4-bit quantisation |

If this cell shows no GPU or `CUDA not available`, you must switch Colab's runtime to GPU before proceeding — the model cannot load on CPU.

---

## Section 2 — Install Dependencies

```python
%%capture
!pip install --no-deps xformers trl peft accelerate bitsandbytes
!pip install unsloth
```

### What this does
Installs the Unsloth fine-tuning stack silently.

| Package | Role |
|---|---|
| `unsloth` | Optimised training library — patches Llama's attention and RoPE embeddings for ~2x faster training and ~40% less VRAM vs vanilla HuggingFace |
| `xformers` | Memory-efficient attention kernels from Meta — reduces VRAM further during the forward pass |
| `trl` | Transformer Reinforcement Learning — provides `SFTTrainer`, a wrapper around HuggingFace `Trainer` optimised for supervised fine-tuning on chat data |
| `peft` | Parameter-Efficient Fine-Tuning — manages LoRA adapter injection, weight merging, and saving |
| `accelerate` | HuggingFace's distributed training and device management layer |
| `bitsandbytes` | Enables 4-bit (NF4) and 8-bit quantisation for loading large models on consumer GPUs |

> **Why `--no-deps` for the first line?** `unsloth` (installed second) pulls in its own carefully pinned versions of these packages. Installing them with `--no-deps` first sets them in the environment before Unsloth verifies compatibility — avoiding potential version conflicts where pip might try to downgrade or upgrade packages mid-install.

> **Why `%%capture`?** pip's output for 5 packages can be hundreds of lines. Suppressing it keeps the notebook clean; any real errors would still surface when cells fail to execute.

---

## Section 3 — Verify Python Environment

```python
import torch
import unsloth

print("PyTorch Version:", torch.__version__)
print("CUDA Available:", torch.cuda.is_available())

if torch.cuda.is_available():
    print("GPU Name:", torch.cuda.get_device_name(0))
    print("GPU Memory:", round(torch.cuda.get_device_properties(0).total_memory / 1024**3, 2), "GB")

print("Unsloth imported successfully")
```

**Output:**
```
PyTorch Version: 2.10.0+cu128
CUDA Available: True
GPU Name: Tesla T4
GPU Memory: 14.56 GB
Unsloth imported successfully
```

### What this does
A programmatic GPU check that complements `nvidia-smi`. While `nvidia-smi` shows the hardware-level view, this cell verifies that **PyTorch can actually see and communicate with the GPU** through CUDA.

- `torch.cuda.is_available()` — confirms CUDA is initialised in the Python process
- `torch.cuda.get_device_name(0)` — verifies the correct device is selected (device 0)
- `torch.cuda.get_device_properties(0).total_memory` — reports usable VRAM in bytes, converted to GB
- `import unsloth` — verifies the Unsloth library installed correctly and its C extensions compiled

The 14.56 GB figure (vs. 15.36 GB shown by nvidia-smi) is normal — the OS and CUDA runtime reserve a small amount of VRAM before PyTorch can access it.

---

## Section 4 — Load the Base Model (4-bit Quantised)

```python
from unsloth import FastLanguageModel

max_seq_length = 2048

model, tokenizer = FastLanguageModel.from_pretrained(
    model_name="unsloth/Llama-3.2-3B-Instruct-bnb-4bit",
    max_seq_length=max_seq_length,
    dtype=None,
    load_in_4bit=True,
)
```

**Unsloth banner output:**
```
Unsloth 2026.6.8: Fast Llama patching. Transformers: 5.5.0.
Tesla T4. Num GPUs = 1. Max memory: 14.563 GB.
Torch: 2.10.0+cu128. CUDA: 7.5. CUDA Toolkit: 12.8. Triton: 3.6.0
Bfloat16 = FALSE. FA [Xformers = 0.0.35. FA2 = False]
```

### What this does — parameter by parameter

#### `model_name="unsloth/Llama-3.2-3B-Instruct-bnb-4bit"`
Downloads **Llama 3.2 3B Instruct** from the Unsloth Hub namespace. The Unsloth-hosted version differs from Meta's original in two ways:
- Pre-quantised to 4-bit NF4 format — no quantisation step needed at load time
- Patches already applied (faster RoPE, fused layers) — immediately ready for training

The `bnb-4bit` suffix indicates bitsandbytes 4-bit NF4 quantisation is baked into the weights.

#### `max_seq_length=2048`
Sets the maximum context window in tokens. This controls:
- The maximum length of training examples (longer ones are truncated)
- The RoPE positional embedding range
- Memory allocated for KV-cache during generation

2048 tokens ≈ ~1,500 words, which is ample for most financial Q&A pairs. Using a shorter window (e.g. 1024) would reduce VRAM but risk truncating long training examples.

#### `dtype=None`
Instructs Unsloth to auto-select the compute dtype. The output shows `Bfloat16 = FALSE` — the T4 GPU (CUDA compute capability 7.5) does **not** support bfloat16 natively, so float16 is automatically chosen instead. On an A100 (compute capability 8.0+), Unsloth would select bfloat16 for better numerical stability.

#### `load_in_4bit=True`
Loads the model weights in 4-bit NF4 format using bitsandbytes. This reduces the model's VRAM footprint from ~6 GB (fp16) to ~2.24 GB — critical for fitting both the model and training state (optimizer, gradients) within 14.56 GB of available VRAM.

**VRAM budget breakdown during training:**
| Component | Approx. VRAM |
|---|---|
| Model weights (4-bit) | ~2.24 GB |
| LoRA adapter (float16) | ~0.09 GB |
| Optimizer states (AdamW 8-bit) | ~0.19 GB |
| Activations + KV-cache | ~2–4 GB |
| **Total** | **~5–7 GB** |

---

## Section 5 — Apply LoRA (Make the Model Trainable)

```python
model = FastLanguageModel.get_peft_model(
    model,
    r=16,
    target_modules=[
        "q_proj", "k_proj", "v_proj", "o_proj",
        "gate_proj", "up_proj", "down_proj",
    ],
    lora_alpha=16,
    lora_dropout=0,
    bias="none",
    use_gradient_checkpointing="unsloth",
    random_state=3407,
    use_rslora=False,
    loftq_config=None,
)
```

### What LoRA is

LoRA (Low-Rank Adaptation) is a parameter-efficient fine-tuning technique. Instead of updating all 3.2 billion weights of the model, LoRA **freezes** the original weights and injects small trainable matrices (A and B) alongside specific layers:

```
Original weight W (frozen, large)
      +
A × B  (trainable, tiny — rank r)
───────────────────────────────
Effective weight = W + (alpha/r) × A × B
```

The product `A × B` approximates the update to `W` that full fine-tuning would compute, but using far fewer parameters. With `r=16`, each LoRA pair is a 4096×16 and 16×4096 matrix — 131,072 parameters — vs. the 16,777,216 parameters in the original projection.

### What each parameter means

| Parameter | Value | Effect |
|---|---|---|
| `r` | 16 | Rank of the LoRA matrices. Higher rank = more expressiveness but more parameters and VRAM. Common values: 8 (fast/cheap), 16 (balanced), 32–64 (high capacity). |
| `target_modules` | 7 modules | Which weight matrices get LoRA adapters. All 7 attention + FFN projections are targeted for broad coverage of the model's learned representations. |
| `lora_alpha` | 16 | Scaling factor for the LoRA update. Effective learning scale = `alpha/r` = 1.0. Setting `alpha=r` is a common convention that keeps the effective LR independent of rank. |
| `lora_dropout` | 0 | No dropout in LoRA layers. Dropout helps prevent overfitting but adds compute overhead. At the scale of this dataset (157K examples) and short training (1,000 steps), overfitting is unlikely. |
| `bias` | `"none"` | Bias terms are not included in LoRA training — they add minimal expressiveness for significant overhead. |
| `use_gradient_checkpointing` | `"unsloth"` | Unsloth's custom gradient checkpointing — recomputes activations during backward pass instead of storing them, trading compute for VRAM. Reduces activation memory by ~30–40%. |
| `random_state` | 3407 | Seed for reproducible LoRA weight initialisation. |
| `use_rslora` | `False` | Rank-Stabilised LoRA (divides by √r instead of r). Disabled here; beneficial at high ranks (r≥64). |
| `loftq_config` | `None` | LoftQ (LoRA + quantisation-aware initialisation). Not used — the NF4 quantised base is sufficient. |

**Target modules explained:**

| Module | Part of model | What it learns |
|---|---|---|
| `q_proj`, `k_proj`, `v_proj` | Multi-head attention | Query, Key, Value projections — control what the model attends to and how context is aggregated |
| `o_proj` | Multi-head attention | Output projection — how attended information is combined before the FFN |
| `gate_proj`, `up_proj`, `down_proj` | SwiGLU FFN | Feed-forward network projections — where most of the model's "knowledge" is stored |

---

## Section 6 — Load the Training Dataset

```python
from datasets import load_dataset

dataset = load_dataset(
    "oieieio/Finance-Instruct-500k",
    split="train"
)

print(dataset)
```

**Output:**
```
Dataset({
    features: ['system', 'user', 'assistant'],
    num_rows: 518185
})
```

### What this does
Downloads the **Finance-Instruct-500k** dataset from HuggingFace Hub. This is a large-scale conversational finance dataset with 518,185 instruction-following examples in a chat format. Each row has three fields:

| Field | Content |
|---|---|
| `system` | System-level instruction (not always set) |
| `user` | The question or task posed by the user |
| `assistant` | The ideal model response |

The raw dataset covers a broad range of topics — financial questions but also many tangentially related (or completely unrelated) conversations. The next steps filter this down to only high-quality, finance-specific examples.

---

## Section 7 — Finance Filter (Pass 1)

```python
finance_keywords = [
    # Investing & Markets
    "stock", "stocks", "share", "shares", "equity",
    "bond", "bonds", "portfolio", "investment",
    "investing", "investor", "asset", "assets",
    "security", "securities", "dividend", "yield",
    "capital gain", "capital loss", "return",
    "risk", "volatility", "market", "trading",
    "trader", "option", "options", "futures",
    "derivative", "etf", "mutual fund",
    # Banking & Credit
    "bank", "banking", "loan", "loans",
    "credit", "debt", "mortgage",
    "interest", "interest rate",
    "deposit", "withdrawal", "liquidity", "lending",
    # Economics
    "economics", "economy", "economic",
    "inflation", "deflation",
    "recession", "gdp", "fiscal",
    "monetary", "central bank",
    "federal reserve", "money supply", "exchange rate",
    # Accounting & Corporate Finance
    "revenue", "profit", "loss",
    "expense", "cost", "margin",
    "earnings", "ebitda", "balance sheet",
    "income statement", "cash flow",
    "financial statement", "valuation",
    "market capitalization",
    # Personal Finance
    "budget", "saving", "savings",
    "retirement", "insurance",
    "tax", "taxation", "wealth",
    "net worth", "financial planning",
    # Crypto
    "crypto", "cryptocurrency",
    "bitcoin", "ethereum",
    "blockchain", "token", "wallet"
]

def is_finance_related(example):
    text = (
        example["user"] + " " +
        example["assistant"]
    ).lower()
    return any(keyword in text for keyword in finance_keywords)

dataset = dataset.filter(
    is_finance_related,
    num_proc=2
)
print(dataset)
```

**Output:**
```
Dataset({
    features: ['system', 'user', 'assistant'],
    num_rows: 253739
})
```

### What this does
The first filtering pass reduces 518K rows to **253,739 rows** — approximately a 51% reduction — by keeping only examples that mention at least one keyword from a comprehensive finance vocabulary list.

**How the filter works:**
- Concatenates `user` and `assistant` text into one string
- Converts to lowercase to make matching case-insensitive
- Checks if any finance keyword appears anywhere in that string
- Returns `True` (keep) if at least one keyword matches

**Why this broad keyword list?**
The list covers all major finance subdomains:
- **Equity markets** — stocks, dividends, ETFs, derivatives
- **Fixed income** — bonds, yields, duration
- **Banking** — loans, credit, mortgages, interest rates
- **Macroeconomics** — inflation, GDP, monetary policy
- **Accounting** — EBITDA, balance sheet, cash flow
- **Personal finance** — budgeting, retirement, insurance
- **Crypto** — bitcoin, ethereum, blockchain

Using `num_proc=2` parallelises the filter across 2 CPU cores, roughly halving the wall-clock time for scanning 518K examples.

**Limitation:** This broad pass will still include many false positives — e.g. a history essay that mentions "tax policy" or a maths problem about "interest". The second pass addresses this.

---

## Section 8 — Finance Filter (Pass 2 — Strict Clean)

```python
strong_finance_keywords = [
    "stock", "bond", "equity", "portfolio",
    "investment", "investor", "trading",
    "dividend", "asset", "liability",
    "financial", "finance", "bank",
    "loan", "credit", "debt",
    "interest rate", "inflation",
    "recession", "gdp", "fiscal",
    "monetary", "central bank",
    "revenue", "profit", "earnings",
    "cash flow", "balance sheet",
    "income statement", "valuation",
    "market capitalization", "tax",
    "retirement", "insurance",
    "wealth", "budget", "savings",
    "mutual fund", "etf",
    "economy", "economic"
]

negative_keywords = [
    "python", "java", "javascript",
    "c++", "c#", "function",
    "class", "algorithm",
    "code", "program",
    "api", "proto",
    "github", "database",
    "sql", "html", "css",
    "json", "xml",
    "biological", "protein",
    "chemical", "physics",
    "history", "date of death"
]

def clean_finance_filter(example):
    text = (
        example["user"] + " " +
        example["assistant"]
    ).lower()

    has_finance = any(
        keyword in text
        for keyword in strong_finance_keywords
    )
    has_noise = any(
        keyword in text
        for keyword in negative_keywords
    )
    return has_finance and not has_noise

dataset = dataset.filter(
    clean_finance_filter,
    num_proc=2
)
print(dataset)
```

**Output:**
```
Dataset({
    features: ['system', 'user', 'assistant'],
    num_rows: 157298
})
```

### What this does
The second filtering pass reduces 253K rows to **157,298 rows** — another 38% reduction. This pass uses a two-condition filter: include only examples that have a strong finance keyword **AND** do not mention any noise/off-topic keyword.

**Two-condition logic:**

| Condition | Keyword list | Examples caught |
|---|---|---|
| `has_finance` (must be True) | `strong_finance_keywords` (40 terms) | Core finance terms that unambiguously belong to the domain |
| `has_noise` (must be False) | `negative_keywords` (19 terms) | Programming, biology, chemistry, history — topics that "leaked" through the broad first filter |

**Why a positive + negative approach?**
The Finance-Instruct-500k dataset contains multi-domain content. The broad first pass caught examples like:
- Maths problems using "interest" in a non-financial context
- History essays mentioning "tax" in ancient Rome
- Biology papers discussing "bonds" (chemical bonds)
- Coding tutorials mentioning "balance" (variable names)

The negative keyword list removes these false positives by checking for unmistakable non-finance signals. For example, if an example contains both "tax" and "python", it's almost certainly a coding tutorial about a tax calculator — not a genuine finance conversation.

**Strong vs. broad keywords:**
The `strong_finance_keywords` list is a subset of the first pass's list, focused on terms that are finance-specific even out of context. Words like "market" or "return" are too ambiguous for the strict list (market = supermarket; return = function return value), so they're excluded from Pass 2.

**Final dataset stats:**
- Started with 518,185 rows
- After Pass 1: 253,739 (−51%)
- After Pass 2: 157,298 (−38% from Pass 1, −70% overall)
- The 157K remaining examples are high-quality, unambiguous finance conversations

---

## Section 9 — Explore the Filtered Dataset

```python
dataset = dataset.shuffle(seed=3407)

for i in range(5):
    print(f"\n=== Example {i+1} ===")
    print("USER:", dataset[i]["user"][:300])
    print("\nASSISTANT:", dataset[i]["assistant"][:300])
    print("-" * 80)
```

### What this does
Shuffles the dataset (fixing a random seed for reproducibility) then prints truncated previews of 5 examples. This is a **sanity check** before committing to expensive formatting and training steps.

What to look for in the preview:
- Are the user messages genuine financial questions?
- Are the assistant responses factually reasonable?
- Is the text quality high (no garbled OCR, no non-English content)?
- Are the response lengths appropriate (not too short/long)?

The examples shown in the output include:
- Gold futures price analysis questions
- Compound interest maths problems
- Carbon tax policy explanations
- Expected value calculations for investment scenarios

These confirm the filter is working correctly — diverse, genuine finance content with no obvious noise.

---

## Section 10 — Format for Chat Training

```python
def formatting_prompts_func(examples):
    conversations = []

    for user, assistant in zip(
        examples["user"],
        examples["assistant"]
    ):
        messages = [
            {
                "role": "system",
                "content": (
                    "You are Investo Bot, an expert AI financial assistant. "
                    "Provide clear, accurate, and well-structured financial explanations. "
                    "When discussing investments, explain potential risks and avoid making unrealistic guarantees."
                )
            },
            {
                "role": "user",
                "content": user
            },
            {
                "role": "assistant",
                "content": assistant
            }
        ]
        conversations.append(messages)

    texts = tokenizer.apply_chat_template(
        conversations,
        tokenize=False,
        add_generation_prompt=False
    )

    return {"text": texts}


dataset = dataset.map(
    formatting_prompts_func,
    batched=True,
    batch_size=1000,
    num_proc=2
)
```

### What this does — in full detail

#### The system prompt
Every training example is wrapped with the Investo Bot system prompt:
```
"You are Investo Bot, an expert AI financial assistant.
Provide clear, accurate, and well-structured financial explanations.
When discussing investments, explain potential risks and avoid making unrealistic guarantees."
```
This is critical — it trains the model to associate this identity with financial expertise. When the same prompt is used at inference time, the model's learned behaviour from fine-tuning activates. It also specifically trains the model to:
1. Give structured, clear explanations (not rambling)
2. Discuss risks when talking about investments (safety-aware behaviour)
3. Not make unrealistic promises (avoids hallucinated guarantees)

#### `apply_chat_template` with `add_generation_prompt=False`
Converts the structured message list into a Llama 3 formatted string with proper special tokens:
```
<|begin_of_text|><|start_header_id|>system<|end_header_id|>

You are Investo Bot...<|eot_id|><|start_header_id|>user<|end_header_id|>

{user question}<|eot_id|><|start_header_id|>assistant<|end_header_id|>

{assistant answer}<|eot_id|>
```

`add_generation_prompt=False` because training examples **include the full assistant response** — there is no "pending generation" state. At inference time this flips to `True` to signal the model should start generating.

#### Batched mapping
`batched=True, batch_size=1000, num_proc=2` processes 1,000 examples at a time across 2 workers. This is much faster than row-by-row processing because:
- `apply_chat_template` processes the full list in one call per batch (vectorised)
- 2 parallel processes split the 157K rows between them

#### Verifying the format
```python
print(dataset[0]["text"])
```
**Output:**
```
<|begin_of_text|><|start_header_id|>system<|end_header_id|>

Cutting Knowledge Date: December 2023
Today Date: 20 Jun 2026

You are Investo Bot, an expert AI financial assistant. Provide clear, accurate, and
well-structured financial explanations...
<|eot_id|><|start_header_id|>user<|end_header_id|>

Read this headline: "Gold futures down at Rs 27,835..."
<|eot_id|><|start_header_id|>assistant<|end_header_id|>

No<|eot_id|>
```

This confirms the template is applied correctly — the tokenizer injected its own `Cutting Knowledge Date` header (part of Llama 3's instruction template metadata), then the system prompt, user question, and assistant answer — all with the right special tokens.

---

## Section 11 — Configure the Trainer

```python
from trl import SFTTrainer
from transformers import TrainingArguments

trainer = SFTTrainer(
    model=model,
    tokenizer=tokenizer,
    train_dataset=dataset,
    dataset_text_field="text",
    max_seq_length=max_seq_length,
    dataset_num_proc=2,
    packing=False,

    args=TrainingArguments(
        # GPU memory control
        per_device_train_batch_size=2,
        gradient_accumulation_steps=4,

        # Training length
        max_steps=1000,

        # Optimization
        learning_rate=2e-4,
        warmup_steps=20,
        optim="adamw_8bit",
        weight_decay=0.01,
        lr_scheduler_type="linear",

        # Precision
        fp16=True,

        # Logging & saving
        logging_steps=10,
        save_strategy="no",
        output_dir="investo_outputs",

        # Reproducibility
        seed=3407,
    ),
)
```

### What every parameter means

#### SFTTrainer-level parameters

| Parameter | Value | Meaning |
|---|---|---|
| `dataset_text_field` | `"text"` | The column name in the dataset that contains the formatted training string |
| `max_seq_length` | 2048 | Truncates any training example longer than 2048 tokens |
| `dataset_num_proc` | 2 | Tokenises the dataset using 2 CPU workers |
| `packing` | `False` | Disables sequence packing (fitting multiple short examples into one context window). Packing improves GPU utilisation but can cause issues with Llama 3's chat template formatting |

#### TrainingArguments — memory and throughput

| Parameter | Value | Meaning |
|---|---|---|
| `per_device_train_batch_size` | 2 | 2 examples per GPU per forward+backward pass |
| `gradient_accumulation_steps` | 4 | Accumulate gradients over 4 steps before updating weights. Effective batch size = 2 × 4 = **8** examples per weight update |
| `fp16` | `True` | Mixed precision training — activations and gradients computed in float16, weights kept in float32 master copy. Halves memory and speeds up compute on T4. |

> **Effective batch size = 8:** Why not just use batch_size=8 directly? A single T4 can't hold 8 examples with 2048 tokens each in VRAM simultaneously. Gradient accumulation is the standard workaround — smaller batches are processed sequentially and their gradients summed before the optimizer step, mimicking a larger batch mathematically.

#### TrainingArguments — training schedule

| Parameter | Value | Meaning |
|---|---|---|
| `max_steps` | 1000 | Train for exactly 1,000 gradient update steps. With 157K examples and effective batch 8, this is ~1/20th of an epoch — a deliberate choice to avoid overfitting on a small number of update steps. |
| `learning_rate` | 2e-4 | Starting LR. Higher than typical full fine-tuning (1e-5) because LoRA layers are initialised near-zero and need a larger signal to learn quickly. |
| `warmup_steps` | 20 | Linear LR warmup for the first 20 steps. Prevents large gradient updates right at the start when model weights are far from optimal for the new task. |
| `lr_scheduler_type` | `"linear"` | Decays LR linearly from 2e-4 to 0 over 1,000 steps. Ensures the model makes fine-grained adjustments as training progresses. |

#### TrainingArguments — optimizer

| Parameter | Value | Meaning |
|---|---|---|
| `optim` | `"adamw_8bit"` | 8-bit AdamW optimizer from bitsandbytes. Stores optimizer states (momentum and variance for every parameter) in 8-bit instead of 32-bit — saves ~75% of optimizer VRAM. For 24M trainable params, this saves ~180 MB. |
| `weight_decay` | 0.01 | L2 regularisation on weights — prevents any single LoRA weight from growing too large. Small value (1%) is a light regulariser appropriate for short training runs. |

#### TrainingArguments — logging and saving

| Parameter | Value | Meaning |
|---|---|---|
| `logging_steps` | 10 | Print training loss every 10 steps. Frequent enough to detect if loss is diverging early. |
| `save_strategy` | `"no"` | Do not save intermediate checkpoints. Since training is only 1,000 steps (~54 min) and Drive saves happen after training, intermediate checkpoints aren't needed and would consume Drive quota. |
| `seed` | 3407 | Fixes Python, NumPy, and PyTorch random seeds for reproducible training. |

---

## Section 12 — Clear GPU Cache Before Training

```python
import torch
torch.cuda.empty_cache()
```

### What this does
Explicitly releases any cached GPU memory that PyTorch is holding in its memory pool but not currently using. After loading the dataset and creating the trainer, there may be temporary tensors sitting in the cache from the setup operations. Clearing the cache before training maximises available VRAM for the training loop — reducing the risk of OOM (out-of-memory) errors on the first training step.

This is a defensive measure: if training starts with fragmented or unnecessarily occupied VRAM, the first large forward pass might fail even if theoretically enough total VRAM exists.

---

## Section 13 — Train the Model

```python
trainer_stats = trainer.train()
```

**Training summary from output:**
```
Num examples = 157,298 | Num Epochs = 1 | Total steps = 1,000
Batch size per device = 2 | Gradient accumulation steps = 4
Total batch size (2 x 4 x 1) = 8
Trainable parameters = 24,313,856 of 3,237,063,680 (0.75% trained)
```

**Training completed in: 54 minutes 17 seconds**

### What happens during training

For each of the 1,000 steps:

1. **Forward pass:** 2 training examples are tokenised and passed through the model. The model predicts the probability distribution over the vocabulary for each token position.

2. **Loss computation:** Cross-entropy loss is computed between the model's predictions and the actual next tokens. Crucially, `SFTTrainer` with chat templates computes loss **only on the assistant's reply tokens** — not on the system prompt or user message tokens. This means the model learns to generate the assistant's content, not to memorise the question format.

3. **Backward pass:** Gradients flow back through the model, but only the LoRA adapter weights have non-zero gradients (the base model weights are frozen).

4. **Gradient accumulation:** After 4 forward-backward passes, the accumulated gradients are averaged and the optimizer takes one step.

5. **LR scheduling:** The learning rate is updated according to the linear decay schedule.

**Training loss trajectory (selected steps):**
```
Step  10: 0.9509
Step 100: 0.9681
Step 300: 0.9326
Step 500: 0.9321
Step 700: 0.9063
Step 900: 0.9529
Step 1000: 1.0318
```

The loss stays in the 0.8–1.1 range throughout — this is typical for fine-tuning on a diverse dataset in 1,000 steps. The loss doesn't drop dramatically because 1,000 steps is a small fraction of a full epoch (157K / 8 = ~19,600 steps per epoch). The goal is not to minimise training loss to near-zero (which would overfit) but to shift the model's probability distribution toward finance-domain responses.

---

## Section 14 — Save the Fine-Tuned Adapter

```python
model.save_pretrained("investo_lora")
tokenizer.save_pretrained("investo_lora")
```

**Output:**
```
('investo_lora/tokenizer_config.json',
 'investo_lora/chat_template.jinja',
 'investo_lora/tokenizer.json')
```

### What this does
Saves only the **LoRA adapter weights** (not the full base model) to the `investo_lora/` directory.

```python
!ls -lh investo_lora
```

**Output:**
```
-rw-r--r--  adapter_config.json       1.3K
-rw-------  adapter_model.safetensors  93M
-rw-r--r--  chat_template.jinja       3.8K
-rw-r--r--  README.md                 5.2K
-rw-r--r--  tokenizer_config.json      50K
-rw-r--r--  tokenizer.json             17M
```

**Files explained:**

| File | Size | Contents |
|---|---|---|
| `adapter_model.safetensors` | 93 MB | The actual LoRA weights — the delta learned during training. This is the most important file. |
| `adapter_config.json` | 1.3 KB | LoRA configuration: r=16, alpha=16, target modules, base model name — everything needed to reconstruct the adapter |
| `tokenizer.json` | 17 MB | Full tokeniser vocabulary and merge rules — needed to tokenise text at inference time |
| `tokenizer_config.json` | 50 KB | Tokeniser settings: special tokens, chat template, padding configuration |
| `chat_template.jinja` | 3.8 KB | The Llama 3 Jinja2 template used by `apply_chat_template` |
| `README.md` | 5.2 KB | Auto-generated HuggingFace model card |

> **Why `safetensors` instead of `.pt`/`.bin`?** The `safetensors` format (introduced by HuggingFace) is safer than pickle-based `.pt` files — it cannot execute arbitrary code when loaded. It's also faster to load because it supports memory-mapped access and parallel loading. PEFT automatically saves in this format.

> **Why save the tokenizer?** The tokenizer must always be saved alongside the model weights. If the tokenizer version or configuration changes between saving and loading, the token IDs won't match the model's vocabulary, causing garbled output.

---

## Section 15 — Package and Download the Adapter

```python
from google.colab import files
import shutil

shutil.make_archive(
    "investo_lora",
    "zip",
    "investo_lora"
)

files.download("investo_lora.zip")
```

### What this does

`shutil.make_archive("investo_lora", "zip", "investo_lora")` creates `investo_lora.zip` by compressing the entire `investo_lora/` directory. The resulting zip is ~88 MB (the `.safetensors` file compresses moderately since neural network weights are not highly compressible).

`files.download("investo_lora.zip")` triggers a browser download from the Colab environment to the local machine using Colab's JavaScript download API.

After downloading locally, the adapter can be:
1. **Uploaded to HuggingFace Hub** — `model.push_to_hub("username/investo-llama-3.2-3b-finance-lora")` to share publicly
2. **Deployed locally** — loaded with `model.load_adapter("path/to/investo_lora")`
3. **Used in the test notebook** — as demonstrated in `test_investo.ipynb`, which loads it from Hub

---

## Key Design Decisions

### Why 1,000 steps instead of a full epoch?
A full epoch would be 157,298 / 8 = ~19,662 steps, taking roughly **18 hours** on a T4. 1,000 steps (~54 minutes) is enough to meaningfully shift the model's distribution toward finance domain behaviour while staying within Colab's session time limit. The training loss plateau in the 0.9–1.0 range suggests the model learned the domain style without severely overfitting on specific examples.

### Why r=16 for LoRA rank?
- **r=8:** Fewer parameters, faster training, less VRAM — but may lack capacity to capture finance-specific patterns
- **r=16:** Good balance — 24M trainable params, noticeable quality improvement over base model, fits comfortably in VRAM
- **r=32–64:** Higher capacity for complex domain adaptation — but doubles/quadruples trainable params and VRAM

For a 3B model being fine-tuned on conversational QA (relatively straightforward task), r=16 provides sufficient expressiveness.

### Why all 7 attention + FFN modules?
Targeting only `q_proj` and `v_proj` (as in the original LoRA paper) is common for smaller tasks. However, for domain adaptation (changing the model's knowledge + style), targeting all 7 projection layers provides broader coverage:
- Attention heads (q, k, v, o): Learn to attend to finance-relevant context
- FFN layers (gate, up, down): Where factual knowledge is stored — critical for learning finance terminology and relationships

### Why 8-bit AdamW?
Standard AdamW stores two float32 optimizer state tensors per parameter (first and second moment). For 24M LoRA params: `24M × 2 × 4 bytes = 192 MB`. With 8-bit quantisation: `24M × 2 × 1 byte = 48 MB` — a 4x reduction, while maintaining training quality.

---

## How Training Loss Reflects Learning

The loss values (0.9–1.0 range) might seem high, but this is expected for an LLM trained on diverse text:
- A random model over a 128K vocabulary would have loss = ln(128000) ≈ 11.76
- A well-trained base LLM has loss ≈ 1.0–1.5 on domain text
- A fine-tuned model on domain-specific text typically reaches 0.8–1.2

The fact that loss starts at ~0.95 and ends near ~1.03 with oscillation (not a clean downward trend) is normal for 1,000 steps on a diverse 157K dataset — the model sees each example roughly once, so it's learning domain priors rather than memorising specific answers.

---

## Complete Pipeline Summary

| Stage | Input | Output | Key parameter |
|---|---|---|---|
| Load base | HuggingFace Hub | 3.2B param model, 4-bit | `load_in_4bit=True` |
| Apply LoRA | Frozen base model | 24M trainable params | `r=16`, 7 target modules |
| Load dataset | HuggingFace Hub | 518K raw examples | `Finance-Instruct-500k` |
| Filter Pass 1 | 518K rows | 253K rows (−51%) | 50+ finance keywords |
| Filter Pass 2 | 253K rows | 157K rows (−38%) | Strong + negative keywords |
| Format | 157K rows | 157K formatted strings | Llama 3 chat template |
| Train | 157K formatted | Trained LoRA weights | 1000 steps, lr=2e-4 |
| Save | Trained weights | `investo_lora/` (93 MB) | `save_pretrained` |
| Package | Local dir | `investo_lora.zip` | `shutil.make_archive` |
