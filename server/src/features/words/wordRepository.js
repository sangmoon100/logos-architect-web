const { getCollection } = require('../../utils/mongoConnection');
const HttpError = require('../../errors/HttpError');

const COLLECTION_NAME = 'words';

/**
 * DB 연결이 없는 경우 빈 컬렉션처럼 처리하지 않고 서비스 불가 오류를 전달한다.
 * @returns {Promise<import('mongodb').Collection>}
 * @throws {HttpError} DB 연결이 설정되지 않은 경우
 */
async function getWordsCollection() {
  const collection = await getCollection(COLLECTION_NAME);
  if (!collection) {
    throw new HttpError(
      503,
      'DATABASE_UNAVAILABLE',
      '데이터베이스를 일시적으로 사용할 수 없습니다',
    );
  }

  return collection;
}

/**
 * DB 문서를 API 계약에 맞춰 검증하고 화면에 필요한 필드만 반환한다.
 * @param {object} document MongoDB 단어 문서
 * @param {boolean} includeWeight 작명 후보 응답에 weight를 포함할지 여부
 * @returns {object} 검증된 단어 레코드
 * @throws {Error} 필수 필드나 품사, 태그 형식이 올바르지 않은 경우
 */
function toWordRecord(document, includeWeight = false) {
  if (!document || typeof document !== 'object') {
    throw new Error('words 컬렉션에 유효하지 않은 문서가 있습니다');
  }

  const requiredStrings = [
    document.word_en,
    document.word_ko,
    document.pronunciation,
  ];

  if (
    requiredStrings.some(
      (value) => typeof value !== 'string' || value.trim() === '',
    ) ||
    !['adjective', 'noun'].includes(document.part_of_speech) ||
    !Array.isArray(document.tags) ||
    document.tags.some((tag) => typeof tag !== 'string')
  ) {
    throw new Error('words 컬렉션에 유효하지 않은 문서가 있습니다');
  }

  const record = {
    word_en: document.word_en,
    word_ko: document.word_ko,
    pronunciation: document.pronunciation,
    part_of_speech: document.part_of_speech,
    tags: [...document.tags],
  };

  // weight는 작명 후보 전용 필드이므로 사전 조회 응답에는 노출하지 않는다.
  if (includeWeight && document.weight !== undefined) {
    record.weight = document.weight;
  }

  return record;
}

/**
 * 사전에서 실제 사용 중인 태그를 중복 없이 반환한다.
 * @returns {Promise<string[]>} 정렬된 태그 목록
 */
async function listTags() {
  const collection = await getWordsCollection();
  const documents = await collection
    .aggregate([
      { $unwind: '$tags' },
      { $match: { tags: { $type: 'string', $ne: '' } } },
      { $group: { _id: '$tags' } },
      { $sort: { _id: 1 } },
    ])
    .toArray();

  return documents.map((document) => document._id);
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildWordMatch(tags, query) {
  const conditions = [];
  if (tags.length > 0) {
    conditions.push({ tags: { $in: tags } });
  }
  if (query) {
    const searchPattern = { $regex: escapeRegex(query), $options: 'i' };
    conditions.push({
      $or: ['word_en', 'word_ko', 'pronunciation', 'tags'].map((field) => ({
        [field]: searchPattern,
      })),
    });
  }

  if (conditions.length === 0) {
    return {};
  }
  return conditions.length === 1 ? conditions[0] : { $and: conditions };
}

/**
 * 검색·태그 조건을 적용한 사전 페이지와 전체 일치 개수를 조회한다.
 * @param {{tags: string[], query: string, page: number, pageSize: number}} options 조회 조건
 * @returns {Promise<{items: object[], pagination: object}>} 사전 페이지 및 페이지 정보
 */
async function listWords({ tags, query, page, pageSize }) {
  const collection = await getWordsCollection();
  const match = buildWordMatch(tags, query);
  const [result] = await collection
    .aggregate([
      { $match: match },
      {
        $facet: {
          items: [
            { $sort: { word_en: 1 } },
            { $skip: (page - 1) * pageSize },
            { $limit: pageSize },
            {
              $project: {
                _id: 0,
                word_en: 1,
                word_ko: 1,
                pronunciation: 1,
                part_of_speech: 1,
                tags: 1,
              },
            },
          ],
          count: [{ $count: 'total' }],
        },
      },
    ])
    .toArray();
  const total = Number(result?.count?.[0]?.total || 0);

  return {
    items: (result?.items || []).map(toWordRecord),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

/**
 * 품사와 태그 조건에 맞는 작명 후보를 조회한다.
 * @param {'adjective'|'noun'} partOfSpeech 후보 품사
 * @param {string[]} tags 선택 태그. 빈 배열이면 해당 품사의 전체 후보
 * @returns {Promise<object[]>} weight를 포함한 작명 후보 목록
 */
async function listCandidates(partOfSpeech, tags) {
  if (!['adjective', 'noun'].includes(partOfSpeech)) {
    throw new TypeError('지원하지 않는 품사입니다');
  }

  const collection = await getWordsCollection();
  const match = { part_of_speech: partOfSpeech };
  // 태그 조건은 사전 조회와 동일하게 OR로 적용한다.
  if (tags.length > 0) {
    match.tags = { $in: tags };
  }

  const documents = await collection
    .aggregate([
      { $match: match },
      {
        $project: {
          _id: 0,
          word_en: 1,
          word_ko: 1,
          pronunciation: 1,
          part_of_speech: 1,
          tags: 1,
          weight: 1,
        },
      },
      { $sort: { word_en: 1 } },
    ])
    .toArray();

  return documents.map((document) => toWordRecord(document, true));
}

module.exports = { listTags, listWords, listCandidates };
