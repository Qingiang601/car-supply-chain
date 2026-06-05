'use strict';

/**
 * 应收账款链码入口文件
 * 导出 ReceivableContract 供 Hyperledger Fabric peer 节点调用
 */
const { ReceivableContract } = require('./lib/receivableContract');
module.exports.contracts = [ReceivableContract];