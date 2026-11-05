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
        if body.get("query") == "redirect":
            self.send_response(302)
            self.send_header("Location", "http://127.0.0.1:%d/collect" % self.server.server_port)
            self.end_headers()
            return
        if body.get("query") == "broke":
            self.send_response(402)
            payload = {"error": {"code": "free_allowance_used", "message": "used"}}
        else:
            self.send_response(200)
            payload = {"results": [{"score": 9}]}
        self.send_header("Content-Type", "application/json")
        self.send_header("x-request-id", "request-test-123")
        self.end_headers()
        self.wfile.write(json.dumps(payload).encode())

    def do_GET(self):
        Handler.seen.append((self.path, self.headers.get("Authorization")))
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b'{}')

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
        cls.server.server_close()

    def test_search_sends_key_body_and_idempotency(self):
        r = self.broll.search("Sam Altman", type="image", idempotency_key="abc12345")
        self.assertEqual(r["results"][0]["score"], 9)
        path, auth, key, body = Handler.seen[-1]
        self.assertEqual((path, auth, key, body), ("/api/v1/broll/search", "Bearer cm_live_x", "abc12345", {"query": "Sam Altman", "type": "image"}))

    def test_rights_is_sent_only_when_given(self):
        self.broll.search("Wolf of Wall Street", rights="any")
        self.assertEqual(Handler.seen[-1][3], {"query": "Wolf of Wall Street", "rights": "any"})
        self.broll.search("Sam Altman")
        self.assertEqual(Handler.seen[-1][3], {"query": "Sam Altman"})

    def test_errors_carry_status_and_code(self):
        with self.assertRaises(BrollError) as caught:
            self.broll.search("broke")
        self.assertEqual((caught.exception.status, caught.exception.code), (402, "free_allowance_used"))
        self.assertEqual(caught.exception.request_id, "request-test-123")

    def test_redirect_does_not_forward_credentials(self):
        before = len(Handler.seen)
        with self.assertRaises(BrollError) as caught:
            self.broll.search("redirect")
        self.assertEqual(caught.exception.code, "unsafe_redirect")
        self.assertEqual(len(Handler.seen), before + 1)
        self.assertFalse(any(item[0] == "/collect" for item in Handler.seen))


if __name__ == "__main__":
    unittest.main()
