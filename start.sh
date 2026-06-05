#!/bin/bash

# 区块链汽车供应链平台启动脚本

echo "🚗 区块链汽车供应链平台部署脚本"
echo "================================="

# 创建必要的目录结构
mkdir -p organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp
mkdir -p organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/msp
mkdir -p organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/msp
mkdir -p channel-artifacts
mkdir -p chaincode
mkdir -p backend/wallet

# 创建示例MSP配置文件
cat > organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/config.yaml << 'EOF'
NodeOUs:
  Enable: true
  ClientOUIdentifier:
    Certificate: cacerts/ca.example.com-cert.pem
    OrganizationalUnitIdentifier: client
  PeerOUIdentifier:
    Certificate: cacerts/ca.example.com-cert.pem
    OrganizationalUnitIdentifier: peer
  AdminOUIdentifier:
    Certificate: cacerts/ca.example.com-cert.pem
    OrganizationalUnitIdentifier: admin
  OrdererOUIdentifier:
    Certificate: cacerts/ca.example.com-cert.pem
    OrganizationalUnitIdentifier: orderer
EOF

cat > organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/msp/config.yaml << 'EOF'
NodeOUs:
  Enable: true
  ClientOUIdentifier:
    Certificate: cacerts/ca.org1.example.com-cert.pem
    OrganizationalUnitIdentifier: client
  PeerOUIdentifier:
    Certificate: cacerts/ca.org1.example.com-cert.pem
    OrganizationalUnitIdentifier: peer
  AdminOUIdentifier:
    Certificate: cacerts/ca.org1.example.com-cert.pem
    OrganizationalUnitIdentifier: admin
EOF

cat > organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/msp/config.yaml << 'EOF'
NodeOUs:
  Enable: true
  ClientOUIdentifier:
    Certificate: cacerts/ca.org2.example.com-cert.pem
    OrganizationalUnitIdentifier: client
  PeerOUIdentifier:
    Certificate: cacerts/ca.org2.example.com-cert.pem
    OrganizationalUnitIdentifier: peer
  AdminOUIdentifier:
    Certificate: cacerts/ca.org2.example.com-cert.pem
    OrganizationalUnitIdentifier: admin
EOF

echo "📁 目录结构创建完成"
echo ""

# 启动Docker容器
echo "🚀 启动区块链网络..."
docker-compose up -d

if [ $? -eq 0 ]; then
    echo "✅ 区块链网络启动成功"
    echo ""
    echo "📝 服务端口："
    echo "   - Orderer: 7050"
    echo "   - Peer0 Org1: 7051 (节点) / 7052 (链码)"
    echo "   - Peer0 Org2: 9051 (节点) / 9052 (链码)"
    echo "   - CouchDB Org1: 5984"
    echo "   - CouchDB Org2: 6984"
    echo ""
    echo "🔧 下一步操作："
    echo "   1. 安装依赖："
    echo "      cd backend && npm install"
    echo "      cd ../frontend && npm install"
    echo ""
    echo "   2. 启动后端服务："
    echo "      cd backend && npm start"
    echo ""
    echo "   3. 启动前端应用："
    echo "      cd frontend && npm start"
    echo ""
    echo "🌐 访问地址：http://localhost:3000"
else
    echo "❌ 区块链网络启动失败"
    exit 1
fi