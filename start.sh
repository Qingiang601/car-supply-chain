#!/bin/bash
echo "正在启动Fabric区块链网络..."
docker compose up -d

echo "正在启动后端服务..."
cd backend/ && npm install && npm start &

echo "正在启动前端服务..."
cd frontend/ && npm install && npm start &

echo "✅ 所有服务已启动！"
echo "前端地址：http://localhost:3000"
echo "后端地址：http://localhost:5000"
