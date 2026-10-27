import useLogosArchitect from './features/naming/useLogosArchitect.js';
import DictionaryTable from './features/naming/components/DictionaryTable.jsx';
import LogosHeader from './features/naming/components/LogosHeader.jsx';
import NameResults from './features/naming/components/NameResults.jsx';
import TagSelector from './features/naming/components/TagSelector.jsx';

export default function App() {
  const {
    tags,
    tagsLoading,
    tagsError,
    selectedTags,
    toggleTag,
    clearTags,
    searchQuery,
    updateSearchQuery,
    pagination,
    changePage,
    retryWords,
    words,
    wordsLoading,
    wordsError,
    generation,
    generate,
  } = useLogosArchitect();

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-800 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-7xl">
        <LogosHeader />
        <TagSelector
          tags={tags}
          tagsLoading={tagsLoading}
          tagsError={tagsError}
          selectedTags={selectedTags}
          onToggleTag={toggleTag}
          onClearTags={clearTags}
          generation={generation}
          onGenerate={generate}
        />
        <NameResults generation={generation} />
        <DictionaryTable
          selectedTagCount={selectedTags.length}
          searchQuery={searchQuery}
          onSearchQueryChange={updateSearchQuery}
          pagination={pagination}
          onPageChange={changePage}
          onRetry={retryWords}
          words={words}
          wordsLoading={wordsLoading}
          wordsError={wordsError}
        />
        <footer className="mt-10 border-t border-slate-200 py-6">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-sm font-semibold text-slate-600">
              📫 Contact Me (연락처)
            </h2>
            <nav aria-label="연락처" className="flex items-center gap-2">
              <a
                href="https://discord.com/users/852514294943318096"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Discord 연락처 열기"
              >
                <img
                  src="https://img.shields.io/badge/-5865F2?style=for-the-badge&logo=discord&logoColor=black"
                  alt="Discord"
                  referrerPolicy="no-referrer"
                />
              </a>
              <a
                href="https://github.com/sangmoon100/sangmoon100"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub 프로필 방문"
              >
                <img
                  src="https://img.shields.io/badge/-181717?style=for-the-badge&logo=github&logoColor=white"
                  alt="GitHub"
                  referrerPolicy="no-referrer"
                />
              </a>
              <a href="mailto:tkdans100@naver.com" aria-label="Naver 메일 보내기">
                <img
                  src="https://img.shields.io/badge/-03C75A?style=for-the-badge&logo=naver&logoColor=black"
                  alt="Naver"
                  referrerPolicy="no-referrer"
                />
              </a>
            </nav>
          </div>
        </footer>
      </div>
    </main>
  );
}
