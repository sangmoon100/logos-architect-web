/* global use, db */
// 1. 데이터베이스 스코프 지정 (본인의 DB명과 일치하는지 확인하세요)
use("ShittimChest");

// 2. [인프라 지표] 안전장치가 강화된 전체 단어 수 및 품사 비율 집계
const rawBaseStats = db.getCollection("words").aggregate([
  {
    $group: {
      _id: null,
      totalCount: { $sum: 1 },
      adjectives: { $sum: { $cond: [{ $eq: ["$part_of_speech", "adjective"] }, 1, 0] } },
      nouns: { $sum: { $cond: [{ $eq: ["$part_of_speech", "noun"] }, 1, 0] } }
    }
  }
]).toArray();

// 데이터가 비어있을 때를 대비한 100% 무결점 폴백(Fallback) 객체 매핑
const baseStats = (rawBaseStats && rawBaseStats.length > 0) 
  ? rawBaseStats[0] 
  : { totalCount: 0, adjectives: 0, nouns: 0 };

// 3. [공통 태그 풀 집계] 
const sharedTagPool = db.getCollection("words").aggregate([
  { $unwind: "$tags" },
  {
    $group: {
      _id: "$tags",
      count: { $sum: 1 },
      avgWeight: { $avg: "$weight" }
    }
  }
]).toArray() || [];

// 4. [태그 개수 지표 집계] 순수 유니크 태그의 절대 총합 산출
const uniqueTagCount = sharedTagPool.length;

// 5. [다중 속성 단어 스캔] 가장 많은 태그를 보유한 단어 TOP 5 추적
const multiTagWords = db.getCollection("words").aggregate([
  {
    $project: {
      word_en: 1,
      word_ko: 1,
      tagCount: { $size: { $ifNull: ["$tags", []] } },
      tags: 1
    }
  },
  { $sort: { tagCount: -1, word_en: 1 } },
  { $limit: 5 }
]).toArray() || [];

// 6. [상/하위 15 정렬] 활성 및 비활성 리스트 팩 구성
const top15Stats = [...sharedTagPool]
  .sort((a, b) => b.count - a.count || b.avgWeight - a.avgWeight)
  .slice(0, 15);

const bottom15Stats = [...sharedTagPool]
  .sort((a, b) => a.count - b.count || a.avgWeight - b.avgWeight)
  .slice(0, 15);

// 황금 비율 계산 시 0 나누기 및 NaN 방어 코드 적용
const ratio = baseStats.adjectives > 0 
  ? (baseStats.nouns / baseStats.adjectives).toFixed(2) 
  : "0.00";

// ====================================================================
// 📊 [Logos Architect] 마스터 데이터베이스 통합 대시보드 출력
// ====================================================================
print(`================================================================`);
print(`📊 [Logos Architect] 데이터베이스 인프라 통합 모니터링 리포트`);
print(`================================================================`);
print(`🍃 전체 적재 단어 수   : ${baseStats.totalCount} 개`);
print(`📐 형용사(Adjective) 수: ${baseStats.adjectives} 개`);
print(`📦 명사(Noun) 수       : ${baseStats.nouns} 개`);
print(`⚖️ 현재 조립 황금 비율  : 1 : ${ratio}`);
print(`----------------------------------------------------------------`);
print(`🏷️ [태그 인프라 스코프 지표]`);
print(`----------------------------------------------------------------`);
print(`🔮 현재 사출된 순수 유니크 태그 총 개수: ${uniqueTagCount} 개`);
print(`----------------------------------------------------------------`);

if (uniqueTagCount === 0) {
  print(`ℹ️ 현재 조건에 매칭되는 활성 태그 데이터가 데이터베이스에 없습니다.`);
} else {
  print(`🌌 최상위 활성 태그 TOP 15 (실시간 가차 믹싱 점수 상위권)`);
  print(`----------------------------------------------------------------`);
  top15Stats.forEach((tag, idx) => {
    const rank = String(idx + 1).padStart(2, '0');
    const tagName = tag._id.padEnd(12, ' ');
    const totalBar = "■".repeat(Math.min(tag.count, 20));
    print(`[${rank}] ${tagName} | 계수: ${String(tag.count).padStart(2, ' ')}개 | 평균 가중치: ${tag.avgWeight.toFixed(1)}점 | ${totalBar}`);
  });

  print(`----------------------------------------------------------------`);
  print(`⚠️ 최하위 비활성 태그 BOTTOM 15 (단어 풀 보강 필요 지표)`);
  print(`----------------------------------------------------------------`);
  bottom15Stats.forEach((tag, idx) => {
    const rank = String(idx + 1).padStart(2, '0');
    const tagName = tag._id.padEnd(12, ' ');
    const totalBar = "□".repeat(Math.min(tag.count, 20));
    print(`[${rank}] ${tagName} | 계수: ${String(tag.count).padStart(2, ' ')}개 | 평균 가중치: ${tag.avgWeight.toFixed(1)}점 | ${totalBar}`);
  });
}

print(`----------------------------------------------------------------`);
print(`👑 [다중 속성 제어] 가장 많은 태그를 징집한 단어 TOP 5`);
print(`----------------------------------------------------------------`);
if (multiTagWords.length === 0) {
  print(`ℹ️ 다중 속성 분석 데이터가 없습니다.`);
} else {
  multiTagWords.forEach((word, idx) => {
    const rank = String(idx + 1).padStart(2, '0');
    const wordInfo = `${word.word_en}(${word.word_ko})`.padEnd(20, ' ');
    const tagsList = word.tags ? word.tags.join(', ') : '';
    print(`[${rank}] ${wordInfo} | 보유 태그 수: ${word.tagCount}개 | 목록: [${tagsList}]`);
  });
}
print(`================================================================`);
