#!/usr/bin/env bash
# Refreshes the engine and React copies inside src/vendor/chat-bot from packages/, and the notes
# host in src/notes. Leaves src/vendor/chat-bot/README.md and example/ alone.
# Skips tests, and the parts that need drizzle-orm or vitest (the Postgres store and
# tables, the store contract): copy those too, with their dependency, if you use them.
set -euo pipefail
cd "$(dirname "$0")/.."
PACKAGES=../../packages
NOTES=../chat-bot-example-notes
BUNDLE=src/vendor/chat-bot

rm -rf "$BUNDLE/chat-bot-api" "$BUNDLE/chat-bot-durable-stream" "$BUNDLE/chat-bot-react" "$BUNDLE/chat-bot-react-loader" src/notes
mkdir -p "$BUNDLE/chat-bot-api" "$BUNDLE/chat-bot-durable-stream" "$BUNDLE/chat-bot-react" "$BUNDLE/chat-bot-react-loader" src/notes

rsync -a --exclude __tests__ --exclude drizzle --exclude testing \
  "$PACKAGES/chat-bot-api/src" "$PACKAGES/chat-bot-api/README.md" \
  "$BUNDLE/chat-bot-api/"

rsync -a --exclude __tests__ \
  --exclude tables --exclude server.ts --exclude pg-types.ts \
  --exclude pg-stream-store.ts --exclude pg-durable-stream.ts \
  "$PACKAGES/chat-bot-durable-stream/src" "$PACKAGES/chat-bot-durable-stream/README.md" \
  "$BUNDLE/chat-bot-durable-stream/"

rsync -a --exclude __tests__ "$PACKAGES/chat-bot-react-loader/src" "$PACKAGES/chat-bot-react-loader/README.md" "$BUNDLE/chat-bot-react-loader/"

rsync -a --exclude __tests__ "$PACKAGES/chat-bot-react/src" "$PACKAGES/chat-bot-react/README.md" "$BUNDLE/chat-bot-react/"

cp "$NOTES/src/index.ts" src/notes/app.ts
cp "$NOTES/src/notes.ts" "$NOTES/src/model.ts" src/notes/
