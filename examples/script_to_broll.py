"""A whole script in, b-roll out. One plan call finds every moment worth a cutaway; this prints each moment's best
shot, where to get it, and the credit lines.

    CLYPMINT_API_KEY=cm_live_... python3 examples/script_to_broll.py script.txt

In your own project: pip install "git+https://github.com/Clypmint/clypmint-broll@v1.2.1#subdirectory=python"
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "python"))  # run from a clone

from clypmint_broll import Broll  # noqa: E402


def main(path):
    with open(path, encoding="utf-8") as f:
        plan = Broll().plan(f.read(), max_beats=8)
    credits = []
    for i, beat in enumerate(plan["beats"], 1):
        print('%d. "%s"' % (i, beat["quote"]))
        shots = beat.get("results") or []
        if not shots:
            print("   no shot passed the check")
            continue
        shot = shots[0]
        print("   [%s/10] %s" % (shot["score"], shot.get("shows") or shot["title"]))
        # an image to download, or a command that cuts the clip on this machine
        print("   " + (shot.get("cut_command") or shot.get("download_url") or shot["url"]))
        if shot["license"].get("attribution"):
            credits.append(shot["license"]["attribution"])
    if credits:
        print("\nCredits:\n" + "\n".join(credits))
    print("\nCharged $%s, $%s left." % (plan["usage"]["charged_usd"], plan["usage"]["balance_usd"]))


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("usage: python3 examples/script_to_broll.py script.txt")
    main(sys.argv[1])
