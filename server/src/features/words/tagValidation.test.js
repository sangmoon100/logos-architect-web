const {
  normalizeTags,
  parseBodyTags,
  parseQueryTags,
} = require('./tagValidation');

describe('tag validation', () => {
  it('trims and deduplicates tags', () => {
    expect(normalizeTags([' #게헨나 ', '#신비', '#게헨나'])).toEqual([
      '#게헨나',
      '#신비',
    ]);
  });

  it('accepts absent query and body tags as an empty list', () => {
    expect(parseQueryTags(undefined)).toEqual([]);
    expect(parseBodyTags(undefined)).toEqual([]);
  });

  it('normalizes a single query tag and repeated query tags', () => {
    expect(parseQueryTags(' #게헨나 ')).toEqual(['#게헨나']);
    expect(parseQueryTags(['#게헨나', '#신비'])).toEqual([
      '#게헨나',
      '#신비',
    ]);
  });

  it('rejects invalid query tag values', () => {
    expect(() => parseQueryTags(['#게헨나', 3])).toThrow(
      '태그는 비어 있지 않은 문자열이어야 합니다',
    );
  });

  it('requires body tags to be an array', () => {
    expect(() => parseBodyTags('#게헨나')).toThrow(
      'tags는 문자열 배열이어야 합니다',
    );
  });

  it('rejects empty or non-string tags in the body', () => {
    expect(() => parseBodyTags(['#게헨나', '  '])).toThrow(
      '태그는 비어 있지 않은 문자열이어야 합니다',
    );
    expect(() => parseBodyTags([null])).toThrow(
      '태그는 비어 있지 않은 문자열이어야 합니다',
    );
  });
});
