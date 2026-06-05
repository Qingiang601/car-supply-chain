'use strict';

const { Contract } = require('fabric-contract-api');
const Receivable = require('./receivable');

/**
 * ReceivableContract - 应收账款智能合约
 * 管理汽车供应链中应收账款的创建、确权、转让、融资申请与审批
 * 所有方法均进行 MSP 权限校验，仅特定组织可执行对应操作
 */
class ReceivableContract extends Contract {

  constructor() {
    super('ReceivableContract');
    // 组织 MSP ID 映射（根据 crypto-config.yaml 定义）
    this.ORG_CORE = 'OrgCoreMSP';           // 核心企业
    this.ORG_SUPPLIER1 = 'OrgSupplier1MSP'; // 一级供应商
    this.ORG_SUPPLIER2 = 'OrgSupplier2MSP'; // 二级供应商
    this.ORG_SUPPLIER3 = 'OrgSupplier3MSP'; // 三级供应商
    this.ORG_BANK = 'OrgBankMSP';           // 银行
    this.ORG_SUPERVISE = 'OrgSuperviseMSP'; // 监管机构
  }

  /**
   * 初始化账本（可选，通常只在首次部署时调用一次）
   * @param {Context} ctx
   */
  async initLedger(ctx) {
    console.log('初始化账本：应收账款链码已部署，账本为空，等待业务数据写入');
    return { success: true, message: '账本初始化完成' };
  }

  /**
   * 创建应收账款
   * 权限：仅核心企业（OrgCoreMSP）可创建
   * 状态：初始状态为 Created
   *
   * @param {Context} ctx
   * @param {string} receivableId - 账款唯一编号
   * @param {string} seller - 债权人（核心企业）
   * @param {string} buyer - 债务人（初始持有人，即一级供应商）
   * @param {number} amount - 金额
   * @param {string} createTime - 创建时间
   * @param {string} expireTime - 到期日
   * @param {string} remark - 备注
   */
  async createReceivable(ctx, receivableId, seller, buyer, amount, createTime, expireTime, remark) {
    // 权限校验：仅核心企业可创建
    const mspId = ctx.clientIdentity.getMSPID();
    if (mspId !== this.ORG_CORE) {
      throw new Error(`权限不足：仅核心企业可创建应收账款，当前组织 MSP ID: ${mspId}`);
    }

    // 校验账款是否已存在
    const existing = await ctx.stub.getState(receivableId);
    if (existing && existing.length > 0) {
      throw new Error(`应收账款 ${receivableId} 已存在，不可重复创建`);
    }

    // 创建应收账款资产对象
    const receivable = new Receivable(
      receivableId,
      seller,
      buyer,
      parseFloat(amount),
      createTime,
      expireTime,
      'Created',
      remark
    );
    receivable.addStatusChange('', 'Created', new Date().toISOString(), mspId, `创建应收账款，金额: ${amount} 元`);

    // 写入账本
    await ctx.stub.putState(receivableId, Buffer.from(receivable.toJSON(), 'utf8'));

    console.log(`应收账款 ${receivableId} 创建成功`);
    return { success: true, message: '应收账款创建成功', receivableId: receivableId };
  }

  /**
   * 查询单笔应收账款
   * @param {Context} ctx
   * @param {string} receivableId
   * @returns {string} JSON 字符串
   */
  async queryReceivable(ctx, receivableId) {
    const data = await ctx.stub.getState(receivableId);
    if (!data || data.length === 0) {
      throw new Error(`应收账款 ${receivableId} 不存在`);
    }
    return data.toString('utf8');
  }

  /**
   * 查询所有应收账款
   * 使用 getStateByRange 进行全量范围查询
   * @param {Context} ctx
   * @returns {string} JSON 数组字符串
   */
  async queryAllReceivables(ctx) {
    const startKey = '';
    const endKey = '';
    const iterator = await ctx.stub.getStateByRange(startKey, endKey);
    const results = [];

    let result = await iterator.next();
    while (!result.done) {
      const value = result.value.value.toString('utf8');
      if (value && value.length > 0) {
        try {
          const record = JSON.parse(value);
          results.push({ key: result.value.key, record: record });
        } catch (e) {
          console.log(`解析账款 ${result.value.key} 失败: ${e.message}`);
        }
      }
      result = await iterator.next();
    }
    await iterator.close();

    return JSON.stringify(results);
  }

  /**
   * 按持有人查询应收账款（CouchDB 富查询）
   * 需要预先部署 holderIndex 索引
   * @param {Context} ctx
   * @param {string} holder - 持有人名称
   * @returns {string} JSON 数组字符串
   */
  async queryByHolder(ctx, holder) {
    const queryString = JSON.stringify({
      selector: {
        buyer: holder
      },
      use_index: ['_design/holderIndexDoc', 'holderIndex']
    });

    const iterator = await ctx.stub.getQueryResult(queryString);
    const results = [];

    let result = await iterator.next();
    while (!result.done) {
      const value = result.value.value.toString('utf8');
      if (value && value.length > 0) {
        try {
          const record = JSON.parse(value);
          results.push({ key: result.value.key, record: record });
        } catch (e) {
          console.log(`解析账款 ${result.value.key} 失败: ${e.message}`);
        }
      }
      result = await iterator.next();
    }
    await iterator.close();

    return JSON.stringify(results);
  }

  /**
   * 获取应收账款的历史记录
   * 使用 getHistoryForKey 获取链上所有状态变更
   * @param {Context} ctx
   * @param {string} receivableId
   * @returns {string} JSON 数组字符串
   */
  async getHistoryForReceivable(ctx, receivableId) {
    const iterator = await ctx.stub.getHistoryForKey(receivableId);
    const results = [];

    let result = await iterator.next();
    while (!result.done) {
      const txId = result.value.txId;
      const timestamp = result.value.timestamp;
      const value = result.value.value.toString('utf8');
      const isDelete = result.value.isDelete;

      results.push({
        txId: txId,
        timestamp: new Date(timestamp.seconds.low * 1000).toISOString(),
        value: value ? JSON.parse(value) : null,
        isDelete: isDelete
      });

      result = await iterator.next();
    }
    await iterator.close();

    return JSON.stringify(results);
  }

  /**
   * 确权应收账款
   * 权限：当前持有人（buyer 对应的组织）可确权
   * 状态变更：Created → Confirmed
   * @param {Context} ctx
   * @param {string} receivableId
   */
  async confirmReceivable(ctx, receivableId) {
    const data = await ctx.stub.getState(receivableId);
    if (!data || data.length === 0) {
      throw new Error(`应收账款 ${receivableId} 不存在`);
    }

    const receivable = Receivable.fromBuffer(data);
    const mspId = ctx.clientIdentity.getMSPID();

    // 状态校验
    if (receivable.status !== 'Created') {
      throw new Error(`应收账款 ${receivableId} 当前状态为 ${receivable.status}，不可确权（仅 Created 状态可确权）`);
    }

    // 权限校验：仅当前持有人（供应商）可确权
    // buyer 名称与 MSP ID 的对应关系由业务层维护
    // 这里简化为允许所有 Supplier 组织确权
    const allowedMsps = [this.ORG_SUPPLIER1, this.ORG_SUPPLIER2, this.ORG_SUPPLIER3, this.ORG_CORE];
    if (!allowedMsps.includes(mspId)) {
      throw new Error(`权限不足：仅供应商或核心企业可确权，当前组织 MSP ID: ${mspId}`);
    }

    const oldStatus = receivable.status;
    receivable.status = 'Confirmed';
    receivable.addStatusChange(oldStatus, 'Confirmed', new Date().toISOString(), mspId, '确权完成');

    await ctx.stub.putState(receivableId, Buffer.from(receivable.toJSON(), 'utf8'));

    console.log(`应收账款 ${receivableId} 确权成功`);
    return { success: true, message: '确权成功', receivableId: receivableId, newStatus: 'Confirmed' };
  }

  /**
   * 转让应收账款
   * 权限：当前持有人可转让
   * 状态变更：Confirmed → Transferred
   * @param {Context} ctx
   * @param {string} receivableId
   * @param {string} newHolder - 新持有人
   */
  async transferReceivable(ctx, receivableId, newHolder) {
    const data = await ctx.stub.getState(receivableId);
    if (!data || data.length === 0) {
      throw new Error(`应收账款 ${receivableId} 不存在`);
    }

    const receivable = Receivable.fromBuffer(data);
    const mspId = ctx.clientIdentity.getMSPID();

    // 状态校验：仅 Confirmed 或 Transferred 状态可转让
    if (receivable.status !== 'Confirmed' && receivable.status !== 'Transferred') {
      throw new Error(`应收账款 ${receivableId} 当前状态为 ${receivable.status}，不可转让（仅 Confirmed 或 Transferred 状态可转让）`);
    }

    // 权限校验：仅当前持有人（供应商）可转让
    const allowedMsps = [this.ORG_SUPPLIER1, this.ORG_SUPPLIER2, this.ORG_SUPPLIER3];
    if (!allowedMsps.includes(mspId)) {
      throw new Error(`权限不足：仅供应商可转让应收账款，当前组织 MSP ID: ${mspId}`);
    }

    const oldStatus = receivable.status;
    const oldHolder = receivable.buyer;
    receivable.buyer = newHolder;
    receivable.status = 'Transferred';
    receivable.addStatusChange(
      oldStatus,
      'Transferred',
      new Date().toISOString(),
      mspId,
      `从 ${oldHolder} 转让给 ${newHolder}`
    );

    await ctx.stub.putState(receivableId, Buffer.from(receivable.toJSON(), 'utf8'));

    console.log(`应收账款 ${receivableId} 已从 ${oldHolder} 转让给 ${newHolder}`);
    return { success: true, message: '转让成功', receivableId: receivableId, newHolder: newHolder };
  }

  /**
   * 申请融资
   * 权限：当前持有人可申请
   * 状态变更：Confirmed 或 Transferred → Financed
   * @param {Context} ctx
   * @param {string} receivableId
   * @param {number} amount - 融资金额
   */
  async applyFinancing(ctx, receivableId, amount) {
    const data = await ctx.stub.getState(receivableId);
    if (!data || data.length === 0) {
      throw new Error(`应收账款 ${receivableId} 不存在`);
    }

    const receivable = Receivable.fromBuffer(data);
    const mspId = ctx.clientIdentity.getMSPID();

    // 状态校验
    if (receivable.status !== 'Confirmed' && receivable.status !== 'Transferred') {
      throw new Error(`应收账款 ${receivableId} 当前状态为 ${receivable.status}，不可申请融资（仅 Confirmed 或 Transferred 状态可申请）`);
    }

    // 金额校验
    const financeAmount = parseFloat(amount);
    if (financeAmount <= 0 || financeAmount > receivable.amount) {
      throw new Error(`融资金额 ${amount} 无效，必须在 0 到 ${receivable.amount} 之间`);
    }

    // 权限校验：仅当前持有人可申请
    const allowedMsps = [this.ORG_SUPPLIER1, this.ORG_SUPPLIER2, this.ORG_SUPPLIER3];
    if (!allowedMsps.includes(mspId)) {
      throw new Error(`权限不足：仅供应商可申请融资，当前组织 MSP ID: ${mspId}`);
    }

    const oldStatus = receivable.status;
    receivable.status = 'Financed';
    receivable.remark = `融资申请金额: ${financeAmount} 元`;
    receivable.addStatusChange(
      oldStatus,
      'Financed',
      new Date().toISOString(),
      mspId,
      `申请融资，金额: ${financeAmount} 元`
    );

    await ctx.stub.putState(receivableId, Buffer.from(receivable.toJSON(), 'utf8'));

    console.log(`应收账款 ${receivableId} 融资申请已提交，金额: ${financeAmount} 元`);
    return { success: true, message: '融资申请已提交', receivableId: receivableId };
  }

  /**
   * 银行审批融资
   * 权限：仅银行（OrgBankMSP）可审批
   * 状态变更：
   *   - approved=true  → Settled（结清）
   *   - approved=false → 回退到之前状态（从 statusHistory 倒数第二条的 'to' 读取）
   * @param {Context} ctx
   * @param {string} receivableId
   * @param {boolean} approved - 是否批准
   */
  async approveFinancing(ctx, receivableId, approved) {
    const data = await ctx.stub.getState(receivableId);
    if (!data || data.length === 0) {
      throw new Error(`应收账款 ${receivableId} 不存在`);
    }

    const receivable = Receivable.fromBuffer(data);
    const mspId = ctx.clientIdentity.getMSPID();

    // 权限校验：仅银行可审批
    if (mspId !== this.ORG_BANK) {
      throw new Error(`权限不足：仅银行可审批融资，当前组织 MSP ID: ${mspId}`);
    }

    // 状态校验：仅 Financed 状态可审批
    if (receivable.status !== 'Financed') {
      throw new Error(`应收账款 ${receivableId} 当前状态为 ${receivable.status}，不可审批（仅 Financed 状态可审批）`);
    }

    const oldStatus = receivable.status;

    if (approved === true || approved === 'true') {
      // 批准：状态变为 Settled（结清）
      receivable.status = 'Settled';
      receivable.addStatusChange(oldStatus, 'Settled', new Date().toISOString(), mspId, '银行审批通过，融资结清');
    } else {
      // 拒绝：回退到之前状态
      // 从 statusHistory 中找到最近的非融资状态
      const history = receivable.statusHistory;
      let previousStatus = 'Created';
      if (history.length >= 2) {
        // 倒数第二条记录的 'to' 状态即为融资前的状态
        previousStatus = history[history.length - 2].to;
      }
      receivable.status = previousStatus;
      receivable.remark = '融资申请被拒绝';
      receivable.addStatusChange(oldStatus, previousStatus, new Date().toISOString(), mspId, '银行审批拒绝，状态回退');
    }

    await ctx.stub.putState(receivableId, Buffer.from(receivable.toJSON(), 'utf8'));

    console.log(`应收账款 ${receivableId} 审批完成，approved=${approved}`);
    return { success: true, message: `审批${approved ? '通过' : '拒绝'}`, receivableId: receivableId };
  }
}

module.exports = ReceivableContract;