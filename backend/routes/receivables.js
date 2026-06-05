const express = require('express');
const router = express.Router();
const receivableController = require('../controllers/receivableController');

// 获取所有应收账款
router.get('/', receivableController.getAllReceivables);

// 根据ID获取应收账款
router.get('/:id', receivableController.getReceivableById);

// 创建应收账款
router.post('/', receivableController.createReceivable);

// 确权应收账款
router.post('/:id/confirm', receivableController.confirmReceivable);

// 转让应收账款
router.post('/:id/transfer', receivableController.transferReceivable);

// 申请融资
router.post('/:id/finance', receivableController.applyFinance);

// 银行审批融资
router.post('/:id/approve', receivableController.approveFinance);

// 获取应收账款历史记录
router.get('/:id/history', receivableController.getReceivableHistory);

module.exports = router;