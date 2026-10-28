import type { Collection, Document } from 'mongodb';
import HttpError = require('../../errors/HttpError');
import { getCollection } from '../../utils/mongoConnection';

type PartOfSpeech = 'adjective' | 'noun';

interface WordRecord {
  word_en: string;
  word_ko: string;
  pronunciation: string;
  part_of_speech: PartOfSpeech;
  tags: string[];
}

interface WordCandidate extends WordRecord {
  weight?: unknown;
}

interface TagAggregationResult extends Document {
  _id: string;
}

interface WordSearchAggregationResult extends Document {
  items?: Document[];
  count?: Array<{ total: number }>;
}

interface WordSearchOptions {
  tags: string[];
  query: string;
  page: number;
  pageSize: number;
}

interface WordSearchResult {
  items: WordRecord[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

const COLLECTION_NAME = 'words';

async function getWordsCollection(): Promise<Collection<Document>> {
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

function isPartOfSpeech(value: unknown): value is PartOfSpeech {
  return value === 'adjective' || value === 'noun';
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((tag: unknown) => typeof tag === 'string')
  );
}

function toWordRecord(
  document: unknown,
  includeWeight: true,
): WordCandidate;
function toWordRecord(
  document: unknown,
  includeWeight?: false,
): WordRecord;
function toWordRecord(
  document: unknown,
  includeWeight = false,
): WordRecord | WordCandidate {
  if (!isRecord(document)) {
    throw new Error('words 컬렉션에 유효하지 않은 문서가 있습니다');
  }

  if (
    !isNonEmptyString(document.word_en) ||
    !isNonEmptyString(document.word_ko) ||
    !isNonEmptyString(document.pronunciation) ||
    !isPartOfSpeech(document.part_of_speech) ||
    !isStringArray(document.tags)
  ) {
    throw new Error('words 컬렉션에 유효하지 않은 문서가 있습니다');
  }

  const record: WordRecord = {
    word_en: document.word_en,
    word_ko: document.word_ko,
    pronunciation: document.pronunciation,
    part_of_speech: document.part_of_speech,
    tags: [...document.tags],
  };

  if (includeWeight && document.weight !== undefined) {
    return { ...record, weight: document.weight };
  }

  return record;
}

export async function listTags(): Promise<string[]> {
  const collection = await getWordsCollection();
  const documents = await collection
    .aggregate<TagAggregationResult>([
      { $unwind: '$tags' },
      { $match: { tags: { $type: 'string', $ne: '' } } },
      { $group: { _id: '$tags' } },
      { $sort: { _id: 1 } },
    ])
    .toArray();

  return documents.map((document) => document._id);
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildWordMatch(tags: string[], query: string): Document {
  const conditions: Document[] = [];
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

export async function listWords({
  tags,
  query,
  page,
  pageSize,
}: WordSearchOptions): Promise<WordSearchResult> {
  const collection = await getWordsCollection();
  const match = buildWordMatch(tags, query);
  const [result] = await collection
    .aggregate<WordSearchAggregationResult>([
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
    items: (result?.items || []).map((document) => toWordRecord(document)),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

export async function listCandidates(
  partOfSpeech: PartOfSpeech,
  tags: string[],
): Promise<WordCandidate[]> {
  if (partOfSpeech !== 'adjective' && partOfSpeech !== 'noun') {
    throw new TypeError('지원하지 않는 품사입니다');
  }

  const collection = await getWordsCollection();
  const match: Document = { part_of_speech: partOfSpeech };
  if (tags.length > 0) {
    match.tags = { $in: tags };
  }

  const documents = await collection
    .aggregate<Document>([
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
