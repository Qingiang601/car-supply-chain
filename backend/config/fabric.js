require('dotenv').config();
const stub = require('./stub');

class FabricClient {
  constructor() {
    this.initialized = false;
  }

  async connect() {
    this.initialized = true;
  }

  async invoke(funcName, ...args) {
    if (!this.initialized) await this.connect();
    return stub[funcName](...args);
  }

  async query(funcName, ...args) {
    if (!this.initialized) await this.connect();
    return stub[funcName](...args);
  }

  disconnect() {}
}

let client;
if (process.env.BACKEND_MODE === 'fabric') {
  client = new FabricClient();
} else {
  client = {
    invoke: async (funcName, ...args) => stub[funcName](...args),
    query: async (funcName, ...args) => stub[funcName](...args),
    disconnect: () => {}
  };
}

module.exports = client;