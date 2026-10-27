const { ensureWordIndexes } = require('./ensureWordIndexes');

function createCollection(indexLists = [[]]) {
  return {
    listIndexes: jest.fn(() => ({
      toArray: jest.fn().mockResolvedValue(indexLists.shift() || []),
    })),
    createIndex: jest.fn().mockImplementation(async (key, options) => {
      return Object.keys(key)
        .map((field) => `${field}_${key[field]}`)
        .join('_');
    }),
  };
}

describe('word index setup', () => {
  it('creates only missing required indexes without custom names', async () => {
    const collection = createCollection([[], []]);

    const results = await ensureWordIndexes(collection);

    expect(results).toEqual([
      { name: 'word_en_1', status: 'created' },
      {
        name: 'tags_1_part_of_speech_1',
        status: 'created',
      },
    ]);
    expect(collection.createIndex).toHaveBeenNthCalledWith(
      1,
      { word_en: 1 },
      { unique: true },
    );
  });

  it('reuses compatible indexes regardless of their names', async () => {
    const collection = createCollection([
      [
        { name: '_id_', key: { _id: 1 } },
        { name: 'english_unique', key: { word_en: 1 }, unique: true },
      ],
      [
        {
          name: 'tag_pos',
          key: { tags: 1, part_of_speech: 1 },
        },
      ],
    ]);

    const results = await ensureWordIndexes(collection);

    expect(results).toEqual([
      { name: 'english_unique', status: 'existing' },
      { name: 'tag_pos', status: 'existing' },
    ]);
    expect(collection.createIndex).not.toHaveBeenCalled();
  });

  it('does not replace an incompatible existing index automatically', async () => {
    const collection = createCollection([
      [{ name: 'word_en_1', key: { word_en: 1 } }],
    ]);

    await expect(ensureWordIndexes(collection)).rejects.toThrow(
      '인덱스 설정 충돌',
    );
    expect(collection.createIndex).not.toHaveBeenCalled();
  });

  it('accepts a compatible index created concurrently by another process', async () => {
    const collection = createCollection([
      [],
      [{ name: 'word_en_1', key: { word_en: 1 }, unique: true }],
      [{ name: 'word_en_1', key: { word_en: 1 }, unique: true }],
      [],
    ]);
    collection.createIndex.mockRejectedValueOnce(
      Object.assign(new Error('index conflict'), { code: 85 }),
    );

    const results = await ensureWordIndexes(collection);

    expect(results[0]).toEqual({ name: 'word_en_1', status: 'existing' });
    expect(results[1]).toMatchObject({
      name: 'tags_1_part_of_speech_1',
      status: 'created',
    });
  });
});
