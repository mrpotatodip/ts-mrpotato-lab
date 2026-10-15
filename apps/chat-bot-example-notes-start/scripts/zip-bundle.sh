#!/usr/bin/env bash
# Zips src/vendor/chat-bot into dist/chat-bot.zip, to share.
set -euo pipefail
cd "$(dirname "$0")/.."

# -----
# Never zip a secret: stop if anything in the bundle looks like an API key.
# -----
if grep -rEl 'sk-(proj-)?[A-Za-z0-9_-]{20,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY' src/vendor/chat-bot; then
  echo "Refusing to zip: the file(s) above look like they contain a secret. Remove them first." >&2
  exit 1
fi

mkdir -p dist
rm -f dist/chat-bot.zip
(cd src/vendor && zip -qr ../../dist/chat-bot.zip chat-bot -x '*.DS_Store')
unzip -l dist/chat-bot.zip | tail -1
echo "dist/chat-bot.zip"
