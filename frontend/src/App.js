import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

// 状态颜色映射
const statusColors = {
  '未确权': '#f59e0b',
  '已确权': '#10b981',
  '已转让': '#3b82f6',
  '已融资': '#8b5cf6',
  '已结清': '#06b6d4'
};

// 模拟初始数据
const initialData = [
  { id: 'REC-001', supplierName: '上海汽车零部件有限公司', buyerName: '上海大众汽车有限公司', amount: 500000.00, dueDate: '2024-12-31', invoiceNo: 'INV-2024-001', goodsName: '汽车发动机配件', status: '未确权', createdAt: '2024-01-15T10:00:00Z', lastUpdated: '2024-01-15T10:00:00Z' },
  { id: 'REC-002', supplierName: '浙江轮胎制造有限公司', buyerName: '吉利汽车集团', amount: 320000.00, dueDate: '2024-11-30', invoiceNo: 'INV-2024-002', goodsName: '汽车轮胎', status: '已确权', createdAt: '2024-01-10T09:30:00Z', lastUpdated: '2024-01-12T14:00:00Z' },
  { id: 'REC-003', supplierName: '广州汽车电子科技有限公司', buyerName: '广汽本田', amount: 180000.00, dueDate: '2024-10-15', invoiceNo: 'INV-2024-003', goodsName: '车载导航系统', status: '已转让', createdAt: '2024-01-08T11:00:00Z', lastUpdated: '2024-01-14T16:30:00Z', newOwner: '广州供应链金融公司' },
  { id: 'REC-004', supplierName: '武汉汽车内饰有限公司', buyerName: '东风汽车集团', amount: 450000.00, dueDate: '2024-09-30', invoiceNo: 'INV-2024-004', goodsName: '汽车座椅', status: '已融资', createdAt: '2024-01-05T08:00:00Z', lastUpdated: '2024-01-16T10:00:00Z', newOwner: '武汉金融服务公司', financeAmount: 380000, bankName: '工商银行武汉分行' },
  { id: 'REC-005', supplierName: '成都汽车零部件公司', buyerName: '一汽大众成都工厂', amount: 280000.00, dueDate: '2024-08-15', invoiceNo: 'INV-2024-005', goodsName: '汽车刹车片', status: '已结清', createdAt: '2023-12-20T13:00:00Z', lastUpdated: '2024-01-10T09:00:00Z', newOwner: '成都金融投资公司', financeAmount: 240000, bankName: '建设银行成都分行' }
];

function App() {
  const [receivables, setReceivables] = useState([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedReceivable, setSelectedReceivable] = useState(null);
  const [historyRecords, setHistoryRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 表单状态
  const [formData, setFormData] = useState({
    supplierName: '', buyerName: '', amount: '', dueDate: '', invoiceNo: '', goodsName: ''
  });

  // 操作相关状态（按 id 独立）
  const [confirmOperatorMap, setConfirmOperatorMap] = useState({});
  const [transferDataMap, setTransferDataMap] = useState({});
  const [financeDataMap, setFinanceDataMap] = useState({});
  const [approveDataMap, setApproveDataMap] = useState({});

  // 侧边栏导航：'list' | 'create' | 'chart'
  const [currentPage, setCurrentPage] = useState('list');

  // 禁止页面缩放（动态添加 meta 标签）
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'viewport';
    meta.content = 'width=device-width, initial-scale=1.0, user-scalable=no';
    document.head.appendChild(meta);
    return () => {
      document.head.removeChild(meta);
    };
  }, []);

  useEffect(() => {
    loadReceivables();
  }, []);

  const loadReceivables = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/receivables');
      const list = response.data?.data || [];
      setReceivables(list.length > 0 ? list : initialData);
      setError('');
    } catch (err) {
      console.error('加载数据失败:', err);
      setReceivables(initialData);
      setError('加载数据失败，使用本地数据');
    } finally {
      setLoading(false);
    }
  };

  // 创建应收账款
  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await axios.post('/api/receivables', formData);
      setFormData({ supplierName: '', buyerName: '', amount: '', dueDate: '', invoiceNo: '', goodsName: '' });
      loadReceivables();
      setCurrentPage('list');
    } catch (err) {
      setError('创建失败: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  // 确权
  const handleConfirm = async (id) => {
    const operator = confirmOperatorMap[id];
    if (!operator) { setError('请输入操作人'); return; }
    try {
      setLoading(true);
      await axios.post(`/api/receivables/${id}/confirm`, { operator });
      loadReceivables();
      setConfirmOperatorMap(prev => ({ ...prev, [id]: '' }));
    } catch (err) {
      setError('确权失败: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  // 转让
  const handleTransfer = async (id) => {
    const transferData = transferDataMap[id];
    if (!transferData || !transferData.newOwner) { setError('请输入新持有人'); return; }
    try {
      setLoading(true);
      await axios.post(`/api/receivables/${id}/transfer`, transferData);
      loadReceivables();
      setTransferDataMap(prev => ({ ...prev, [id]: { newOwner: '', operator: '' } }));
    } catch (err) {
      setError('转让失败: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  // 申请融资
  const handleApplyFinance = async (id) => {
    const financeData = financeDataMap[id];
    if (!financeData || !financeData.financeAmount || !financeData.bankName) { setError('请填写完整融资信息'); return; }
    try {
      setLoading(true);
      await axios.post(`/api/receivables/${id}/finance`, financeData);
      loadReceivables();
      setFinanceDataMap(prev => ({ ...prev, [id]: { financeAmount: '', bankName: '', operator: '' } }));
    } catch (err) {
      setError('申请融资失败: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  // 银行审批
  const handleApproveFinance = async (id, approved) => {
    const approveData = approveDataMap[id];
    if (!approveData || !approveData.operator) { setError('请输入审批人'); return; }
    try {
      setLoading(true);
      await axios.post(`/api/receivables/${id}/approve`, { ...approveData, approved });
      loadReceivables();
      setApproveDataMap(prev => ({ ...prev, [id]: { operator: '' } }));
    } catch (err) {
      setError('审批失败: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  // 获取历史记录
  const handleGetHistory = async (receivable) => {
    setSelectedReceivable(receivable);
    try {
      setLoading(true);
      const response = await axios.get(`/api/receivables/${receivable.id}/history`);
      setHistoryRecords(response.data?.data || []);
    } catch (err) {
      setHistoryRecords([
        { id: 1, receivableId: receivable.id, transactionHash: '0x7a3f2d1e9b8c4a6e', timestamp: receivable.createdAt, action: '创建账款', status: receivable.status, operator: receivable.supplierName },
        { id: 2, receivableId: receivable.id, transactionHash: '0x5c8d9e2f3a1b7c4d', timestamp: receivable.lastUpdated, action: '状态变更', status: receivable.status, operator: '系统' }
      ]);
    } finally {
      setShowHistoryModal(true);
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('zh-CN');
  };

  const formatAmount = (amount) => {
    return amount.toLocaleString('zh-CN', { style: 'currency', currency: 'CNY' });
  };

  // 汇总数据：个数
  const totalCount = receivables.length;
  const confirmedCount = receivables.filter(r => r.status === '已确权').length;
  const financedCount = receivables.filter(r => r.status === '已融资').length;

  // 图表数据（金额分布）
  const chartData = [
    { name: '未确权', 金额: receivables.filter(r => r.status === '未确权').reduce((sum, r) => sum + r.amount, 0), color: '#f59e0b' },
    { name: '已确权', 金额: receivables.filter(r => r.status === '已确权').reduce((sum, r) => sum + r.amount, 0), color: '#10b981' },
    { name: '已转让', 金额: receivables.filter(r => r.status === '已转让').reduce((sum, r) => sum + r.amount, 0), color: '#3b82f6' },
    { name: '已融资', 金额: receivables.filter(r => r.status === '已融资').reduce((sum, r) => sum + r.amount, 0), color: '#8b5cf6' },
    { name: '已结清', 金额: receivables.filter(r => r.status === '已结清').reduce((sum, r) => sum + r.amount, 0), color: '#06b6d4' }
  ];

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>🚗 区块链汽车供应链平台</h1>
        <p style={styles.subtitle}>应收账款管理系统</p>
      </header>

      {error && (
        <div style={styles.errorBox}>
          {error}
          <button style={styles.closeBtn} onClick={() => setError('')}>×</button>
        </div>
      )}

      {/* 汇总卡片 (个数) */}
      <div style={styles.summaryContainer}>
        <div style={styles.summaryCard}>
          <div style={styles.summaryTitle}>应收账款总数</div>
          <div style={styles.summaryValue}>{totalCount} 个</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryTitle}>已确权汇总</div>
          <div style={styles.summaryValue}>{confirmedCount} 个</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryTitle}>已融资汇总</div>
          <div style={styles.summaryValue}>{financedCount} 个</div>
        </div>
      </div>

      {/* 主体：侧边栏 + 内容 */}
      <div style={styles.mainContent}>
        <aside style={styles.sidebar}>
          <nav style={styles.sidebarNav}>
            <div
              style={{ ...styles.sidebarItem, ...(currentPage === 'list' ? styles.sidebarItemActive : {}) }}
              onClick={() => setCurrentPage('list')}
            >
              <span style={styles.sidebarIcon}>📋</span><span>收款列表</span>
            </div>
            <div
              style={{ ...styles.sidebarItem, ...(currentPage === 'create' ? styles.sidebarItemActive : {}) }}
              onClick={() => setCurrentPage('create')}
            >
              <span style={styles.sidebarIcon}>➕</span><span>创建收款</span>
            </div>
            <div
              style={{ ...styles.sidebarItem, ...(currentPage === 'chart' ? styles.sidebarItemActive : {}) }}
              onClick={() => setCurrentPage('chart')}
            >
              <span style={styles.sidebarIcon}>📊</span><span>各状态应收账款金额分布</span>
            </div>
          </nav>
          <div style={styles.sidebarFooter}>
            <button style={styles.refreshSidebarBtn} onClick={loadReceivables} disabled={loading}>
              {loading ? '⏳ 加载中...' : '🔄 刷新数据'}
            </button>
          </div>
        </aside>

        <main style={styles.contentArea}>
          {/* 列表页 */}
          {currentPage === 'list' && (
            <>
              <div style={styles.pageHeader}>
                <h2 style={styles.pageTitle}>📋 收款列表</h2>
                <span style={styles.recordCount}>共 {receivables.length} 条记录</span>
              </div>
              <div style={styles.tableContainer}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.tableHeader}>
                      <th>编号</th><th>供应商</th><th>采购商</th><th>金额</th><th>到期日期</th><th>货物名称</th><th>状态</th><th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receivables.map((receivable) => (
                      <tr key={receivable.id} style={styles.tableRow}>
                        <td style={styles.cell}>{receivable.id}</td>
                        <td style={styles.cell}>{receivable.supplierName}</td>
                        <td style={styles.cell}>{receivable.buyerName}</td>
                        <td style={styles.cell}>{formatAmount(receivable.amount)}</td>
                        <td style={styles.cell}>{receivable.dueDate}</td>
                        <td style={styles.cell}>{receivable.goodsName || '-'}</td>
                        <td style={styles.cell}>
                          <span style={{
                            display: 'inline-block',
                            padding: '4px 12px',
                            borderRadius: '20px',
                            backgroundColor: `${statusColors[receivable.status]}20`,
                            color: statusColors[receivable.status] || '#6b7280',
                            fontWeight: 'bold',
                            fontSize: '12px'
                          }}>{receivable.status}</span>
                        </td>
                        <td style={styles.actionCell}>
                          <div style={styles.actionButtons}>
                            {receivable.status === '未确权' && (
                              <>
                                <input type="text" style={styles.smallInput} placeholder="操作人"
                                  value={confirmOperatorMap[receivable.id] || ''}
                                  onChange={(e) => setConfirmOperatorMap(prev => ({ ...prev, [receivable.id]: e.target.value }))} />
                                <button style={{ ...styles.btn, ...styles.confirmBtn }} onClick={() => handleConfirm(receivable.id)}>✅ 确权</button>
                              </>
                            )}
                            {receivable.status === '已确权' && (
                              <>
                                <input type="text" style={styles.smallInput} placeholder="新持有人"
                                  value={transferDataMap[receivable.id]?.newOwner || ''}
                                  onChange={(e) => setTransferDataMap(prev => ({ ...prev, [receivable.id]: { ...prev[receivable.id], newOwner: e.target.value, operator: '' } }))} />
                                <button style={{ ...styles.btn, ...styles.transferBtn }} onClick={() => handleTransfer(receivable.id)}>🔄 转让</button>
                                <div style={styles.smallInputGroup}>
                                  <input type="number" style={styles.smallInput} placeholder="融资金额"
                                    value={financeDataMap[receivable.id]?.financeAmount || ''}
                                    onChange={(e) => setFinanceDataMap(prev => ({ ...prev, [receivable.id]: { ...prev[receivable.id], financeAmount: e.target.value, bankName: prev[receivable.id]?.bankName || '', operator: '' } }))} />
                                  <input type="text" style={styles.smallInput} placeholder="银行名称"
                                    value={financeDataMap[receivable.id]?.bankName || ''}
                                    onChange={(e) => setFinanceDataMap(prev => ({ ...prev, [receivable.id]: { ...prev[receivable.id], bankName: e.target.value, financeAmount: prev[receivable.id]?.financeAmount || '', operator: '' } }))} />
                                </div>
                                <button style={{ ...styles.btn, ...styles.financeBtn }} onClick={() => handleApplyFinance(receivable.id)}>💰 申请融资</button>
                              </>
                            )}
                            {receivable.status === '已转让' && (
                              <>
                                <div style={styles.smallInputGroup}>
                                  <input type="number" style={styles.smallInput} placeholder="融资金额"
                                    value={financeDataMap[receivable.id]?.financeAmount || ''}
                                    onChange={(e) => setFinanceDataMap(prev => ({ ...prev, [receivable.id]: { ...prev[receivable.id], financeAmount: e.target.value, bankName: prev[receivable.id]?.bankName || '', operator: '' } }))} />
                                  <input type="text" style={styles.smallInput} placeholder="银行名称"
                                    value={financeDataMap[receivable.id]?.bankName || ''}
                                    onChange={(e) => setFinanceDataMap(prev => ({ ...prev, [receivable.id]: { ...prev[receivable.id], bankName: e.target.value, financeAmount: prev[receivable.id]?.financeAmount || '', operator: '' } }))} />
                                </div>
                                <button style={{ ...styles.btn, ...styles.financeBtn }} onClick={() => handleApplyFinance(receivable.id)}>💰 申请融资</button>
                              </>
                            )}
                            {receivable.status === '已融资' && (
                              <>
                                <input type="text" style={styles.smallInput} placeholder="审批人"
                                  value={approveDataMap[receivable.id]?.operator || ''}
                                  onChange={(e) => setApproveDataMap(prev => ({ ...prev, [receivable.id]: { operator: e.target.value } }))} />
                                <button style={{ ...styles.btn, ...styles.approveBtn }} onClick={() => handleApproveFinance(receivable.id, true)}>✓ 通过</button>
                                <button style={{ ...styles.btn, ...styles.rejectBtn }} onClick={() => handleApproveFinance(receivable.id, false)}>✗ 拒绝</button>
                              </>
                            )}
                            {receivable.status === '已结清' && <span style={styles.noAction}>流程已结束</span>}
                            <button style={{ ...styles.btn, ...styles.historyBtn }} onClick={() => handleGetHistory(receivable)}>📜 历史</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* 创建页 */}
          {currentPage === 'create' && (
            <div style={styles.formContainer}>
              <h2 style={styles.pageTitle}>➕ 创建应收账款</h2>
              <form onSubmit={handleCreate} style={styles.form}>
                <div style={styles.formGroup}><label style={styles.label}>供应商名称 *</label><input type="text" style={styles.input} value={formData.supplierName} onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })} required /></div>
                <div style={styles.formGroup}><label style={styles.label}>采购商名称 *</label><input type="text" style={styles.input} value={formData.buyerName} onChange={(e) => setFormData({ ...formData, buyerName: e.target.value })} required /></div>
                <div style={styles.formGroup}><label style={styles.label}>金额 *</label><input type="number" step="0.01" style={styles.input} value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} required /></div>
                <div style={styles.formGroup}><label style={styles.label}>到期日期 *</label><input type="date" style={styles.input} value={formData.dueDate} onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })} required /></div>
                <div style={styles.formGroup}><label style={styles.label}>发票号 *</label><input type="text" style={styles.input} value={formData.invoiceNo} onChange={(e) => setFormData({ ...formData, invoiceNo: e.target.value })} required /></div>
                <div style={styles.formGroup}><label style={styles.label}>货物名称 *</label><input type="text" style={styles.input} value={formData.goodsName} onChange={(e) => setFormData({ ...formData, goodsName: e.target.value })} required /></div>
                <div style={styles.formActions}>
                  <button type="button" style={styles.cancelBtn} onClick={() => setCurrentPage('list')}>取消</button>
                  <button type="submit" style={styles.submitBtn} disabled={loading}>创建</button>
                </div>
              </form>
            </div>
          )}

          {/* 图表页 */}
          {currentPage === 'chart' && (
            <div style={styles.chartContainer}>
              <h3 style={styles.chartTitle}>各状态应收账款金额分布</h3>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => `¥ ${value.toLocaleString()}`} />
                  <Legend />
                  <Bar dataKey="金额">
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </main>
      </div>

      {/* 历史弹窗 */}
      {showHistoryModal && selectedReceivable && (
        <div style={styles.modalOverlay} onClick={() => setShowHistoryModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>📜 历史溯源</h2>
            <div style={styles.receivableInfo}>
              <p><strong>账款编号:</strong> {selectedReceivable.id}</p>
              <p><strong>供应商:</strong> {selectedReceivable.supplierName}</p>
              <p><strong>采购商:</strong> {selectedReceivable.buyerName}</p>
              <p><strong>当前状态:</strong> <span style={{ color: statusColors[selectedReceivable.status] || '#6b7280', fontWeight: 'bold' }}>{selectedReceivable.status}</span></p>
            </div>
            <table style={styles.historyTable}>
              <thead><tr><th>交易哈希</th><th>时间戳</th><th>操作</th><th>状态变更</th><th>操作人</th></tr></thead>
              <tbody>
                {historyRecords.map((record) => (
                  <tr key={record.id} style={styles.historyRow}>
                    <td style={styles.hashCell}>{record.transactionHash}</td>
                    <td>{formatDate(record.timestamp)}</td>
                    <td>{record.action}</td>
                    <td><span style={{ color: statusColors[record.status] || '#6b7280', fontWeight: 'bold' }}>{record.status}</span></td>
                    <td>{record.operator}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button style={styles.closeModalBtn} onClick={() => setShowHistoryModal(false)}>关闭</button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '20px' },
  header: { textAlign: 'center', color: 'white', marginBottom: '30px' },
  title: { fontSize: '32px', margin: '0 0 10px 0', textShadow: '2px 2px 4px rgba(0,0,0,0.3)' },
  subtitle: { fontSize: '16px', opacity: '0.9' },
  errorBox: { background: '#ef4444', color: 'white', padding: '12px 20px', borderRadius: '8px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  closeBtn: { background: 'none', border: 'none', color: 'white', fontSize: '24px', cursor: 'pointer', padding: '0', lineHeight: '1' },
  summaryContainer: { display: 'flex', gap: '20px', marginBottom: '30px', flexWrap: 'wrap', justifyContent: 'center' },
  summaryCard: { background: 'white', borderRadius: '16px', padding: '20px 30px', textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', minWidth: '180px' },
  summaryTitle: { fontSize: '14px', color: '#6b7280', marginBottom: '8px' },
  summaryValue: { fontSize: '28px', fontWeight: 'bold', color: '#1f2937' },
  mainContent: { display: 'flex', gap: '20px', alignItems: 'stretch' },
  sidebar: {
    width: '220px',
    background: 'white',
    borderRadius: '12px',
    padding: '20px 0',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between'
  },
  sidebarNav: { flex: 1 },
  sidebarItem: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 20px', cursor: 'pointer', transition: 'background 0.2s', color: '#374151', fontSize: '14px', fontWeight: '500' },
  sidebarItemActive: { background: '#667eea20', color: '#667eea', borderRight: '3px solid #667eea' },
  sidebarIcon: { fontSize: '18px' },
  sidebarFooter: { padding: '20px', borderTop: '1px solid #e5e7eb' },
  refreshSidebarBtn: { width: '100%', padding: '8px', background: '#667eea', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' },
  contentArea: {
    flex: 1,
    background: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    height: 'calc(100vh - 280px)',   // 动态高度，减去头部和卡片区域
    minHeight: '500px',              // 保证至少500px
    overflowY: 'auto'
},
  pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  pageTitle: { fontSize: '20px', margin: 0, color: '#1f2937' },
  recordCount: { fontSize: '14px', color: '#6b7280' },
  tableContainer: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  tableHeader: { background: '#f3f4f6', color: '#374151', fontWeight: '600' },
  tableRow: { borderBottom: '1px solid #e5e7eb' },
  cell: { padding: '12px 8px', textAlign: 'left' },
  actionCell: { padding: '8px', textAlign: 'center' },
  actionButtons: { display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' },
  smallInputGroup: { display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'center' },
  smallInput: { padding: '4px 6px', fontSize: '11px', border: '1px solid #ccc', borderRadius: '4px', width: '80px' },
  btn: { padding: '4px 8px', fontSize: '11px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' },
  confirmBtn: { background: '#10b981', color: 'white' },
  transferBtn: { background: '#3b82f6', color: 'white' },
  financeBtn: { background: '#f59e0b', color: 'white' },
  approveBtn: { background: '#10b981', color: 'white' },
  rejectBtn: { background: '#ef4444', color: 'white' },
  historyBtn: { background: '#6b7280', color: 'white' },
  noAction: { fontSize: '11px', color: '#9ca3af', fontStyle: 'italic' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modal: { background: 'white', borderRadius: '12px', padding: '20px', width: '90%', maxWidth: '800px', maxHeight: '80vh', overflowY: 'auto' },
  modalTitle: { margin: '0 0 16px 0', fontSize: '20px' },
  receivableInfo: { background: '#f9fafb', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' },
  historyTable: { width: '100%', borderCollapse: 'collapse', fontSize: '12px' },
  historyRow: { borderBottom: '1px solid #e5e7eb' },
  hashCell: { fontFamily: 'monospace', fontSize: '10px', color: '#6b7280' },
  closeModalBtn: { width: '100%', padding: '10px', marginTop: '16px', background: '#6b7280', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' },
  formContainer: { padding: '20px' },
  form: { display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '500px', margin: '0 auto' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontWeight: 'bold', fontSize: '14px', color: '#374151' },
  input: { padding: '10px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' },
  formActions: { display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' },
  cancelBtn: { padding: '8px 16px', background: '#e5e7eb', border: 'none', borderRadius: '8px', cursor: 'pointer' },
  submitBtn: { padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' },
  chartContainer: { padding: '10px', background: 'white', borderRadius: '12px', height: '100%' },
  chartTitle: { fontSize: '20px', marginBottom: '20px', color: '#1f2937' }
};

export default App;