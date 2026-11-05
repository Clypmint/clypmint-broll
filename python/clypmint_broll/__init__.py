"""The Clypmint B-Roll API client: real, verified b-roll for video agents. No dependencies.

    from clypmint_broll import Broll
    broll = Broll()  # reads CLYPMINT_API_KEY
    shots = broll.search("Sam Altman", context="Sam Altman just walked on stage")["results"]
"""

import json
import os
import urllib.error
import urllib.request

__all__ = ["Broll", "BrollError"]
__version__ = "1.2.1"

DEFAULT_BASE_URL = "https://clypmint.com"


class BrollError(Exception):
    def __init__(self, status, code, message, request_id=None):
        super().__init__(message)
        self.status = status
        self.code = code
        self.request_id = request_id


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        # urllib otherwise forwards Authorization to the redirect destination.
        return None


class Broll:
    def __init__(self, api_key=None, base_url=None, timeout=60):
        self.api_key = api_key or os.environ.get("CLYPMINT_API_KEY")
        if not self.api_key:
            raise BrollError(401, "unauthorized", "Set CLYPMINT_API_KEY (get one at https://clypmint.com/broll/dashboard).")
        self.base_url = (base_url or os.environ.get("CLYPMINT_API_URL") or DEFAULT_BASE_URL).rstrip("/")
        self.timeout = timeout
        self._opener = urllib.request.build_opener(_NoRedirect())

    def _call(self, method, path, body=None, idempotency_key=None):
        headers = {"Authorization": "Bearer " + self.api_key, "User-Agent": "clypmint-broll-python/" + __version__}
        data = None
        if body is not None:
            headers["Content-Type"] = "application/json"
            data = json.dumps(body).encode("utf-8")
        if idempotency_key:
            headers["Idempotency-Key"] = idempotency_key
        request = urllib.request.Request(self.base_url + path, data=data, headers=headers, method=method)
        try:
            with self._opener.open(request, timeout=self.timeout) as response:
                return json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as error:
            try:
                data = json.loads(error.read().decode("utf-8"))
                payload = data.get("error", {})
            except Exception:
                data = {}
                payload = {}
            request_id = error.headers.get("x-request-id") or data.get("request_id")
            if 300 <= error.code < 400:
                raise BrollError(error.code, "unsafe_redirect", "The API redirected the request; credentials were not forwarded.", request_id) from None
            raise BrollError(error.code, payload.get("code", "error"), payload.get("message", "API request failed"), request_id) from None

    def search(self, query, context=None, type=None, orientation=None, limit=None, min_score=None, rights=None, keywords=None, names=None, look_for=None, idempotency_key=None):
        """One subject (and the script line it plays over) -> verified shots, best first.

        rights: "licensed" (default) or "any" (also the open web; those shots have license["cleared"] == False).
        keywords, names, look_for: your own plan (1-3 word archive searches, the named things, what the right shot shows);
        send them and the search skips its own planning step.
        """
        body = {"query": query}
        for name, value in (("context", context), ("type", type), ("orientation", orientation), ("limit", limit), ("min_score", min_score), ("rights", rights), ("keywords", keywords), ("names", names), ("look_for", look_for)):
            if value is not None:
                body[name] = value
        return self._call("POST", "/api/v1/broll/search", body, idempotency_key)

    def plan(self, transcript=None, words=None, max_beats=None, results_per_beat=None, rights=None, idempotency_key=None):
        """A whole script -> every moment worth a cutaway, each with its shots."""
        body = {}
        for name, value in (("transcript", transcript), ("words", words), ("max_beats", max_beats), ("results_per_beat", results_per_beat), ("rights", rights)):
            if value is not None:
                body[name] = value
        return self._call("POST", "/api/v1/broll/plan", body, idempotency_key)

    def usage(self):
        """The prepaid balance, this month's spend, auto top-up and the prices."""
        return self._call("GET", "/api/v1/broll/usage")
