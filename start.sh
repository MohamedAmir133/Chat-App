#!/bin/sh
set -e

node dist/apps/auth/main.js &
node dist/apps/chat/main.js &
node dist/apps/user/main.js &
PORT=6100 node dist/apps/chat-app_gateway/main.js &

exec npm --prefix apps/web run start -- -p "${PORT:-3400}"
