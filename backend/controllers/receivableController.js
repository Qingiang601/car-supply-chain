const client = require('../config/fabric');

exports.getAllReceivables = async (req, res) => {
  try {
    const data = await client.query('QueryAll');
    res.json({ code: 200, data });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
};

exports.getReceivableById = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await client.query('QueryByID', id);
    if (!data) return res.status(404).json({ code: 404, message: '数据不存在' });
    res.json({ code: 200, data });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
};

exports.createReceivable = async (req, res) => {
  try {
    const data = await client.invoke('CreateReceivable', req.body);
    res.json({ code: 200, data });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
};

exports.confirmReceivable = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await client.invoke('ConfirmReceivable', id);
    res.json({ code: 200, data });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
};

exports.transferReceivable = async (req, res) => {
  try {
    const { id } = req.params;
    const { newOwner } = req.body;
    const data = await client.invoke('TransferReceivable', id, newOwner);
    res.json({ code: 200, data });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
};

exports.applyFinance = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await client.invoke('ApplyFinance', id);
    res.json({ code: 200, data });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
};

exports.approveFinance = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await client.invoke('ApproveFinance', id);
    res.json({ code: 200, data });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
};

exports.getHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await client.query('GetHistory', id);
    res.json({ code: 200, data });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
};