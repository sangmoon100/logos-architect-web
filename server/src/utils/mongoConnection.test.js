jest.mock('dotenv', () => ({
  config: jest.fn(() => ({})),
}));

jest.mock('mongodb', () => ({
  MongoClient: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    db: jest.fn(() => ({
      collection: jest.fn((name) => ({ collectionName: name })),
    })),
    close: jest.fn().mockResolvedValue(undefined),
  })),
}));

const envKeys = [
  'PORT',
  'MONGODB_URI',
  'NODE_ENV',
  'APP_ENV',
  'MONGO_TLS_ALLOW_INVALID_CERTS',
  'MONGO_TLS_ALLOW_INVALID_HOSTNAMES',
  'MONGO_TLS_CA_FILE',
  'CLIENT_ORIGIN',
];
const originalEnv = Object.fromEntries(
  envKeys.map((key) => [key, process.env[key]]),
);

function loadMongoConnection(uri = 'mongodb://example.invalid/test') {
  jest.resetModules();
  process.env.PORT = '3001';
  process.env.NODE_ENV = 'test';
  process.env.APP_ENV = 'dev';

  if (uri === null) {
    delete process.env.MONGODB_URI;
  } else {
    process.env.MONGODB_URI = uri;
  }

  delete process.env.MONGO_TLS_ALLOW_INVALID_CERTS;
  delete process.env.MONGO_TLS_ALLOW_INVALID_HOSTNAMES;
  delete process.env.MONGO_TLS_CA_FILE;
  delete process.env.CLIENT_ORIGIN;

  return {
    ...require('./mongoConnection'),
    MongoClient: require('mongodb').MongoClient,
  };
}

afterEach(() => {
  for (const key of envKeys) {
    if (originalEnv[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = originalEnv[key];
    }
  }
});

describe('MongoDB connection utility', () => {
  it('returns null when MONGODB_URI is missing', async () => {
    const { connectToMongo, MongoClient } = loadMongoConnection(null);

    await expect(connectToMongo()).resolves.toBeNull();
    expect(MongoClient).not.toHaveBeenCalled();
  });

  it('shares concurrent connections and applies documented client options', async () => {
    const { connectToMongo, MongoClient } = loadMongoConnection();
    const [firstClient, secondClient] = await Promise.all([
      connectToMongo(),
      connectToMongo(),
    ]);
    const options = MongoClient.mock.calls[0][1];

    expect(firstClient).toBe(secondClient);
    expect(MongoClient).toHaveBeenCalledTimes(1);
    expect(options).toMatchObject({
      connectTimeoutMS: 10000,
      serverSelectionTimeoutMS: 15000,
      maxConnecting: 20,
      tls: true,
    });
  });

  it('returns collections from the documented database and closes the client', async () => {
    const { connectToMongo, getCollection, closeMongo, MongoClient } =
      loadMongoConnection();
    const collection = await getCollection('words');
    const client = MongoClient.mock.results[0].value;

    expect(collection).toEqual({ collectionName: 'words' });
    expect(client.db).toHaveBeenCalledWith('ShittimChest');

    await closeMongo();
    expect(client.close).toHaveBeenCalledTimes(1);
    await expect(connectToMongo()).resolves.not.toBeNull();
  });

  it('rejects empty collection names', async () => {
    const { getCollection } = loadMongoConnection();

    await expect(getCollection('  ')).rejects.toThrow(TypeError);
  });
});
