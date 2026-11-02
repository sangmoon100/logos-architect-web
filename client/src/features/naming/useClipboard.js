import { useCallback, useEffect, useRef, useState } from 'react';

const FEEDBACK_DURATION_MS = 500;

async function writeText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export default function useClipboard() {
  const [status, setStatus] = useState('idle');
  const timerRef = useRef(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearTimeout(timerRef.current);
    };
  }, []);

  const copy = useCallback(async (text) => {
    const copied = await writeText(text);
    if (!mountedRef.current) {
      return copied;
    }

    setStatus(copied ? 'copied' : 'failed');
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (mountedRef.current) {
        setStatus('idle');
      }
    }, FEEDBACK_DURATION_MS);

    return copied;
  }, []);

  return { copy, status };
}
