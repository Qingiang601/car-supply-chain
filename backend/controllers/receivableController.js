'use strict';

const { createGatewayConnection, getContract, resultToString } = require('../config/fabric');

/**
 * 应收账款控制器
 * 
 * 负责处理与区块链链码交互的所有业务逻辑。
 * 每个方法都是 Express 中间件/处理函数。
 */

// ──────────────────────────── 辅助函数 ────────────────────────────

/**
 * 状态英文 -> 中文映射表
 */
const STATUS_MAP = {
  'Created': '未确权',
  'Confirmed': '已确权',
  'Transferred': '已转让',
  'Financed': '已融资',
  'Settled': '已结清'
};

/**
 * 创建 API 错误对象
 */
class ApiError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * 解析链码返回的 Uint8Array 为 JSON 对象
 */
function parseChaincodeResult(result) {
  const str = resultToString(result);
  if (!str) return null;
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
}

/**
 * 将链码返回的单笔账款数据映射为前端格式
 * 链码字段: receivableId, seller, buyer, amount, createTime, expireTime, status, remark, statusHistory
 * 前端字段: id, supplierName, buyerName, amount, createDate, dueDate, status, invoiceNo, goodsName
 */
function mapReceivableToFrontend(item) {
  let remarkData = {};
  if (item.remark) {
    try {
      remarkData = JSON.parse(item.remark);
    } catch {
      remarkData = { invoiceNo: '', goodsName: item.remark };
    }
  }
  return {
    id: item.receivableId || item.id,
    supplierName: item.seller || item.supplierName || '',
    buyerName: item.buyer || item.buyerName || '',
    amount: Number(item.amount) || 0,
    createDate: item.createTime ? new Date(item.createTime).toISOString().split('T')[0] : '',
    dueDate: item.expireTime ? new Date(item.expireTime).toISOString().split('T')[0] : '',
    status: STATUS_MAP[item.status] || item.status || '未确权',
    invoiceNo: remarkData.invoiceNo || '',
    goodsName: remarkData.goodsName || ''
  };
}

/**
 * 将 getHistoryForReceivable 返回的历史记录映射为前端格式
 * 链码历史格式: { txId, timestamp, value: {...receivable JSON}, isDelete }
 * 前端期望: { id, transactionHash, timestamp, action, status, operator }
 */
function mapHistoryToFrontend(historyRecords) {
  if (!Array.isArray(historyRecords)) return [];
  return historyRecords.map((record, index) => {
    // 解析链上记录的值
    let value = record.value;
    if (typeof value === 'string') {
      try { value = JSON.parse(value); } catch { value = {}; }
    }
    // 从状态变更历史推断操作
    let action = '创建';
    let statusDisplay = STATUS_MAP[value.status] || value.status || '未知';
    let operator = '-';
    if (value.statusHistory && Array.isArray(value.statusHistory) && value.statusHistory.length > 0) {
      const lastChange = value.statusHistory[value.statusHistory.length - 1];
      const fromStatus = STATUS_MAP[lastChange.from] || lastChange.from;
      const toStatus = STATUS_MAP[lastChange.to] || lastChange.to;
      if (lastChange.from === 'Created' && lastChange.to === 'Confirmed') action = '确权';
      else if (lastChange.from === 'Confirmed' && lastChange.to === 'Transferred') action = '转让';
      else if ((lastChange.from === 'Confirmed' || lastChange.from === 'Transferred') && lastChange.to === 'Financed') action = '申请融资';
      else if (lastChange.from === 'Financed' && lastChange.to === 'Settled') action = '银行审批通过';
      else if (lastChange.from === 'Financed' && lastChange.to !== 'Settled') action = '银行审批拒绝';
      else if (!lastChange.from || lastChange.from === 'Created') action = '创建';
      else action = `状态变更: ${fromStatus} -> ${toStatus}`;
      operator = lastChange.operator || '-';
      statusDisplay = toStatus;
    }
    return {
      id: index,
      transactionHash: record.txId || record.tx_id || '-',
      timestamp: record.timestamp ? new Date(record.timestamp.seconds ? record.timestamp.seconds.low * 1000 : record.timestamp).toISOString() : '-',
      action: action,
      status: statusDisplay,
      operator: operator
    };
  });
}

/**
 * 执行链码查询（evaluateTransaction）
 * 不产生账本变更
 */
async function evaluateTransaction(methodName, ...args) {
  const { client, gateway } = await createGatewayConnection();
  try {
    const contract = getContract(gateway);
    const result = await contract.evaluateTransaction(methodName, ...args);
    return parseChaincodeResult(result);
  } finally {
    gateway.close();
    client.close();
  }
}

/**
 * 执行链码提交（submitTransaction）
 * 产生账本变更
 */
async function submitTransaction(methodName, ...args) {
  const { client, gateway } = await createGatewayConnection();
  try {
    const contract = getContract(gateway);
    const result = await contract.submitTransaction(methodName, ...args);
    return parseChaincodeResult(result);
  } finally {
    gateway.close();
    client.close();
  }
}

// ──────────────────────────── API 处理方法 ────────────────────────────

/**
 * GET /api/receivables - 查询所有账款
 */
const queryAll = async (req, res, next) => {
  try {
    console.log('[API] 查询所有账款');
    const result = await evaluateTransaction('queryAllReceivables');
    const rawData = Array.isArray(result) ? result : (result?.records || []);
    const data = rawData.map(mapReceivableToFrontend);
    res.json({ success: true, data, message: '查询成功' });
  } catch (err) {
    console.error('[API Error] queryAll:', err.message);
    next(new ApiError(500, err.message, err.details));
  }
};

/**
 * POST /api/receivables - 创建账款
 * 请求体：{ supplierName, buyerName, amount, dueDate, invoiceNo?, goodsName? }
 */
const create = async (req, res, next) => {
  try {
    const { supplierName, buyerName, amount, dueDate, invoiceNo, goodsName } = req.body;
    if (!supplierName || !buyerName || !amount || !dueDate) {
      throw new ApiError(400, '参数缺失：需要 supplierName, buyerName, amount, dueDate');
    }
    // 生成 receivableId
    const receivableId = `RECV-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    const createTime = new Date().toISOString();
    const expireTime = new Date(dueDate).toISOString();
    const remark = JSON.stringify({ invoiceNo: invoiceNo || '', goodsName: goodsName || '' });
    console.log(`[API] 创建账款: ${receivableId}`);
    const result = await submitTransaction(
      'createReceivable',
      receivableId,
      supplierName,    // seller（核心企业/供应商）
      buyerName,       // buyer（采购商/初始持有人）
      String(amount),
      createTime,
      expireTime,
      remark
    );
    res.status(201).json({ success: true, data: result, message: '账款创建成功' });
  } catch (err) {
    console.error('[API Error] create:', err.message);
    next(err.statusCode ? err : new ApiError(500, err.message));
  }
};

/**
 * POST /api/receivables/:id/confirm - 确权
 * 请求体：{ operator? }
 */
const confirm = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) throw new ApiError(400, '参数缺失：id');
    console.log(`[API] 确权账款: ${id}`);
    const result = await submitTransaction('confirmReceivable', id);
    res.json({ success: true, data: result, message: '账款确权成功' });
  } catch (err) {
    console.error('[API Error] confirm:', err.message);
    next(err.statusCode ? err : new ApiError(500, err.message));
  }
};

/**
 * POST /api/receivables/:id/transfer - 转让
 * 请求体：{ newOwner, operator? }
 */
const transfer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newOwner } = req.body;
    if (!id || !newOwner) throw new ApiError(400, '参数缺失：需要 id, newOwner');
    console.log(`[API] 转让账款: ${id} -> ${newOwner}`);
    const result = await submitTransaction('transferReceivable', id, newOwner);
    res.json({ success: true, data: result, message: '账款转让成功' });
  } catch (err) {
    console.error('[API Error] transfer:', err.message);
    next(err.statusCode ? err : new ApiError(500, err.message));
  }
};

/**
 * POST /api/receivables/:id/finance - 申请融资
 * 请求体：{ financeAmount, bankName?, operator? }
 */
const apply = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { financeAmount } = req.body;
    if (!id || !financeAmount) throw new ApiError(400, '参数缺失：需要 id, financeAmount');
    console.log(`[API] 申请融资: ${id}, 金额: ${financeAmount}`);
    const result = await submitTransaction('applyFinancing', id, String(financeAmount));
    res.json({ success: true, data: result, message: '融资申请已提交' });
  } catch (err) {
    console.error('[API Error] apply:', err.message);
    next(err.statusCode ? err : new ApiError(500, err.message));
  }
};

/**
 * POST /api/receivables/:id/approve - 银行审批
 * 请求体：{ approved, operator? }
 */
const approve = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { approved } = req.body;
    if (!id || approved === undefined) {
      throw new ApiError(400, '参数缺失：需要 id, approved');
    }
    console.log(`[API] 银行审批: ${id}, 审批结果: ${approved}`);
    const result = await submitTransaction(
      'approveFinancing',
      id,
      String(approved)
    );
    const msg = approved === 'true' || approved === true ? '融资已批准，账款已结清' : '融资已拒绝';
    res.json({ success: true, data: result, message: msg });
  } catch (err) {
    console.error('[API Error] approve:', err.message);
    next(err.statusCode ? err : new ApiError(500, err.message));
  }
};

/**
 * GET /api/receivables/:id/history - 历史溯源
 */
const history = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) throw new ApiError(400, '参数缺失：id');
    console.log(`[API] 查询历史记录: ${id}`);
    const result = await evaluateTransaction('getHistoryForReceivable', id);
    const rawData = Array.isArray(result) ? result : (result?.history || []);
    const data = mapHistoryToFrontend(rawData);
    res.json({ success: true, data, message: '查询成功' });
  } catch (err) {
    console.error('[API Error] history:', err.message);
    next(err.statusCode ? err : new ApiError(500, err.message));
  }
};

module.exports = {
  queryAll,
  create,
  confirm,
  transfer,
  apply,
  approve,
  history
};