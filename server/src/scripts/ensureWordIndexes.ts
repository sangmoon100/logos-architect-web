import {
  type Collection,
  type CreateIndexesOptions,
  type Document,
  type IndexDescriptionInfo,
} from 'mongodb';
import { closeMongo, getCollection } from '../utils/mongoConnection';

interface RequiredIndex {
  key: Record<string, 1 | -1>;
  options: CreateIndexesOptions;
  unique: boolean;
}

interface IndexSetupResult {
  name: string | undefined;
  status: 'created' | 'existing';
}

const REQUIRED_INDEXES: RequiredIndex[] = [
  {
    key: { word_en: 1 },
    options: { unique: true },
    unique: true,
  },
  {
    key: { tags: 1, part_of_speech: 1 },
    options: {},
    unique: false,
  },
];

function hasSameKey(
  index: IndexDescriptionInfo,
  requiredIndex: RequiredIndex,
): boolean {
  const actualEntries = Object.entries(index.key || {});
  const requiredEntries = Object.entries(requiredIndex.key);
  return JSON.stringify(actualEntries) === JSON.stringify(requiredEntries);
}

function isCompatible(
  index: IndexDescriptionInfo,
  requiredIndex: RequiredIndex,
): boolean {
  if (Boolean(index.unique) !== requiredIndex.unique) {
    return false;
  }

  return (
    !index.sparse &&
    !index.partialFilterExpression &&
    index.expireAfterSeconds === undefined &&
    !index.hidden &&
    (!index.collation || index.collation.locale === 'simple')
  );
}

function getErrorCode(error: unknown): unknown {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return undefined;
  }

  return error.code;
}

async function readIndexes(
  collection: Collection<Document>,
): Promise<IndexDescriptionInfo[]> {
  try {
    const indexes: IndexDescriptionInfo[] =
      await collection.listIndexes().toArray();
    return indexes;
  } catch (error: unknown) {
    if (getErrorCode(error) === 26) {
      return [];
    }
    throw error;
  }
}

export async function ensureWordIndexes(
  collection: Collection<Document>,
): Promise<IndexSetupResult[]> {
  const results: IndexSetupResult[] = [];

  for (const requiredIndex of REQUIRED_INDEXES) {
    let indexes = await readIndexes(collection);
    let existingIndex = indexes.find((index) =>
      hasSameKey(index, requiredIndex),
    );

    if (existingIndex) {
      if (!isCompatible(existingIndex, requiredIndex)) {
        throw new Error(
          `인덱스 설정 충돌: ${existingIndex.name || '이름 없는 인덱스'}의 옵션을 확인하세요`,
        );
      }
      results.push({ name: existingIndex.name, status: 'existing' });
      continue;
    }

    try {
      const name = await collection.createIndex(
        requiredIndex.key,
        requiredIndex.options,
      );
      results.push({ name, status: 'created' });
    } catch (error: unknown) {
      const errorCode = getErrorCode(error);
      if (errorCode === 85 || errorCode === 86) {
        indexes = await readIndexes(collection);
        existingIndex = indexes.find((index) =>
          hasSameKey(index, requiredIndex),
        );
        if (existingIndex && isCompatible(existingIndex, requiredIndex)) {
          results.push({ name: existingIndex.name, status: 'existing' });
          continue;
        }
      }
      throw error;
    }
  }

  return results;
}

function safeLabel(value: unknown): string {
  return String(value || 'unknown')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 40);
}

function errorProperty(
  error: unknown,
  property: 'name' | 'code',
): unknown {
  if (
    typeof error !== 'object' ||
    error === null ||
    !(property in error)
  ) {
    return undefined;
  }

  return Reflect.get(error, property);
}

async function run(): Promise<void> {
  try {
    const collection = await getCollection('words');
    if (!collection) {
      throw new Error('MONGODB_URI가 설정되지 않았습니다');
    }

    const results = await ensureWordIndexes(collection);
    const created = results.filter((result) => result.status === 'created').length;
    const existing = results.length - created;
    console.log(
      `[Mongo] word indexes ready | context(created=${created},existing=${existing})`,
    );
  } catch (error: unknown) {
    console.error(
      `[Mongo] word index setup failed | context(error=${safeLabel(errorProperty(error, 'name'))},code=${safeLabel(errorProperty(error, 'code'))})`,
    );
    process.exitCode = 1;
  } finally {
    try {
      await closeMongo();
    } catch (error: unknown) {
      console.error(
        `[Mongo] connection close failed | context(error=${safeLabel(errorProperty(error, 'name'))})`,
      );
      process.exitCode = 1;
    }
  }
}

if (require.main === module) {
  run();
}
