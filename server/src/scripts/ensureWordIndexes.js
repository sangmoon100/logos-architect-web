const { closeMongo, getCollection } = require('../utils/mongoConnection');

// 사전 정렬·태그/품사 조회와 word_en 고유성에 필요한 인덱스만 선언한다.
const REQUIRED_INDEXES = [
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

function hasSameKey(index, requiredIndex) {
  // 이름이 달라도 키 순서와 방향이 같으면 같은 인덱스 후보로 본다.
  const actualEntries = Object.entries(index.key || {});
  const requiredEntries = Object.entries(requiredIndex.key);
  return JSON.stringify(actualEntries) === JSON.stringify(requiredEntries);
}

function isCompatible(index, requiredIndex) {
  if (Boolean(index.unique) !== requiredIndex.unique) {
    return false;
  }

  // 부분·희소 인덱스 등은 전체 문서에 대한 제약이나 조회 범위를 보장하지 못한다.
  return (
    !index.sparse &&
    !index.partialFilterExpression &&
    index.expireAfterSeconds === undefined &&
    !index.hidden &&
    (!index.collation || index.collation.locale === 'simple')
  );
}

async function readIndexes(collection) {
  try {
    return await collection.listIndexes().toArray();
  } catch (error) {
    if (error && error.code === 26) {
      // 컬렉션이 아직 없으면 인덱스가 없는 것으로 보고 createIndex에 맡긴다.
      return [];
    }
    throw error;
  }
}

/**
 * 기존 인덱스를 안전하게 재사용하고 누락된 사전 인덱스만 생성한다.
 * @param {import('mongodb').Collection} collection words 컬렉션
 * @returns {Promise<Array<{name: string, status: string}>>} 기존 또는 생성된 인덱스 결과
 * @throws {Error} 기존 인덱스 옵션이 충돌하거나 인덱스 생성이 실패한 경우
 */
async function ensureWordIndexes(collection) {
  const results = [];

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
    } catch (error) {
      if (error && (error.code === 85 || error.code === 86)) {
        // 다른 프로세스가 먼저 만든 경우일 수 있으므로 최신 목록을 다시 확인한다.
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

function safeLabel(value) {
  return String(value || 'unknown')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 40);
}

async function run() {
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
  } catch (error) {
    console.error(
      `[Mongo] word index setup failed | context(error=${safeLabel(error && error.name)},code=${safeLabel(error && error.code)})`,
    );
    process.exitCode = 1;
  } finally {
    try {
      await closeMongo();
    } catch (error) {
      console.error(
        `[Mongo] connection close failed | context(error=${safeLabel(error && error.name)})`,
      );
      process.exitCode = 1;
    }
  }
}

// CLI 실행 시에만 DB 인덱스를 변경하고, 모듈 import는 부작용 없이 유지한다.
if (require.main === module) {
  run();
}

module.exports = { ensureWordIndexes };
