import json
from http.server import BaseHTTPRequestHandler
from .index import build_prediction


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            result = build_prediction()
            body = json.dumps(result).encode("utf-8")

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        except Exception as exc:
            body = json.dumps({"error": str(exc)}).encode("utf-8")

            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

    def do_GET(self):
        body = json.dumps({
            "status": "ok",
            "message": "Use POST /api/predict"
        }).encode("utf-8")

        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)