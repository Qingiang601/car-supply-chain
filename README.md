# 🚗 区块链汽车供应链平台

基于 Hyperledger Fabric 的区块链汽车供应链应收账款管理平台

## 📋 功能特性

- **账款列表展示**：显示全部应收账款，带状态颜色标签
- **创建账款**：填写表单创建新的应收账款记录
- **确权操作**：采购商确认应收账款
- **转让操作**：供应商转让应收账款
- **融资申请**：基于应收账款申请融资
- **银行审批**：银行审批融资申请
- **历史溯源**：查看账款的全部交易记录和状态变更

## 📊 状态流转

```
未确权 → 已确权 → 已转让 → 融资申请中 → 已融资/融资失败
```

## 🛠️ 技术栈

### 前端
- React 18
- Axios（HTTP请求）
- Inline Styles（样式）

### 后端
- Node.js / Express
- Hyperledger Fabric Gateway SDK
- CORS 跨域支持

### 区块链
- Hyperledger Fabric 2.5
- CouchDB 状态数据库

## 📁 项目结构

```
区块链汽车平台/
├── backend/                    # 后端服务
│   ├── controllers/           # 控制器
│   │   └── receivableController.js
│   ├── routes/                # 路由
│   │   └── receivables.js
│   ├── connection.json        # Fabric连接配置
│   ├── .env                   # 环境变量
│   ├── package.json
│   └── server.js              # 主入口
├── frontend/                  # 前端应用
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── App.js            # 主组件
│   │   └── index.js
│   └── package.json
├── docker-compose.yaml        # Docker部署配置
├── start.sh                   # 启动脚本
└── README.md
```

## 🚀 快速开始

### 1. 环境要求

- Docker >= 20.10
- Docker Compose >= 2.0
- Node.js >= 16.0
- npm >= 8.0

### 2. 启动区块链网络

```bash
# 赋予启动脚本执行权限
chmod +x start.sh

# 启动区块链网络
./start.sh
```

### 3. 安装依赖

```bash
# 安装后端依赖
cd backend
npm install

# 安装前端依赖
cd ../frontend
npm install
```

### 4. 启动服务

```bash
# 启动后端服务（终端1）
cd backend
npm start

# 启动前端应用（终端2）
cd frontend
npm start
```

### 5. 访问应用

打开浏览器访问：http://localhost:3000

## 🔌 API 接口

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/receivables | 获取所有应收账款 |
| GET | /api/receivables/:id | 获取单个应收账款 |
| POST | /api/receivables | 创建应收账款 |
| POST | /api/receivables/:id/confirm | 确权应收账款 |
| POST | /api/receivables/:id/transfer | 转让应收账款 |
| POST | /api/receivables/:id/finance | 申请融资 |
| POST | /api/receivables/:id/approve | 银行审批 |
| GET | /api/receivables/:id/history | 获取历史记录 |

## 📝 状态说明

| 状态 | 颜色 | 说明 |
|------|------|------|
| 未确权 | 橙色 | 供应商已创建，等待采购商确认 |
| 已确权 | 绿色 | 采购商已确认账款有效 |
| 已转让 | 蓝色 | 账款已转让给金融机构 |
| 融资申请中 | 紫色 | 等待银行审批融资申请 |
| 已融资 | 青色 | 银行已批准融资 |
| 融资失败 | 红色 | 银行拒绝融资申请 |

## 📄 表单字段

### 创建账款
- **供应商名称**（必填）：应收账款的收款方
- **采购商名称**（必填）：应收账款的付款方
- **金额**（必填）：账款金额
- **到期日期**（必填）：账款到期日
- **发票编号**（选填）：对应的发票号码
- **货物名称**（选填）：交易的货物名称

### 转让操作
- **新持有人**：账款转让后的持有者

### 融资申请
- **融资金额**：申请的融资额度
- **银行名称**：申请融资的银行

## 🔧 开发模式

```bash
# 后端开发模式（自动重启）
cd backend
npm run dev

# 前端开发模式（热更新）
cd frontend
npm start
```

## 📦 生产构建

```bash
# 构建前端
cd frontend
npm run build

# 启动后端生产服务
cd backend
npm start
```

## 📌 注意事项

1. **Fabric网络配置**：默认使用模拟数据，如需连接真实Fabric网络，请配置 `connection.json` 和钱包
2. **端口冲突**：请确保7050、7051、9051、5984、6984端口未被占用
3. **CORS配置**：前端已配置代理，开发环境无需额外配置

## 📄 License

MIT License