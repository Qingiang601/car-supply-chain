'use strict';

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// 中间件
app.use(cors());
app.use(express.json());

// API 路由
const receivableController = require('./controllers/receivableController');

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: '区块链汽车供应链平台后端服务运行正常' });
});

// 查询所有账款
app.get('/api/receivables', receivableController.queryAll);

// 创建账款
app.post('/api/receivables', receivableController.create);

// 确权
app.post('/api/receivables/:id/confirm', receivableController.confirm);

// 转让
app.post('/api/receivables/:id/transfer', receivableController.transfer);

// 申请融资
app.post('/api/receivables/:id/finance', receivableController.apply);

// 银行审批
app.post('/api/receivables/:id/approve', receivableController.approve);

// 历史溯源
app.get('/api/receivables/:id/history', receivableController.history);

// 通用错误处理中间件
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.stack);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || '服务器内部错误',
    error: err.details || err.toString()
  });
});

// 优雅关闭处理
process.on('SIGINT', async () => {
  console.log('\n收到 SIGINT 信号，正在关闭服务器...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n收到 SIGTERM 信号，正在关闭服务器...');
  process.exit(0);
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 区块链汽车供应链平台后端服务启动成功`);
  console.log(`📍 地址: http://localhost:${PORT}`);
  console.log(`💊 健康检查: http://localhost:${PORT}/api/health`);
});

module.exports = app;