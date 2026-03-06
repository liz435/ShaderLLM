import { useState, useEffect, useCallback } from 'react';

interface ApiStatus {
  online: boolean;
  provider: string | null;
  model: string | null;
  promptVersion: number | null;
  promptVersions: number[];
  checking: boolean;
}

export function useApiStatus(pollInterval = 30_000): ApiStatus {
  const [status, setStatus] = useState<ApiStatus>({
    online: false,
    provider: null,
    model: null,
    promptVersion: null,
    promptVersions: [],
    checking: true,
  });

  const check = useCallback(async () => {
    try {
      const res = await fetch('/api/health', { signal: AbortSignal.timeout(5000) });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setStatus({
        online: true,
        provider: data.provider ?? null,
        model: data.model ?? null,
        promptVersion: data.prompt_version ?? null,
        promptVersions: data.prompt_versions ?? [],
        checking: false,
      });
    } catch {
      setStatus((prev) => ({ ...prev, online: false, checking: false }));
    }
  }, []);

  useEffect(() => {
    check();
    const id = setInterval(check, pollInterval);
    return () => clearInterval(id);
  }, [check, pollInterval]);

  return status;
}
