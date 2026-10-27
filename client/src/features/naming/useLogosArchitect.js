import { useCallback, useEffect, useRef, useState } from 'react';
import {
  generateName as requestName,
  getTags,
  getWords,
} from '../../services/logosApi.js';

const PAGE_SIZE = 20; // 사전 API 기본 페이지 크기와 일치시킨다.

function isAbortError(error) {
  return error?.name === 'AbortError';
}

/**
 * 작명 화면의 태그·사전 조회와 생성 요청 상태를 기능 단위로 관리한다.
 */
export default function useLogosArchitect() {
  const [tags, setTags] = useState([]);
  const [tagsLoading, setTagsLoading] = useState(true);
  const [tagsError, setTagsError] = useState(null);
  const [selectedTags, setSelectedTags] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: PAGE_SIZE,
    total: 0,
    totalPages: 0,
  });
  const [retrySequence, setRetrySequence] = useState(0);
  const [words, setWords] = useState([]);
  const [wordsLoading, setWordsLoading] = useState(true);
  const [wordsError, setWordsError] = useState(null);
  const [generation, setGeneration] = useState({
    status: 'idle',
    result: null,
    error: null,
  });
  const generationSequence = useRef(0);
  const generationController = useRef(null);
  const wordsSequence = useRef(0);
  const wordsController = useRef(null);

  // 새 검색 조건이 적용되기 전에 진행 중인 조회와 그 응답을 무효화한다.
  const invalidateWordsRequest = useCallback(() => {
    wordsSequence.current += 1;
    wordsController.current?.abort();
    wordsController.current = null;
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    getTags(controller.signal)
      .then((data) => {
        setTags(data);
        setTagsError(null);
      })
      .catch((error) => {
        if (!isAbortError(error)) {
          setTagsError(error.message);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setTagsLoading(false);
        }
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    // 입력 중 매 키 입력마다 API를 호출하지 않고, 확정 검색어가 바뀔 때 첫 페이지로 돌아간다.
    const timeout = setTimeout(() => {
      const query = searchQuery.trim();
      if (query !== debouncedSearchQuery) {
        setPage(1);
        setDebouncedSearchQuery(query);
      }
    }, 250);
    return () => clearTimeout(timeout);
  }, [searchQuery, debouncedSearchQuery]);

  useEffect(() => {
    // 생성 결과는 선택 태그에 종속되므로 태그가 바뀌면 기존 결과를 취소하고 초기화한다.
    generationSequence.current += 1;
    generationController.current?.abort();
    generationController.current = null;
    setGeneration({ status: 'idle', result: null, error: null });
  }, [selectedTags]);

  useEffect(() => {
    // 페이지와 필터를 포함한 서버 조회이며, 순번 검사로 늦게 도착한 이전 응답을 무시한다.
    const controller = new AbortController();
    const sequence = ++wordsSequence.current;
    wordsController.current = controller;
    setWordsLoading(true);
    setWordsError(null);

    getWords(
      {
        tags: selectedTags,
        query: debouncedSearchQuery,
        page,
        pageSize: PAGE_SIZE,
      },
      controller.signal,
    )
      .then((result) => {
        if (sequence === wordsSequence.current) {
          setWords(result.items);
          setPagination(result.pagination);
        }
      })
      .catch((error) => {
        if (!isAbortError(error) && sequence === wordsSequence.current) {
          setWordsError(error.message);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted && sequence === wordsSequence.current) {
          setWordsLoading(false);
          wordsController.current = null;
        }
      });

    return () => {
      controller.abort();
      if (wordsController.current === controller) {
        wordsSequence.current += 1;
        wordsController.current = null;
      }
    };
  }, [selectedTags, debouncedSearchQuery, page, retrySequence]);

  useEffect(
    () => () => {
      // 화면이 사라지면 진행 중인 요청을 끝내 상태 갱신이 남지 않게 한다.
      generationSequence.current += 1;
      generationController.current?.abort();
      invalidateWordsRequest();
    },
    [invalidateWordsRequest],
  );

  const toggleTag = useCallback(
    (tag) => {
      invalidateWordsRequest();
      setPage(1);
      setSelectedTags((current) =>
        current.includes(tag)
          ? current.filter((selected) => selected !== tag)
          : [...current, tag],
      );
    },
    [invalidateWordsRequest],
  );

  const clearTags = useCallback(() => {
    if (selectedTags.length === 0) {
      return;
    }

    invalidateWordsRequest();
    setPage(1);
    setSelectedTags([]);
  }, [invalidateWordsRequest, selectedTags.length]);

  const updateSearchQuery = useCallback((query) => {
    setSearchQuery(query);
  }, []);

  const changePage = useCallback(
    (nextPage) => {
      // 현재 결과 범위를 벗어난 페이지 이동은 요청하지 않는다.
      if (nextPage < 1 || nextPage > pagination.totalPages || nextPage === page) {
        return;
      }

      invalidateWordsRequest();
      setPage(nextPage);
    },
    [invalidateWordsRequest, page, pagination.totalPages],
  );

  const retryWords = useCallback(() => {
    invalidateWordsRequest();
    // 조회 효과가 다시 실행되도록 재시도 순번을 바꾼다.
    setRetrySequence((current) => current + 1);
  }, [invalidateWordsRequest]);

  const generate = useCallback(async () => {
    generationController.current?.abort();
    const controller = new AbortController();
    generationController.current = controller;
    const sequence = ++generationSequence.current;
    setGeneration({ status: 'loading', result: null, error: null });

    try {
      const result = await requestName(selectedTags, controller.signal);
      // 취소가 늦게 반영되어도 최신 생성 요청의 결과만 사용한다.
      if (sequence === generationSequence.current) {
        setGeneration({ status: 'success', result, error: null });
      }
    } catch (error) {
      if (!isAbortError(error) && sequence === generationSequence.current) {
        setGeneration({ status: 'error', result: null, error: error.message });
      }
    } finally {
      if (sequence === generationSequence.current) {
        generationController.current = null;
      }
    }
  }, [selectedTags]);

  return {
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
  };
}
