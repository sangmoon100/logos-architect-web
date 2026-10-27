const express = require('express');
const HttpError = require('../errors/HttpError');
const { listCandidates } = require('../features/words/wordRepository');
const { generateNames } = require('../features/names/nameGenerator');
const { parseBodyTags } = require('../features/words/tagValidation');

const router = express.Router();

function asyncHandler(handler) {
  return (request, response, next) => {
    Promise.resolve(handler(request, response)).catch(next);
  };
}

router.post(
  '/names/generate',
  asyncHandler(async (request, response) => {
    const tags = parseBodyTags(request.body?.tags);
    const [adjectives, nouns] = await Promise.all([
      listCandidates('adjective', tags),
      listCandidates('noun', tags),
    ]);

    if (nouns.length === 0) {
      throw new HttpError(
        422,
        'NO_MATCHING_WORDS',
        '선택한 조건에서 작명할 명사를 찾을 수 없습니다',
      );
    }

    const results = generateNames(adjectives, nouns);
    response.json({ success: true, data: results });
  }),
);

module.exports = router;
