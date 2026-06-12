#!/bin/bash
# Claude Usage Widget — statusline shim
#
# Claude Code invokes this as its statusline command, passing session JSON on
# stdin. For Pro/Max accounts that JSON includes `rate_limits` — the REAL
# 5-hour / weekly used percentages and reset times the native /usage screen
# shows. We capture the payload to a file the widget watches, then render a
# statusline. This is the ToS-compliant data path: no API calls, no OAuth
# token reuse — only data Claude Code itself already produced.
#
# To keep a custom statusline, write its command into
# ~/.claude/usage-widget/chain.cmd — it receives the same JSON on stdin and
# its output becomes the statusline display.
set -eu

DIR="$HOME/.claude/usage-widget"
mkdir -p "$DIR"
INPUT=$(cat)

# atomic write so readers never see partial JSON — this is the critical path
printf '%s' "$INPUT" > "$DIR/statusline-latest.json.tmp" \
  && mv "$DIR/statusline-latest.json.tmp" "$DIR/statusline-latest.json"

if [ -f "$DIR/chain.cmd" ]; then
  printf '%s' "$INPUT" | sh -c "$(cat "$DIR/chain.cmd")"
elif command -v jq >/dev/null 2>&1; then
  printf '%s' "$INPUT" | jq -r '
    (.model.display_name // "Claude")
    + (if .rate_limits.five_hour.used_percentage != null
       then " · 5h " + ((.rate_limits.five_hour.used_percentage | round | tostring) + "%")
       else "" end)
    + (if .rate_limits.seven_day.used_percentage != null
       then " · wk " + ((.rate_limits.seven_day.used_percentage | round | tostring) + "%")
       else "" end)'
else
  # display is cosmetic — the capture above is what the widget needs
  echo "Claude · usage widget connected"
fi
