require('dotenv').config();
const express = require('express');
const cors = require('cors');
const receivableController = require('./controllers/receivableController');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/api/receivables', receivableController.getAllReceivables);
app.get('/api/receivables/:id', receivableController.getReceivableById);
app.post('/api/receivables', receivableController.createReceivable);
app.put('/api/receivables/:id/confirm', receivableController.confirmReceivable);
app.put('/api/receivables/:id/transfer', receivableController.transferReceivable);
app.put('/api/receivables/:id/finance', receivableController.applyFinance);
app.put('/api/receivables/:id/approve', receivableController.approveFinance);
app.get('/api/receivables/:id/history', receivableController.getHistory);

app.listen(PORT, () => {
  console.log(`后端服务已启动，运行在 http://localhost:${PORT}`);
  console.log(`当前运行模式：${process.env.BACKEND_MODE}`);
});