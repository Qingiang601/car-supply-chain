'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const grpc = require('@grpc/grpc-js');
const { connect, signers } = require('@hyperledger/fabric-gateway');

/**
 * Fabric Gateway 连接管理模块
 * 负责建立与 Hyperledger Fabric 区块链网络的连接
 * 支持从环境变量读取配置，包括 TLS 证书路径和 MSP 信息
 */

// 环境变量默认值配置（可通过 .env 覆盖）
const FABRIC_CONFIG = {
  // Peer 节点地址
  peerEndpoint: process.env.PEER_ENDPOINT || 'localhost:7051',
  // Peer 节点主机别名（用于 TLS 验证）
  peerHostAlias: process.env.PEER_HOST_ALIAS || 'peer0.orgcore.example.com',
  // 网关节点地址
  gatewayPeerEndpoint: process.env.GATEWAY_PEER_ENDPOINT || 'localhost:7051',
  gatewayPeerHostAlias: process.env.GATEWAY_PEER_HOST_ALIAS || 'peer0.orgcore.example.com',
  // 通道名
  channelName: process.env.CHANNEL_NAME || 'scfchannel',
  // 链码名
  chaincodeName: process.env.CHAINCODE_NAME || 'receivable',
  // MSP ID（默认核心企业）
  mspId: process.env.MSP_ID || 'OrgCoreMSP',
  // TLS 启用开关（测试环境关闭）
  tlsEnabled: process.env.TLS_ENABLED === 'true',
  // 证书路径
  cryptoPath: process.env.CRYPTO_PATH || path.join(__dirname, '..', '..', 'fabric-network', 'organizations'),
  // 用户证书目录
  certPath: process.env.CERT_PATH || path.join(
    __dirname, '..', '..',
    'fabric-network', 'organizations', 'peerOrganizations', 'orgcore.example.com',
    'users', 'Admin@orgcore.example.com', 'msp', 'signcerts', 'Admin@orgcore.example.com-cert.pem'
  ),
  // 用户私钥目录
  keyPath: process.env.KEY_PATH || path.join(
    __dirname, '..', '..',
    'fabric-network', 'organizations', 'peerOrganizations', 'orgcore.example.com',
    'users', 'Admin@orgcore.example.com', 'msp', 'keystore',
    'priv_sk'
  )
};

/**
 * 加载 PEM 格式证书
 * @param {string} certPath - 证书文件路径
 * @returns {Buffer} 证书内容
 */
function loadCert(certPath) {
  try {
    return fs.readFileSync(certPath);
  } catch (err) {
    throw new Error(`无法加载证书文件 ${certPath}: ${err.message}`);
  }
}

/**
 * 使用 crypto.createPrivateKey 解析 PEM 格式私钥
 * @param {string} keyPath - 私钥文件路径
 * @returns {crypto.PrivateKeyObject} 私钥对象
 */
function loadPrivateKey(keyPath) {
  try {
    const keyPem = fs.readFileSync(keyPath, 'utf8');
    // 使用 crypto.createPrivateKey 解析 PEM 格式私钥
    return crypto.createPrivateKey(keyPem);
  } catch (err) {
    throw new Error(`无法加载私钥文件 ${keyPath}: ${err.message}`);
  }
}

/**
 * 创建与 Fabric Gateway 的连接
 * @returns {Promise<{client: GrpcClient, gateway: Gateway}>} gRPC 客户端和 Gateway 实例
 */
async function createGatewayConnection() {
  let client;

  if (FABRIC_CONFIG.tlsEnabled) {
    // TLS 模式：加载 TLS 证书
    const tlsCertPath = path.join(
      FABRIC_CONFIG.cryptoPath,
      'peerOrganizations', 'orgcore.example.com',
      'peers', 'peer0.orgcore.example.com',
      'tls', 'ca.crt'
    );
    const tlsRootCert = loadCert(tlsCertPath);

    client = new grpc.Client(FABRIC_CONFIG.peerEndpoint, grpc.credentials.createSsl(tlsRootCert), {
      'grpc.ssl_target_name_override': FABRIC_CONFIG.peerHostAlias
    });
    console.log(`[Fabric] 已建立 TLS gRPC 连接到 ${FABRIC_CONFIG.peerEndpoint}`);
  } else {
    // 非 TLS 模式（测试环境）
    client = new grpc.Client(FABRIC_CONFIG.peerEndpoint, grpc.credentials.createInsecure());
    console.log(`[Fabric] 已建立非 TLS gRPC 连接到 ${FABRIC_CONFIG.peerEndpoint}`);
  }

  // 创建 Gateway 实例
  const gateway = connect({
    client: client,
    identity: await createIdentity(),
    signer: await createSigner(),
    hash: 'sha256',
    evaluateTimeout: 30000,
    endorseTimeout: 30000,
    commitTimeout: 30000,
    commitStatusTimeout: 60000
  });

  return { client, gateway };
}

/**
 * 创建身份凭证（X.509 证书）
 */
async function createIdentity() {
  const credentials = loadCert(FABRIC_CONFIG.certPath);
  return {
    mspId: FABRIC_CONFIG.mspId,
    credentials: credentials
  };
}

/**
 * 创建签名者（私钥）
 */
async function createSigner() {
  const privateKey = loadPrivateKey(FABRIC_CONFIG.keyPath);
  const identity = await createIdentity();
  return signers.newPrivateKeySigner(privateKey);
}

/**
 * 获取合约实例（用于链码调用）
 * @param {Gateway} gateway
 * @returns {Contract}
 */
function getContract(gateway) {
  const network = gateway.getNetwork(FABRIC_CONFIG.channelName);
  const contract = network.getContract(FABRIC_CONFIG.chaincodeName);
  console.log(
    `[Fabric] 已连接到通道 ${FABRIC_CONFIG.channelName}，链码 ${FABRIC_CONFIG.chaincodeName}`
  );
  return contract;
}

/**
 * 辅助方法：将 Uint8Array 结果转换为字符串
 * @param {Uint8Array|Buffer} result - 链码返回的字节数据
 * @returns {string} UTF-8 字符串
 */
function resultToString(result) {
  if (!result) return '';
  return Buffer.from(result).toString('utf8');
}

module.exports = {
  FABRIC_CONFIG,
  createGatewayConnection,
  getContract,
  resultToString
};