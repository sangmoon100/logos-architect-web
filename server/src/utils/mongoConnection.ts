import {
  MongoClient,
  type Collection,
  type Document,
  type MongoClientOptions,
} from 'mongodb';
import { config } from '../config/env';

const DATABASE_NAME = 'ShittimChest';
let mongoClient: MongoClient | null = null;
let connectPromise: Promise<MongoClient> | null = null;

export class MongoConnectionError extends Error {
  constructor(cause: unknown) {
    super('MongoDB Atlas 연결에 실패했습니다', { cause });
    this.name = 'MongoConnectionError';
  }
}

function buildMongoClientOptions(): MongoClientOptions {
  const options: MongoClientOptions = {
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

function safeErrorName(error: unknown): string {
  const name = error instanceof Error ? error.name : 'UnknownError';
  return name.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || 'UnknownError';
}

function getErrorCode(error: unknown): unknown {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return undefined;
  }

  return error.code;
}

function logMongoConnectionHints(error: unknown): void {
  const message = error instanceof Error ? error.message : '';
  const code = getErrorCode(error);
  const safeCode =
    typeof code === 'string'
      ? code.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40)
      : 'unknown';

  console.error(
    `[Mongo] connection failed | context(env=${config.appEnv},error=${safeErrorName(error)},code=${safeCode})`,
  );

  if (/tls|certificate/i.test(message)) {
    console.error(
      '[Mongo] TLS check: verify Atlas credentials, network access, system time, and any required CA file',
    );
  }
}

export async function connectToMongo(): Promise<MongoClient | null> {
  const mongoUri = config.mongoUri;
  if (!mongoUri) {
    return null;
  }
  if (mongoClient) {
    return mongoClient;
  }
  if (connectPromise) {
    return connectPromise;
  }

  const pendingConnection = (async (): Promise<MongoClient> => {
    let candidateClient: MongoClient | null = null;

    try {
      candidateClient = new MongoClient(
        mongoUri,
        buildMongoClientOptions(),
      );
      await candidateClient.connect();
      mongoClient = candidateClient;
      return candidateClient;
    } catch (error: unknown) {
      logMongoConnectionHints(error);

      if (candidateClient) {
        try {
          await candidateClient.close();
        } catch (closeError: unknown) {
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

export async function getCollection(
  name: string,
): Promise<Collection<Document> | null> {
  if (typeof name !== 'string' || name.trim() === '') {
    throw new TypeError('컬렉션 이름은 비어 있지 않은 문자열이어야 합니다');
  }

  const client = await connectToMongo();
  if (!client) {
    return null;
  }

  return client.db(DATABASE_NAME).collection(name.trim());
}

export async function closeMongo(): Promise<void> {
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
