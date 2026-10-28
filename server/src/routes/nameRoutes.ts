import express, {
  type Request,
  type RequestHandler,
  type Response,
} from 'express';
import HttpError = require('../errors/HttpError');
import { generateNames } from '../features/names/nameGenerator';
import { parseBodyTags } from '../features/words/tagValidation';
import { listCandidates } from '../features/words/wordRepository';

type AsyncRouteHandler = (
  request: Request,
  response: Response,
) => Promise<void>;

const router = express.Router();

function asyncHandler(handler: AsyncRouteHandler): RequestHandler {
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

export = router;
