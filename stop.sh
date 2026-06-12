#!/bin/bash
echo "正在停止前端、后端服务..."
pkill -f "npm start" || true

echo "正在停止Fabric区块链网络..."
docker compose down

echo "所有服务已全部停止！"
