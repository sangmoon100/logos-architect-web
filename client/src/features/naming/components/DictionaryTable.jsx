export default function DictionaryTable({
  selectedTagCount,
  searchQuery,
  onSearchQueryChange,
  pagination,
  onPageChange,
  onRetry,
  words,
  wordsLoading,
  wordsError,
}) {
  return (
    <section
      aria-labelledby="dictionary-heading"
      className="mt-8 rounded-2xl border border-slate-200/60 bg-white p-5 text-slate-800 shadow-sm sm:p-7"
    >
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
            Word archive
          </p>
          <h2 id="dictionary-heading" className="mt-2 text-xl font-semibold">
            로고스 근원 지식 사전
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {selectedTagCount > 0
              ? `선택한 ${selectedTagCount}개 태그에 해당하는 단어`
              : '전체 단어 목록'}
          </p>
        </div>
        <label className="w-full sm:max-w-sm">
          <span className="sr-only">사전 검색</span>
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            maxLength={100}
            placeholder="영어·한글·발음·태그 검색"
            className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-800 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          />
        </label>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-xl table-fixed text-left text-sm">
          <caption className="sr-only">영어 단어, 한글 뜻, 발음, 태그 목록</caption>
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th scope="col" className="w-[22%] px-4 py-3">영어</th>
              <th scope="col" className="w-[22%] px-4 py-3">한글</th>
              <th scope="col" className="w-[22%] px-4 py-3">발음</th>
              <th scope="col" className="w-[34%] px-4 py-3">태그</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {wordsLoading && (
              <tr>
                <td colSpan={4} role="status" className="px-4 py-8 text-center text-slate-500">
                  사전 항목을 불러오는 중입니다…
                </td>
              </tr>
            )}
            {wordsError && (
              <tr>
                <td colSpan={4} role="alert" className="px-4 py-8 text-center text-rose-700">
                  <div className="flex flex-col items-center gap-3">
                    <p>사전 항목을 불러오지 못했습니다: {wordsError}</p>
                    <button
                      type="button"
                      onClick={onRetry}
                      className="min-h-11 rounded-lg border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
                    >
                      다시 시도
                    </button>
                  </div>
                </td>
              </tr>
            )}
            {!wordsLoading && !wordsError && words.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                  조건에 맞는 사전 항목이 없습니다.
                </td>
              </tr>
            )}
            {!wordsLoading &&
              !wordsError &&
              words.map((word) => (
                <tr key={word.word_en} className="align-top text-slate-700 hover:bg-blue-50/50">
                  <td className="wrap-break-word px-4 py-3 font-medium">{word.word_en}</td>
                  <td className="wrap-break-word px-4 py-3">{word.word_ko}</td>
                  <td className="wrap-break-word px-4 py-3 text-slate-600">
                    {word.pronunciation}
                  </td>
                  <td className="wrap-break-word px-4 py-3 text-slate-600">
                    {word.tags.join(', ')}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p role="status" aria-live="polite" className="text-sm text-slate-500">
          검색 결과 {pagination.total}개
        </p>
        {pagination.totalPages > 1 && (
          <nav aria-label="사전 페이지 이동" className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1 || wordsLoading}
              className="min-h-11 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              이전
            </button>
            <span className="text-sm text-slate-600">
              {pagination.page} / {pagination.totalPages}
            </span>
            <button
              type="button"
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages || wordsLoading}
              className="min-h-11 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              다음
            </button>
          </nav>
        )}
      </div>
    </section>
  );
}
