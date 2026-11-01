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
      className="mt-6 rounded-2xl border border-slate-200/60 bg-white p-4 text-slate-800 shadow-sm sm:mt-8 sm:p-7"
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

      <div className="rounded-xl border border-slate-200 md:overflow-x-auto">
        <table role="table" className="block w-full text-left text-sm md:table md:table-fixed">
          <caption className="sr-only">영어 단어, 한글 뜻, 발음, 태그 목록</caption>
          <thead role="rowgroup" className="sr-only bg-slate-50 text-xs uppercase tracking-wide text-slate-500 md:not-sr-only md:table-header-group">
            <tr role="row" className="md:table-row">
              <th role="columnheader" scope="col" className="w-[22%] px-4 py-3">영어</th>
              <th role="columnheader" scope="col" className="w-[22%] px-4 py-3">한글</th>
              <th role="columnheader" scope="col" className="w-[22%] px-4 py-3">발음</th>
              <th role="columnheader" scope="col" className="w-[34%] px-4 py-3">태그</th>
            </tr>
          </thead>
          <tbody role="rowgroup" className="block divide-y divide-slate-200 md:table-row-group">
            {wordsLoading && (
              <tr role="row" className="block md:table-row">
                <td colSpan={4} role="status" className="block px-4 md:table-cell py-8 text-center text-slate-500">
                  사전 항목을 불러오는 중입니다…
                </td>
              </tr>
            )}
            {wordsError && (
              <tr role="row" className="block md:table-row">
                <td colSpan={4} role="alert" className="block px-4 md:table-cell py-8 text-center text-rose-700">
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
              <tr role="row" className="block md:table-row">
                <td colSpan={4} className="block px-4 md:table-cell py-8 text-center text-slate-500">
                  조건에 맞는 사전 항목이 없습니다.
                </td>
              </tr>
            )}
            {!wordsLoading &&
              !wordsError &&
              words.map((word) => (
                <tr
                  key={word.word_en}
                  role="row"
                  className="block space-y-1.5 p-4 align-top text-slate-700 hover:bg-blue-50/50 md:table-row md:space-y-0 md:p-0"
                >
                  <td role="cell" data-label="영어" className="block wrap-break-word font-medium before:mb-0.5 before:block before:text-xs before:font-semibold before:text-slate-400 before:content-[attr(data-label)] md:before:hidden md:table-cell md:px-4 md:py-3">{word.word_en}</td>
                  <td role="cell" data-label="한글" className="block wrap-break-word before:mb-0.5 before:block before:text-xs before:font-semibold before:text-slate-400 before:content-[attr(data-label)] md:before:hidden md:table-cell md:px-4 md:py-3">{word.word_ko}</td>
                  <td role="cell" data-label="발음" className="block wrap-break-word text-slate-600 before:mb-0.5 before:block before:text-xs before:font-semibold before:text-slate-400 before:content-[attr(data-label)] md:before:hidden md:table-cell md:px-4 md:py-3">
                    {word.pronunciation}
                  </td>
                  <td role="cell" data-label="태그" className="block wrap-break-word text-slate-600 before:mb-0.5 before:block before:text-xs before:font-semibold before:text-slate-400 before:content-[attr(data-label)] md:before:hidden md:table-cell md:px-4 md:py-3">
                    {word.tags.join(', ')}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <p role="status" aria-live="polite" className="text-sm text-slate-500">
          검색 결과 {pagination.total}개
        </p>
        {pagination.totalPages > 1 && (
          <nav aria-label="사전 페이지 이동" className="flex items-center justify-between gap-3 sm:justify-start">
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
