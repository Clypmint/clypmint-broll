# clypmint-broll (Python)

```bash
pip install "git+https://github.com/Clypmint/clypmint-broll@v1.2.0#subdirectory=python"
```

```python
from clypmint_broll import Broll

broll = Broll()  # reads CLYPMINT_API_KEY
r = broll.search("Sam Altman", context="Sam Altman just walked on stage", type="image", limit=3)
for shot in r["results"]:
    print(shot["score"], shot["shows"], shot["download_url"], shot["license"]["name"])

plan = broll.plan("Last week I flew to Tokyo to meet the Figma team.")
```

No dependencies. Errors raise `BrollError` with `.status` and `.code`. Docs: https://clypmint.com/broll/docs
