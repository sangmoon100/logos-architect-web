const { generateNames, selectWeighted } = require('./nameGenerator');

const adjective = {
  word_en: 'Frantic',
  word_ko: '광란의',
  pronunciation: '프랜틱',
  weight: 3,
};
const noun = {
  word_en: 'Providence',
  word_ko: '섭리',
  pronunciation: '프로비던스',
  weight: 5,
};

describe('weighted name generation', () => {
  it('uses roulette subtraction to select by weight', () => {
    const selected = selectWeighted(
      [
        { word_en: 'First', weight: 3 },
        { word_en: 'Second', weight: 5 },
      ],
      () => 0.5,
    );

    expect(selected.word_en).toBe('Second');
  });

  it('assigns weight 1 to records without a weight field', () => {
    const selected = selectWeighted(
      [{ word_en: 'First' }, { word_en: 'Second' }],
      () => 0.75,
    );

    expect(selected.word_en).toBe('Second');
  });

  it('rejects explicitly stored weights outside the schema range', () => {
    expect(() => selectWeighted([{ word_en: 'Invalid', weight: 1 }])).toThrow(
      RangeError,
    );
  });

  it('returns the combined result followed by an independently drawn noun-only result', () => {
    const secondNoun = {
      word_en: 'Pandemonium',
      word_ko: '만마전',
      pronunciation: '팬더모니엄',
      weight: 5,
    };
    const randomValues = [0, 0, 0.75];

    expect(
      generateNames([adjective], [noun, secondNoun], () => randomValues.shift()),
    ).toEqual([
      {
        caseType: 'adjective_noun',
        mix: '광란의 프로비던스',
        translation: '광란의 섭리',
        english: 'Frantic Providence',
        pronunciation: '프랜틱 프로비던스',
      },
      {
        caseType: 'noun',
        mix: '만마전',
        translation: '만마전',
        english: 'Pandemonium',
        pronunciation: '팬더모니엄',
      },
    ]);
  });

  it('returns noun-only formats when no adjective matches', () => {
    expect(generateNames([], [noun], () => 0)).toEqual([
      {
        caseType: 'noun',
        mix: '섭리',
        translation: '섭리',
        english: 'Providence',
        pronunciation: '프로비던스',
      },
    ]);
  });

  it('does not produce a result without a noun candidate', () => {
    expect(generateNames([adjective], [], () => 0)).toEqual([]);
  });
});
