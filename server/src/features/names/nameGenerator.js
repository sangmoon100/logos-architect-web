function weightOf(word) {
  // 누락된 값은 PRD의 안전장치대로 1을 쓰고, 명시된 값은 스키마 범위를 검증한다.
  if (word.weight === undefined) {
    return 1;
  }

  if (
    typeof word.weight !== 'number' ||
    !Number.isFinite(word.weight) ||
    word.weight < 3 ||
    word.weight > 5
  ) {
    throw new RangeError('저장된 단어의 weight는 3~5 사이의 숫자여야 합니다');
  }

  return word.weight;
}

/**
 * 총 가중치 안에서 난수 구간을 찾아 단어 하나를 선택한다.
 * @param {object[]} words 추첨 후보
 * @param {() => number} random 0 이상 1 미만의 난수 생성기
 * @returns {object|null} 선택된 후보 또는 빈 후보일 때 null
 * @throws {RangeError} 가중치나 난수 값이 유효하지 않은 경우
 */
function selectWeighted(words, random = Math.random) {
  if (words.length === 0) {
    return null;
  }

  const weights = words.map(weightOf);
  const totalWeight = weights.reduce((total, weight) => total + weight, 0);
  if (!Number.isFinite(totalWeight) || totalWeight <= 0) {
    throw new RangeError('가중치 총합은 양수이고 유한한 값이어야 합니다');
  }

  const randomValue = random();
  if (
    typeof randomValue !== 'number' ||
    !Number.isFinite(randomValue) ||
    randomValue < 0 ||
    randomValue >= 1
  ) {
    throw new RangeError('무작위 값은 0 이상 1 미만이어야 합니다');
  }

  let remainingWeight = randomValue * totalWeight;
  // 룰렛 위치에서 후보별 가중치를 차감해 해당 구간의 후보를 찾는다.
  for (let index = 0; index < words.length; index += 1) {
    remainingWeight -= weights[index];
    if (remainingWeight < 0) {
      return words[index];
    }
  }

  return words[words.length - 1];
}

/**
 * 형용사+명사 결과와 별도의 명사 단독 결과를 순서대로 추첨한다.
 * @param {object[]} adjectives 형용사 후보
 * @param {object[]} nouns 명사 후보
 * @param {() => number} random 테스트 가능한 난수 생성기
 * @returns {object[]} 생성 가능한 결과 목록
 */
function generateNames(adjectives, nouns, random = Math.random) {
  const results = [];

  if (adjectives.length > 0 && nouns.length > 0) {
    const adjective = selectWeighted(adjectives, random);
    const combinedNoun = selectWeighted(nouns, random);

    // 믹스에는 명사 음독, 순수 번역에는 명사 뜻을 사용한다.
    results.push({
      caseType: 'adjective_noun',
      mix: `${adjective.word_ko} ${combinedNoun.pronunciation}`,
      translation: `${adjective.word_ko} ${combinedNoun.word_ko}`,
      english: `${adjective.word_en} ${combinedNoun.word_en}`,
      pronunciation: `${adjective.pronunciation} ${combinedNoun.pronunciation}`,
    });
  }

  const noun = selectWeighted(nouns, random);
  if (noun) {
    results.push({
      caseType: 'noun',
      mix: noun.word_ko,
      translation: noun.word_ko,
      english: noun.word_en,
      pronunciation: noun.pronunciation,
    });
  }

  return results;
}

module.exports = { generateNames, selectWeighted };
