import json
import threading
import unittest
from http.server import BaseHTTPRequestHandler, HTTPServer

from clypmint_broll import Broll, BrollError


class Handler(BaseHTTPRequestHandler):
    seen = []

    def do_POST(self):
        body = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        Handler.seen.append((self.path, self.headers["Authorization"], self.headers.get("Idempotency-Key"), body))
        if body.get("query") == "broke":
            self.send_response(402)
            payload = {"error": {"code": "free_allowance_used", "message": "used"}}
        else:
            self.send_response(200)
            payload = {"results": [{"score": 9}]}
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(payload).encode())

    def log_message(self, *args):
        pass


class ClientTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = HTTPServer(("127.0.0.1", 0), Handler)
        threading.Thread(target=cls.server.serve_forever, daemon=True).start()
        cls.broll = Broll(api_key="cm_live_x", base_url="http://127.0.0.1:%d" % cls.server.server_port)

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()

    def test_search_sends_key_body_and_idempotency(self):
        r = self.broll.search("Sam Altman", type="image", idempotency_key="abc12345")
        self.assertEqual(r["results"][0]["score"], 9)
        path, auth, key, body = Handler.seen[-1]
        self.assertEqual((path, auth, key, body), ("/api/v1/broll/search", "Bearer cm_live_x", "abc12345", {"query": "Sam Altman", "type": "image"}))

    def test_errors_carry_status_and_code(self):
        with self.assertRaises(BrollError) as caught:
            self.broll.search("broke")
        self.assertEqual((caught.exception.status, caught.exception.code), (402, "free_allowance_used"))


if __name__ == "__main__":
    unittest.main()
