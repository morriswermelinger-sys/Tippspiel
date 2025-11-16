#!/usr/bin/env bash
set -e
[ ! -d node_modules ] && npm install
[ ! -f .env ] && echo -e 'ADMIN_KEY=187\nPORT=3001' > .env
echo 'Server: http://localhost:3001'
node server.js
