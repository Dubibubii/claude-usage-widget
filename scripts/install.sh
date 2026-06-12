#!/bin/bash
# Claude Usage Widget — connector install
#
# One command: registers the statusline shim with Claude Code so the widget
# can read your real usage limits. Idempotent; preserves an existing custom
# statusline by chaining it (its output still renders).
#
#   ./scripts/install.sh
set -eu

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DIR="$HOME/.claude/usage-widget"
SETTINGS="$HOME/.claude/settings.json"
SHIM="$DIR/statusline-shim.sh"

mkdir -p "$DIR"
cp "$REPO_DIR/scripts/claude-statusline-shim.sh" "$SHIM"
chmod +x "$SHIM"

# merge statusLine into settings.json without disturbing anything else;
# python3 ships with macOS — no jq dependency for install
SHIM="$SHIM" SETTINGS="$SETTINGS" CHAIN_FILE="$DIR/chain.cmd" python3 - <<'PY'
import json, os, sys

shim = os.environ["SHIM"]
settings_path = os.environ["SETTINGS"]
chain_file = os.environ["CHAIN_FILE"]

settings = {}
if os.path.exists(settings_path):
    with open(settings_path) as f:
        settings = json.load(f)

existing = settings.get("statusLine")
if isinstance(existing, dict) and existing.get("command") not in (None, shim):
    # preserve the user's statusline: the shim pipes the same JSON into it
    with open(chain_file, "w") as f:
        f.write(existing["command"])
    print(f"existing statusline preserved → chained via {chain_file}")

settings["statusLine"] = {"type": "command", "command": shim}

backup = settings_path + ".usage-widget.bak"
if os.path.exists(settings_path) and not os.path.exists(backup):
    os.rename(settings_path, backup)
with open(settings_path, "w") as f:
    json.dump(settings, f, indent=2)
print(f"statusLine registered in {settings_path} (backup: {backup})")
PY

echo
echo "Done. Restart Claude Code (or start a new session) once —"
echo "the widget's session/weekly meters go live on the first statusline render."
