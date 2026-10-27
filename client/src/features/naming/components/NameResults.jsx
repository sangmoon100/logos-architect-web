const resultCards = [
  { key: 'mix', title: '추천 믹스 명칭' },
  { key: 'translation', title: '한글 번역 명칭' },
  { key: 'english', title: '영어 원문 및 음독' },
];

export default function NameResults({ generation }) {
  return (
    <section
      aria-labelledby="results-heading"
      className="mt-8 rounded-2xl border border-slate-200/60 bg-white p-5 text-slate-800 shadow-sm sm:p-7"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
            Name generator
          </p>
          <h2 id="results-heading" className="mt-2 text-xl font-semibold">
            작명 결과
          </h2>
        </div>
      </div>

      {generation.status === 'loading' && (
        <p role="status" className="mt-6 text-sm text-slate-500">
          이름을 조합하고 있습니다…
        </p>
      )}
      {generation.error && (
        <p role="alert" className="mt-6 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">
          작명하지 못했습니다: {generation.error}
        </p>
      )}
      {!generation.result && generation.status === 'idle' && (
        <p className="mt-6 text-sm text-slate-500">
          생성 버튼을 눌러 세 가지 형식의 이름을 확인하세요.
        </p>
      )}
      {generation.result && (
        <div className="mt-6 space-y-7">
          {generation.result.map((result) => (
            <article
              key={result.caseType}
              className="border-t border-slate-200 pt-6 first:border-t-0 first:pt-0"
            >
              <h3 className="mb-4 text-sm font-semibold text-slate-700">
                {result.caseType === 'noun'
                  ? '명사 단독 추출 프로토콜'
                  : '형용사 + 명사 결합 프로토콜'}
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {resultCards.map(({ key, title }) => (
                  <div
                    key={key}
                    className={`min-w-0 rounded-xl p-5 sm:p-6 ${
                      key === 'mix'
                        ? 'bg-slate-900 text-cyan-400'
                        : 'bg-slate-50 text-slate-800'
                    }`}
                  >
                    <h4
                      className={`text-xs font-semibold ${
                        key === 'mix' ? 'text-slate-300' : 'text-slate-500'
                      }`}
                    >
                      {title}
                    </h4>
                    {key === 'english' ? (
                      <>
                        <p className="mt-4 wrap-break-word text-lg font-semibold text-slate-800">
                          {result.english}
                        </p>
                        <p className="mt-2 wrap-break-word text-sm text-slate-600">
                          ({result.pronunciation})
                        </p>
                      </>
                    ) : (
                      <p className="mt-4 wrap-break-word text-lg font-semibold leading-7">
                        {result[key]}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
