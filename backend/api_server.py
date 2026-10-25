"""Investo Lightweight Python REST API Bridge
Provides clean endpoints connecting the React frontend directly to the
Python FinancialAgentEngine and deterministic quant tools.
Uses standard library http.server for 100% zero-dependency execution.
"""

import json
import urllib.parse
from http.server import BaseHTTPRequestHandler, HTTPServer
import sys
import os

# Ensure current dir is in path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from agent_engine import FinancialAgentEngine
from market_tools import MarketTools

PORT = 8000
agent = None

def get_agent():
    global agent
    if agent is None:
        try:
            agent = FinancialAgentEngine()
        except Exception as e:
            print(f"[WARN] Vectorstore fallback mode: {e}")
            agent = None
    return agent

class InvestoApiHandler(BaseHTTPRequestHandler):
    def _send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")

    def do_OPTIONS(self):
        self.send_response(200)
        self._send_cors_headers()
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        params = urllib.parse.parse_qs(parsed.query)

        if parsed.path == "/api/health":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self._send_cors_headers()
            self.end_headers()
            resp = {
                "status": "online",
                "engine": "FinancialAgentEngine",
                "tools": [
                    "get_live_quote",
                    "get_fundamentals",
                    "run_dcf_valuation",
                    "run_monte_carlo",
                    "search_knowledge_base",
                    "get_ticker_news",
                ],
                "deterministic_math": True,
            }
            self.wfile.write(json.dumps(resp).encode("utf-8"))
            return

        elif parsed.path == "/api/quote":
            ticker = params.get("ticker", ["AAPL"])[0].upper()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self._send_cors_headers()
            self.end_headers()
            try:
                quote = MarketTools.get_live_quote(ticker)
                funds = MarketTools.get_company_fundamentals(ticker)
                resp = {"quote": quote, "fundamentals": funds}
            except Exception as e:
                resp = {"error": str(e), "ticker": ticker}
            self.wfile.write(json.dumps(resp).encode("utf-8"))
            return

        self.send_response(404)
        self._send_cors_headers()
        self.end_headers()

    def do_POST(self):
        if self.path == "/api/analyze":
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length).decode("utf-8")
            data = json.loads(body) if body else {}

            query = data.get("query", "Evaluate valuation and 10-K risk factors")
            ticker = data.get("ticker", "AAPL").upper()

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self._send_cors_headers()
            self.end_headers()

            engine = get_agent()
            if engine:
                verdict, tool_records, narrative = engine.execute_plan(query, active_ticker=ticker)
                resp = {
                    "verdict": verdict.model_dump(),
                    "tool_records": [t.model_dump() for t in tool_records],
                    "narrative": narrative,
                    "engine_status": "real_python_execution",
                }
            else:
                resp = {
                    "verdict": {
                        "ticker": ticker,
                        "stance": "BULLISH",
                        "target_price_range": [180.0, 207.0],
                        "current_price": 187.50,
                    },
                    "engine_status": "fallback_simulation",
                }

            self.wfile.write(json.dumps(resp).encode("utf-8"))
            return

        self.send_response(404)
        self._send_cors_headers()
        self.end_headers()

def run_server():
    server_address = ("", PORT)
    httpd = HTTPServer(server_address, InvestoApiHandler)
    print(f"Investo Python API Bridge running at http://localhost:{PORT}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        httpd.server_close()

if __name__ == "__main__":
    run_server()
