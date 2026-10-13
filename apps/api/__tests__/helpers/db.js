const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongod;

async function connect() {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri(), {
    // The MongoDB driver (7.7+) loads `os` with a dynamic import(), which Jest's
    // CommonJS sandbox rejects. The handshake then goes out without its client
    // metadata and the server refuses the connection. Handing the driver `os`
    // directly avoids the import. Only the test runner needs this.
    runtimeAdapters: { os: require('os') },
  });
}

async function clear() {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
}

async function disconnect() {
  await mongoose.disconnect();
  await mongod.stop();
}

module.exports = { connect, clear, disconnect };
