import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App.jsx';
import { generateName, getTags, getWords } from './services/logosApi.js';

vi.mock('./services/logosApi.js', () => ({
  generateName: vi.fn(),
  getTags: vi.fn(),
  getWords: vi.fn(),
}));

const wordRecords = [
  {
    word_en: 'Frantic',
    word_ko: '광란의',
    pronunciation: '프랜틱',
    part_of_speech: 'adjective',
    tags: ['#광기', '#게헨나'],
  },
  {
    word_en: 'Providence',
    word_ko: '섭리',
    pronunciation: '프로비던스',
    part_of_speech: 'noun',
    tags: ['#신비'],
  },
];

beforeEach(() => {
  vi.resetAllMocks();
  getTags.mockResolvedValue(['#광기', '#게헨나', '#신비']);
  getWords.mockImplementation(async ({ tags, query, page, pageSize }) => {
    const matchingWords = wordRecords.filter(
      (word) =>
        (tags.length === 0 || word.tags.some((tag) => tags.includes(tag))) &&
        (!query ||
          [word.word_en, word.word_ko, word.pronunciation, ...word.tags]
            .join(' ')
            .toLocaleLowerCase()
            .includes(query.toLocaleLowerCase())),
    );
    const start = (page - 1) * pageSize;

    return {
      items: matchingWords.slice(start, start + pageSize),
      pagination: {
        page,
        pageSize,
        total: matchingWords.length,
        totalPages: Math.ceil(matchingWords.length / pageSize),
      },
    };
  });
  generateName.mockResolvedValue([
    {
      caseType: 'adjective_noun',
      mix: '광란의 프로비던스',
      translation: '광란의 섭리',
      english: 'Frantic Providence',
      pronunciation: '프랜틱 프로비던스',
    },
    {
      caseType: 'noun',
      mix: '만마전',
      translation: '만마전',
      english: 'Pandemonium',
      pronunciation: '팬더모니엄',
    },
  ]);
});

describe('Logos Architect workspace', () => {
  it('places the contact label beside its links in the footer', () => {
    const { container } = render(<App />);
    const footer = container.querySelector('footer');

    expect(
      within(footer).getByRole('heading', { name: '📫 Contact Me (연락처)' }),
    ).toBeInTheDocument();
    expect(
      within(footer).getByRole('link', { name: 'Discord 연락처 열기' }),
    ).toHaveAttribute(
      'href',
      'https://discord.com/users/852514294943318096',
    );
    expect(
      within(footer).getByRole('link', { name: 'GitHub 프로필 방문' }),
    ).toHaveAttribute('href', 'https://github.com/sangmoon100/sangmoon100');
    expect(
      within(footer).getByRole('link', { name: 'Naver 메일 보내기' }),
    ).toHaveAttribute('href', 'mailto:tkdans100@naver.com');
  });

  it('loads tags and dictionary rows', async () => {
    render(<App />);

    expect(await screen.findByText('Frantic')).toBeInTheDocument();
    expect(screen.getByText('Providence')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '#게헨나 태그 선택' })).toBeInTheDocument();
  });

  it('searches tags and synchronizes multi-selection with the dictionary', async () => {
    render(<App />);
    await screen.findByRole('button', { name: '#게헨나 태그 선택' });

    fireEvent.change(screen.getByRole('searchbox', { name: '태그 검색' }), {
      target: { value: '신비' },
    });
    expect(screen.getByRole('button', { name: '#신비 태그 선택' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '#광기 태그 선택' })).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole('searchbox', { name: '태그 검색' }), {
      target: { value: '' },
    });
    fireEvent.click(screen.getByRole('button', { name: '#게헨나 태그 선택' }));
    fireEvent.click(screen.getByRole('button', { name: '#신비 태그 선택' }));

    await waitFor(() => {
      expect(getWords.mock.lastCall[0].tags).toEqual(['#게헨나', '#신비']);
    });
    expect(screen.getByRole('button', { name: '#게헨나 칩 제거' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '#신비 칩 제거' })).toBeInTheDocument();
    expect(screen.getByText('Frantic')).toBeInTheDocument();
    expect(screen.getByText('Providence')).toBeInTheDocument();
  });

  it('clears all selected tags and reloads the unfiltered dictionary', async () => {
    render(<App />);
    await screen.findByRole('button', { name: '#게헨나 태그 선택' });

    fireEvent.click(screen.getByRole('button', { name: '#게헨나 태그 선택' }));
    fireEvent.click(screen.getByRole('button', { name: '#신비 태그 선택' }));
    expect(screen.getByRole('button', { name: '#게헨나 칩 제거' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '#신비 칩 제거' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '선택 태그 모두 해제' }));

    await waitFor(() => {
      expect(getWords.mock.lastCall[0].tags).toEqual([]);
    });
    expect(screen.queryByRole('button', { name: '#게헨나 칩 제거' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '#신비 칩 제거' })).not.toBeInTheDocument();
    expect(screen.getByText('모든 태그에서 작명합니다.')).toBeInTheDocument();
  });

  it('searches dictionary fields and paginates the results', async () => {
    const words = Array.from({ length: 25 }, (_, index) => ({
      word_en: `Word${index + 1}`,
      word_ko: `뜻${index + 1}`,
      pronunciation: `발음${index + 1}`,
      part_of_speech: 'noun',
      tags: ['#전체'],
    }));
    getTags.mockResolvedValue(['#전체']);
    getWords.mockImplementation(async ({ tags, query, page, pageSize }) => {
      const matchingWords = words.filter(
        (word) =>
          (tags.length === 0 || word.tags.some((tag) => tags.includes(tag))) &&
          [word.word_en, word.word_ko, word.pronunciation, ...word.tags]
            .join(' ')
            .toLocaleLowerCase()
            .includes(query.toLocaleLowerCase()),
      );
      const start = (page - 1) * pageSize;

      return {
        items: matchingWords.slice(start, start + pageSize),
        pagination: {
          page,
          pageSize,
          total: matchingWords.length,
          totalPages: Math.ceil(matchingWords.length / pageSize),
        },
      };
    });

    render(<App />);
    expect(await screen.findByText('Word1')).toBeInTheDocument();
    expect(screen.getByText('Word20')).toBeInTheDocument();
    expect(screen.queryByText('Word21')).not.toBeInTheDocument();
    expect(screen.getByText('1 / 2')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    await waitFor(() => expect(getWords.mock.lastCall[0].page).toBe(2));
    expect(await screen.findByText('Word21')).toBeInTheDocument();

    fireEvent.change(screen.getByRole('searchbox', { name: '사전 검색' }), {
      target: { value: 'Word2' },
    });
    await waitFor(() => expect(getWords.mock.lastCall[0].query).toBe('Word2'));
    expect(await screen.findByText('Word20')).toBeInTheDocument();
    expect(screen.queryByText('Word1')).not.toBeInTheDocument();
    expect(screen.getByText('검색 결과 7개')).toBeInTheDocument();
    expect(
      screen.queryByRole('navigation', { name: '사전 페이지 이동' }),
    ).not.toBeInTheDocument();
  });

  it('retries dictionary requests after a load failure', async () => {
    getWords.mockRejectedValueOnce(new Error('일시적인 연결 오류'));
    render(<App />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '일시적인 연결 오류',
    );
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));

    expect(await screen.findByText('Frantic')).toBeInTheDocument();
    expect(getWords).toHaveBeenCalledTimes(2);
  });

  it('retries a failed dictionary request', async () => {
    getWords.mockRejectedValueOnce(new Error('일시적인 연결 오류'));
    render(<App />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '일시적인 연결 오류',
    );
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));

    expect(await screen.findByText('Frantic')).toBeInTheDocument();
    expect(getWords).toHaveBeenCalledTimes(2);
  });

  it('keeps a large tag pool scrollable without expanding the page', async () => {
    getTags.mockResolvedValue(
      Array.from({ length: 100 }, (_, index) => `#태그${index}`),
    );
    render(<App />);
    await screen.findByRole('button', { name: '#태그0 태그 선택' });

    const tagList = screen.getByRole('group', { name: '태그 목록' });
    expect(tagList).toHaveClass('max-h-48', 'overflow-y-auto');
    expect(
      screen.getByRole('button', { name: '#태그99 태그 선택' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '더 보기' }),
    ).not.toBeInTheDocument();
  });

  it('renders the three generated name formats', async () => {
    render(<App />);
    await screen.findByRole('button', { name: '#게헨나 태그 선택' });

    fireEvent.click(screen.getByRole('button', { name: /생성/ }));

    expect(await screen.findByText('광란의 프로비던스')).toBeInTheDocument();
    expect(screen.getByText('광란의 섭리')).toBeInTheDocument();
    expect(screen.getByText('Frantic Providence')).toBeInTheDocument();
    expect(screen.getByText('(프랜틱 프로비던스)')).toBeInTheDocument();
    expect(screen.getAllByText('만마전')).toHaveLength(2);
    expect(
      screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent),
    ).toEqual(['형용사 + 명사 결합 프로토콜', '명사 단독 추출 프로토콜']);
  });

  it('shows generation failures and preserves the empty dictionary state', async () => {
    getWords.mockResolvedValue({
      items: [],
      pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    });
    generateName.mockRejectedValue(new Error('서버에 연결할 수 없습니다'));
    render(<App />);

    expect(await screen.findByText('조건에 맞는 사전 항목이 없습니다.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /생성/ }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('서버에 연결할 수 없습니다');
    });
  });
});
