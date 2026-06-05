'use strict';

/**
 * Receivable 应收账款资产类
 * 代表区块链上的一笔应收账款，记录核心企业与供应商之间的债权债务关系
 */
class Receivable {
  /**
   * @param {string} receivableId - 账款唯一编号
   * @param {string} seller - 债权人（核心企业，即签发方）
   * @param {string} buyer - 债务人（初始持有人/供应商）
   * @param {number} amount - 账款金额（元）
   * @param {string} createTime - 创建时间（ISO 8601 格式）
   * @param {string} expireTime - 到期日（ISO 8601 格式）
   * @param {string} status - 状态：Created, Confirmed, Transferred, Financed, Settled, Invalid
   * @param {string} remark - 备注信息
   */
  constructor(receivableId, seller, buyer, amount, createTime, expireTime, status, remark) {
    this.receivableId = receivableId;
    this.seller = seller;        // 核心企业
    this.buyer = buyer;          // 当前持有人
    this.amount = amount;
    this.createTime = createTime;
    this.expireTime = expireTime;
    this.status = status;
    this.remark = remark || '';
    // 记录状态变更历史（可选，用于链上追溯）
    this.statusHistory = [];
  }

  /**
   * 序列化为 JSON 字符串，用于存入账本
   */
  toJSON() {
    return JSON.stringify({
      receivableId: this.receivableId,
      seller: this.seller,
      buyer: this.buyer,
      amount: this.amount,
      createTime: this.createTime,
      expireTime: this.expireTime,
      status: this.status,
      remark: this.remark,
      statusHistory: this.statusHistory
    });
  }

  /**
   * 从账本字节数据反序列化为 Receivable 对象
   * @param {Buffer} buffer
   */
  static fromBuffer(buffer) {
    const data = JSON.parse(buffer.toString('utf8'));
    const receivable = new Receivable(
      data.receivableId,
      data.seller,
      data.buyer,
      data.amount,
      data.createTime,
      data.expireTime,
      data.status,
      data.remark
    );
    receivable.statusHistory = data.statusHistory || [];
    return receivable;
  }

  /**
   * 添加状态变更记录
   * @param {string} oldStatus - 变更前状态
   * @param {string} newStatus - 变更后状态
   * @param {string} timestamp - 变更时间戳
   * @param {string} operator - 操作人 MSP ID
   * @param {string} extraInfo - 额外信息（如受让人、融资金额等）
   */
  addStatusChange(oldStatus, newStatus, timestamp, operator, extraInfo) {
    this.statusHistory.push({
      from: oldStatus,
      to: newStatus,
      timestamp: timestamp,
      operator: operator,
      extraInfo: extraInfo || ''
    });
  }
}

module.exports = Receivable;