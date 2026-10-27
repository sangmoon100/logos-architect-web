const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const apiBaseUrlValue = configuredApiBaseUrl || 'http://localhost:3001';

let parsedApiBaseUrl;
try {
  parsedApiBaseUrl = new URL(apiBaseUrlValue);
} catch (error) {
  throw new Error('VITE_API_BASE_URL은 유효한 HTTP Origin이어야 합니다', {
    cause: error,
  });
}

if (
  !['http:', 'https:'].includes(parsedApiBaseUrl.protocol) ||
  parsedApiBaseUrl.pathname !== '/' ||
  parsedApiBaseUrl.search ||
  parsedApiBaseUrl.hash ||
  parsedApiBaseUrl.username ||
  parsedApiBaseUrl.password
) {
  throw new Error('VITE_API_BASE_URL에는 경로 없는 HTTP Origin을 설정해야 합니다');
}

export const apiBaseUrl = parsedApiBaseUrl.origin;
