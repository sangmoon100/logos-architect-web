const { MongoClient } = require('mongodb');
const { config } = require('../config/env');

const DATABASE_NAME = 'ShittimChest';
let mongoClient = null;
let connectPromise = null;

class MongoConnectionError extends Error {
  constructor(cause) {
    super('MongoDB Atlas 연결에 실패했습니다', { cause });
    this.name = 'MongoConnectionError';
  }
}

function buildMongoClientOptions() {
  const options = {
    connectTimeoutMS: 10000,
    serverSelectionTimeoutMS: 15000,
    maxConnecting: 20,
    tls: true,
  };

  if (config.allowInvalidCertificates) {
    options.tlsAllowInvalidCertificates = true;
  }
  if (config.allowInvalidHostnames) {
    options.tlsAllowInvalidHostnames = true;
  }
  if (config.caFile) {
    options.tlsCAFile = config.caFile;
  }

  return options;
}

function safeErrorName(error) {
  const name = error instanceof Error ? error.name : 'UnknownError';
  return name.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || 'UnknownError';
}

function logMongoConnectionHints(error) {
  const message = error instanceof Error ? error.message : '';
  const code =
    error && typeof error.code === 'string'
      ? error.code.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40)
      : 'unknown';

  console.error(
    `[Mongo] connection failed | context(env=${config.appEnv},error=${safeErrorName(error)},code=${code})`,
  );

  if (/tls|certificate/i.test(message)) {
    console.error(
      '[Mongo] TLS check: verify Atlas credentials, network access, system time, and any required CA file',
    );
  }
}

async function connectToMongo() {
  if (!config.mongoUri) {
    return null;
  }
  if (mongoClient) {
    return mongoClient;
  }
  if (connectPromise) {
    return connectPromise;
  }

  const pendingConnection = (async () => {
    let candidateClient;

    try {
      candidateClient = new MongoClient(config.mongoUri, buildMongoClientOptions());
      await candidateClient.connect();
      mongoClient = candidateClient;
      return mongoClient;
    } catch (error) {
      logMongoConnectionHints(error);

      if (candidateClient) {
        try {
          await candidateClient.close();
        } catch (closeError) {
          console.error(
            `[Mongo] failed connection cleanup failed | context(error=${safeErrorName(closeError)})`,
          );
        }
      }

      throw new MongoConnectionError(error);
    }
  })();

  connectPromise = pendingConnection;
  try {
    return await pendingConnection;
  } finally {
    if (connectPromise === pendingConnection) {
      connectPromise = null;
    }
  }
}

async function getCollection(name) {
  if (typeof name !== 'string' || name.trim() === '') {
    throw new TypeError('컬렉션 이름은 비어 있지 않은 문자열이어야 합니다');
  }

  const client = await connectToMongo();
  if (!client) {
    return null;
  }

  return client.db(DATABASE_NAME).collection(name.trim());
}

async function closeMongo() {
  if (connectPromise) {
    await connectPromise;
  }
  if (!mongoClient) {
    return;
  }

  const client = mongoClient;
  await client.close();
  if (mongoClient === client) {
    mongoClient = null;
  }
}

module.exports = {
  connectToMongo,
  getCollection,
  closeMongo,
  MongoConnectionError,
};
