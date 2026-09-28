#!/usr/bin/env sh
set -e
command -v node >/dev/null || { echo "Node.js is required: https://nodejs.org"; exit 1; }
cd "$(dirname "$0")/app"
npm install
if [ "$1" = "https" ]; then npm run dev:https; else npm run dev; fi
