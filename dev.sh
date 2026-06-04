#!/bin/bash

trap 'kill 0' EXIT

PORT=8080 pnpm --filter @workspace/api-server run dev &
API_PID=$!

PORT=21426 BASE_PATH=/ pnpm --filter @workspace/unila-digital-sign run dev &
FRONTEND_PID=$!

echo "✅ API Server    → http://localhost:8080"
echo "✅ Frontend      → http://localhost:21426"

wait $API_PID $FRONTEND_PID
