const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '../data.json');
let mockData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

const stub = {
  QueryAll: async () => mockData,

  QueryByID: async (id) => {
    return mockData.find(item => item.id === id);
  },

  CreateReceivable: async (data) => {
    const newItem = {
      id: Date.now().toString(),
      ...data,
      status: "created",
      createdAt: new Date().toISOString().split('T')[0],
      lastUpdated: new Date().toISOString().split('T')[0]
    };
    mockData.push(newItem);
    fs.writeFileSync(dataPath, JSON.stringify(mockData, null, 2));
    return newItem;
  },

  ConfirmReceivable: async (id) => {
    const item = mockData.find(i => i.id === id);
    if (item) {
      item.status = "confirmed";
      item.lastUpdated = new Date().toISOString().split('T')[0];
      fs.writeFileSync(dataPath, JSON.stringify(mockData, null, 2));
    }
    return item;
  },

  TransferReceivable: async (id, newOwner) => {
    const item = mockData.find(i => i.id === id);
    if (item) {
      item.status = "transferred";
      item.newOwner = newOwner;
      item.lastUpdated = new Date().toISOString().split('T')[0];
      fs.writeFileSync(dataPath, JSON.stringify(mockData, null, 2));
    }
    return item;
  },

  ApplyFinance: async (id) => {
    const item = mockData.find(i => i.id === id);
    if (item) {
      item.status = "financing";
      item.lastUpdated = new Date().toISOString().split('T')[0];
      fs.writeFileSync(dataPath, JSON.stringify(mockData, null, 2));
    }
    return item;
  },

  ApproveFinance: async (id) => {
    const item = mockData.find(i => i.id === id);
    if (item) {
      item.status = "approved";
      item.lastUpdated = new Date().toISOString().split('T')[0];
      fs.writeFileSync(dataPath, JSON.stringify(mockData, null, 2));
    }
    return item;
  },

  GetHistory: async (id) => {
    return [
      { timestamp: "2025-06-01", status: "created" },
      { timestamp: "2025-06-02", status: "confirmed" },
      { timestamp: "2025-06-03", status: "financing" }
    ];
  }
};

module.exports = stub;