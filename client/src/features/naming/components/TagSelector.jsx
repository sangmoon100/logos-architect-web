import { useMemo, useState } from 'react';

export default function TagSelector({
  tags,
  tagsLoading,
  tagsError,
  selectedTags,
  onToggleTag,
  onClearTags,
  generation,
  onGenerate,
}) {
  const [tagSearch, setTagSearch] = useState('');
  const filteredTags = useMemo(() => {
    const query = tagSearch.trim().toLocaleLowerCase();
    return query
      ? tags.filter((tag) => tag.toLocaleLowerCase().includes(query))
      : tags;
  }, [tagSearch, tags]);

  return (
    <section
      aria-labelledby="tag-heading"
      className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm sm:p-7"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="tag-heading" className="text-lg font-semibold text-slate-800">
            테마 태그
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            여러 태그를 선택하면 어느 하나라도 포함된 단어를 검색합니다.
          </p>
        </div>
        <label className="w-full sm:max-w-xs">
          <span className="sr-only">태그 검색</span>
          <input
            type="search"
            value={tagSearch}
            onChange={(event) => setTagSearch(event.target.value)}
            placeholder="태그 검색"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          />
        </label>
      </div>

      <div
        role="group"
        aria-label="태그 목록"
        className="mt-5 flex max-h-48 flex-wrap gap-2 overflow-x-hidden overflow-y-auto overscroll-contain pr-1"
      >
        {tagsLoading && (
          <p role="status" className="text-sm text-slate-500">
            태그를 불러오는 중입니다…
          </p>
        )}
        {tagsError && (
          <p role="alert" className="text-sm text-rose-700">
            태그를 불러오지 못했습니다: {tagsError}
          </p>
        )}
        {!tagsLoading && !tagsError && tags.length === 0 && (
          <p className="text-sm text-slate-500">등록된 태그가 없습니다.</p>
        )}
        {!tagsLoading &&
          !tagsError &&
          tags.length > 0 &&
          filteredTags.length === 0 && (
            <p className="text-sm text-slate-500">검색 결과가 없습니다.</p>
          )}
        {!tagsLoading &&
          !tagsError &&
          filteredTags.map((tag) => {
            const selected = selectedTags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                aria-pressed={selected}
                aria-label={`${tag} 태그 ${selected ? '선택 해제' : '선택'}`}
                onClick={() => onToggleTag(tag)}
                className={`h-11 shrink-0 whitespace-nowrap rounded-full border px-4 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                  selected
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-slate-200 bg-slate-100/80 text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700'
                }`}
              >
                {tag}
              </button>
            );
          })}
      </div>

      <div className="mt-6 flex flex-col gap-4 border-t border-slate-200 pt-5 sm:flex-row sm:items-center">
        <div
          aria-label="선택한 태그"
          className="flex min-h-11 flex-1 flex-wrap items-center gap-2"
        >
          {selectedTags.length === 0 ? (
            <p className="text-sm text-slate-500">모든 태그에서 작명합니다.</p>
          ) : (
            selectedTags.map((tag) => (
              <button
                key={tag}
                type="button"
                aria-label={`${tag} 칩 제거`}
                onClick={() => onToggleTag(tag)}
                className="min-h-11 rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-sm text-blue-700 hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
              >
                {tag} <span aria-hidden="true">×</span>
              </button>
            ))
          )}
          {selectedTags.length > 0 && (
            <button
              type="button"
              aria-label="선택 태그 모두 해제"
              onClick={onClearTags}
              className="min-h-11 rounded-lg px-3 text-sm font-semibold text-blue-700 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            >
              전체 해제
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={onGenerate}
          disabled={generation.status === 'loading'}
          aria-busy={generation.status === 'loading'}
          className="min-h-12 shrink-0 rounded-xl bg-blue-600 px-7 py-3 font-bold text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-wait disabled:opacity-60 sm:ml-auto"
        >
          {generation.status === 'loading' ? '생성 중…' : '⚡ 생성'}
        </button>
      </div>
    </section>
  );
}
