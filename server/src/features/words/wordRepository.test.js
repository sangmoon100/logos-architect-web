jest.mock('../../utils/mongoConnection', () => ({
  getCollection: jest.fn(),
}));

function makeCollection(responses = []) {
  return {
    createIndex: jest.fn().mockResolvedValue('index'),
    aggregate: jest.fn(() => ({
      toArray: jest.fn().mockResolvedValue(responses.shift() || []),
    })),
  };
}

function loadRepository(collection) {
  jest.resetModules();
  const mongoConnection = require('../../utils/mongoConnection');
  mongoConnection.getCollection.mockResolvedValue(collection);

  return {
    repository: require('./wordRepository'),
    mongoConnection,
  };
}

describe('word repository', () => {
  it('returns distinct tags from the words collection', async () => {
    const collection = makeCollection([[{ _id: '#게헨나' }, { _id: '#신비' }]]);
    const { repository, mongoConnection } = loadRepository(collection);

    await expect(repository.listTags()).resolves.toEqual(['#게헨나', '#신비']);
    expect(mongoConnection.getCollection).toHaveBeenCalledWith('words');
    expect(collection.aggregate).toHaveBeenCalledWith(
      expect.arrayContaining([
        { $unwind: '$tags' },
        { $group: { _id: '$tags' } },
      ]),
    );
    expect(collection.createIndex).not.toHaveBeenCalled();
  });

  it('filters words by any selected tag and returns only dictionary fields', async () => {
    const record = {
      word_en: 'Providence',
      word_ko: '섭리',
      pronunciation: '프로비던스',
      part_of_speech: 'noun',
      tags: ['#게헨나'],
      weight: 5,
    };
    const collection = makeCollection([[
      { items: [record], count: [{ total: 1 }] },
    ]]);
    const { repository } = loadRepository(collection);

    await expect(
      repository.listWords({
        tags: ['#게헨나', '#신비'],
        query: 'Pro.vid*',
        page: 1,
        pageSize: 20,
      }),
    ).resolves.toEqual({
      items: [
        {
          word_en: 'Providence',
          word_ko: '섭리',
          pronunciation: '프로비던스',
          part_of_speech: 'noun',
          tags: ['#게헨나'],
        },
      ],
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    });
    expect(collection.aggregate.mock.calls[0][0][0]).toEqual({
      $match: {
        $and: [
          { tags: { $in: ['#게헨나', '#신비'] } },
          {
            $or: [
              { word_en: { $regex: 'Pro\\.vid\\*', $options: 'i' } },
              { word_ko: { $regex: 'Pro\\.vid\\*', $options: 'i' } },
              { pronunciation: { $regex: 'Pro\\.vid\\*', $options: 'i' } },
              { tags: { $regex: 'Pro\\.vid\\*', $options: 'i' } },
            ],
          },
        ],
      },
    });
  });

  it('returns all dictionary records when no tags are selected', async () => {
    const collection = makeCollection([[{ items: [], count: [] }]]);
    const { repository } = loadRepository(collection);

    const result = await repository.listWords({
      tags: [],
      query: '',
      page: 1,
      pageSize: 20,
    });

    expect(collection.aggregate.mock.calls[0][0][0]).toEqual({ $match: {} });
    expect(result.pagination.totalPages).toBe(0);
  });

  it('loads candidates by part of speech and selected tags', async () => {
    const candidate = {
      word_en: 'Providence',
      word_ko: '섭리',
      pronunciation: '프로비던스',
      part_of_speech: 'noun',
      tags: ['#신비'],
    };
    const collection = makeCollection([[candidate]]);
    const { repository } = loadRepository(collection);

    await expect(
      repository.listCandidates('noun', ['#신비']),
    ).resolves.toEqual([candidate]);
    expect(collection.aggregate.mock.calls[0][0][0]).toEqual({
      $match: { part_of_speech: 'noun', tags: { $in: ['#신비'] } },
    });
  });

  it('reports the database as unavailable when the URI is not configured', async () => {
    const { repository, mongoConnection } = loadRepository(null);
    mongoConnection.getCollection.mockResolvedValue(null);

    await expect(repository.listTags()).rejects.toMatchObject({
      statusCode: 503,
      code: 'DATABASE_UNAVAILABLE',
    });
  });

  it('rejects malformed word records instead of returning incomplete rows', async () => {
    const collection = makeCollection([[
      { items: [{ word_en: 'Incomplete', tags: [] }], count: [{ total: 1 }] },
    ]]);
    const { repository } = loadRepository(collection);

    await expect(
      repository.listWords({ tags: [], query: '', page: 1, pageSize: 20 }),
    ).rejects.toThrow('words 컬렉션에 유효하지 않은 문서가 있습니다');
  });
});
