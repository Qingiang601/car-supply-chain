# 区块链汽车供应链平台

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Fabric](https://img.shields.io/badge/Hyperledger%20Fabric-2.5-orange)](https://hyperledger-fabric.readthedocs.io/)
[![React](https://img.shields.io/badge/React-18-blue)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18-green)](https://nodejs.org/)

基于 **Hyperledger Fabric** 的汽车行业供应链金融平台，实现应收账款的透明化、可追溯管理。  
本仓库为区块链课程小组作业项目。

---

## 🚀 项目概述

本平台允许**供应商**、**采购商**和**金融机构**协作管理发票、确权、转让债权、申请融资，并在不可篡改的账本上跟踪应收账款的全生命周期。

主要功能：

- ✅ **创建**应收账款
- ✅ **确权**（采购商确认）
- ✅ **转让**债权给第三方
- ✅ **申请融资**（供应商/新持有人）
- ✅ **审批融资**（银行）
- ✅ **溯源**每笔应收账款的完整历史
- ✅ **仪表盘**：汇总卡片 + 各状态金额分布柱状图

---

## 🧱 系统架构

```text
+-------------+       REST API       +-------------+       gRPC       +-------------------+
|   React     | <------------------> |  Node.js    | <--------------> | Hyperledger Fabric|
|   前端      |                       |  后端       |                   | (排序节点, 对等节点,|
+-------------+                       +-------------+                   |  CouchDB)         |
                                             |                          +-------------------+
                                             | (可选模拟模式)     
                                             v                          
                                      +-------------+                  
                                      |  data.json  |                  
                                      +-------------+                  
```

- **前端**：React 18 + Recharts + Axios  
- **后端**：Node.js 18 + Express + Fabric Gateway SDK  
- **区块链**：Hyperledger Fabric 2.5 (etcdraft 共识) + CouchDB 状态数据库  
- **持久化**：模拟模式使用本地 `data.json`，生产模式使用账本

---

## 📦 技术栈

| 层         | 技术                                                               |
|------------|--------------------------------------------------------------------|
| 区块链     | Hyperledger Fabric 2.5, Go 链码, CouchDB, Docker Compose          |
| 后端       | Node.js, Express, @hyperledger/fabric-gateway, nodemon            |
| 前端       | React, Recharts, Axios, CSS-in-JS                                 |
| 部署       | VMware Ubuntu 22.04, Docker, systemd, shell 脚本                  |
| 协作       | GitHub, Git                                                       |

---

## 🛠️ 安装与运行

### 环境要求

- **Windows / Linux / macOS**（开发在 Windows + VMware Ubuntu）
- **Docker** 和 **Docker Compose**（用于 Fabric 网络）
- **Node.js** (v18) 和 **npm**
- **Git**

### 步骤

#### 1. 克隆仓库
```bash
git clone https://github.com/你的组织名/仓库名.git
cd 仓库名
```

#### 2. 启动 Fabric 网络（在 Ubuntu 虚拟机中）
```bash
cd /path/to/project
docker compose up -d
```

> 项目已包含预生成的 `organizations/` 证书目录。如果缺失，请运行 `cryptogen generate` 和 `configtxgen`（参考 [文档](./docs/fabric-setup.md)）。

#### 3. 安装后端依赖并运行
```bash
cd backend
npm install
npm start
```

后端启动在 `http://localhost:5000`。

#### 4. 安装前端依赖并运行
```bash
cd ../frontend
npm install
npm start
```

前端启动在 `http://localhost:3000`。

#### 5. 访问应用
浏览器打开 `http://localhost:3000`（如在虚拟机中运行，则使用 `http://虚拟机IP:3000`）。

---

## 📚 后端 API 接口

| 方法 | 端点                              | 说明             | 链码方法              |
|------|-----------------------------------|------------------|-----------------------|
| GET  | `/api/receivables`                | 查询所有账款     | `QueryAll`            |
| POST | `/api/receivables`                | 创建账款         | `CreateReceivable`    |
| POST | `/api/receivables/:id/confirm`    | 确权             | `ConfirmReceivable`   |
| POST | `/api/receivables/:id/transfer`   | 转让债权         | `TransferReceivable`  |
| POST | `/api/receivables/:id/finance`    | 申请融资         | `ApplyFinance`        |
| POST | `/api/receivables/:id/approve`    | 审批融资         | `ApproveFinance`      |
| GET  | `/api/receivables/:id/history`    | 获取历史记录     | `GetHistory`          |

> **模拟模式**：当 Fabric 不可用时，在 `.env` 中设置 `USE_MOCK=true`，后端将读写 `data.json` 文件。

---

## 🎨 前端界面预览

- **仪表盘**：三个汇总卡片（应收账款总数、已确权个数、已融资个数）
- **柱状图**：各状态应收账款金额分布（未确权、已确权、已转让、已融资、已结清）
- **侧边栏导航**：收款列表、创建收款、各状态金额分布
- **收款列表**：完整表格 + 状态标签 + 动态操作按钮（依状态显示不同按钮）
- **创建表单**：新增发票
- **历史弹窗**：查看应收账款的区块链交易历史

---

## 👥 团队分工

| 角色                     | 成员   | 主要职责                                                       |
|--------------------------|--------|----------------------------------------------------------------|
| **组长 / 区块链负责人**  | 你     | Fabric 网络搭建、链码开发、项目协调                            |
| **后端开发**             | 组员B  | Express 服务器、Fabric Gateway 集成、全部 API 端点              |
| **前端开发（核心）**     | 组员C  | React 核心组件、状态管理、API 集成                              |
| **前端样式与图表**       | 组员D  | CSS 布局、响应式设计、Recharts 图表集成                         |
| **链码测试 & 历史接口**  | 组员A  | 链码单元测试、`/api/history` 接口实现                           |
| **运维与部署**           | 组员E  | VMware 环境配置、Docker 脚本、共享文件夹自动挂载、自动化脚本    |
| **测试与质量保证**       | 组员F  | 单元/集成测试、Bug 跟踪、手工端到端验证                          |
| **文档与答辩**           | 组员G  | 架构图、API 文档、用户手册、PPT 制作                             |

---

## 📁 项目结构

```text
.
├── backend/
│   ├── config/
│   │   └── fabric.js            # Fabric 连接配置
│   ├── controllers/
│   │   └── receivableController.js
│   ├── server.js
│   ├── package.json
│   └── data.json                （可选，模拟模式使用）
├── frontend/
│   ├── src/
│   │   ├── App.js
│   │   └── ...
│   ├── public/
│   └── package.json
├── chaincode/                   # 链码源代码
├── organizations/               # 生成的证书材料
├── channel-artifacts/           # 创世区块和通道配置
├── docker-compose.yaml
├── cryptogen-config.yaml
├── configtx.yaml
├── start.sh
└── README.md
```

---

## 🔧 环境变量（后端）

在 `backend/` 目录下创建 `.env` 文件：

```ini
PORT=5000
USE_MOCK=true       # 当 Fabric 未就绪时设为 true
FABRIC_GATEWAY_DISCOVERY=true
```


---

## 🙏 致谢

- Hyperledger Fabric 社区  
- React 和 Recharts 团队  
- 所有小组成员的辛勤付出

---


```

