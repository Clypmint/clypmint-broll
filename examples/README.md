# Examples

Each one runs from a clone of this repository with `CLYPMINT_API_KEY` set, and each is covered by
[`test/examples.test.mjs`](../test/examples.test.mjs).

| Example | What it shows |
|---|---|
| [`claude-video/`](claude-video) | Editing videos with Claude: the plugin, the lines for `CLAUDE.md`, and where the files go |
| [`script-to-broll.mjs`](script-to-broll.mjs) | A whole script in, the best shot for every moment out, with credits. `--make` saves the files. |
| [`script_to_broll.py`](script_to_broll.py) | The same in Python |
| [`search.sh`](search.sh) | One search and your balance, with curl |

```bash
export CLYPMINT_API_KEY=cm_live_...
echo "In 1969 a Saturn V carried three men to the Moon. Today SpaceX lands its boosters." > script.txt
node examples/script-to-broll.mjs script.txt --make
```
