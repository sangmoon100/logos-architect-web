interface WeightedItem {
  weight?: unknown;
}

interface NameCandidate extends WeightedItem {
  word_en: string;
  word_ko: string;
  pronunciation: string;
}

interface GeneratedName {
  caseType: 'adjective_noun' | 'noun';
  mix: string;
  translation: string;
  english: string;
  pronunciation: string;
}

function weightOf(word: WeightedItem): number {
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

export function selectWeighted<T extends WeightedItem>(
  words: readonly T[],
  random: () => number = Math.random,
): T | null {
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
  for (let index = 0; index < words.length; index += 1) {
    remainingWeight -= weights[index];
    if (remainingWeight < 0) {
      return words[index];
    }
  }

  return words[words.length - 1];
}

export function generateNames(
  adjectives: readonly NameCandidate[],
  nouns: readonly NameCandidate[],
  random: () => number = Math.random,
): GeneratedName[] {
  const results: GeneratedName[] = [];

  if (adjectives.length > 0 && nouns.length > 0) {
    const adjective = selectWeighted(adjectives, random);
    const combinedNoun = selectWeighted(nouns, random);

    if (adjective && combinedNoun) {
      results.push({
        caseType: 'adjective_noun',
        mix: `${adjective.word_ko} ${combinedNoun.pronunciation}`,
        translation: `${adjective.word_ko} ${combinedNoun.word_ko}`,
        english: `${adjective.word_en} ${combinedNoun.word_en}`,
        pronunciation: `${adjective.pronunciation} ${combinedNoun.pronunciation}`,
      });
    }
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
