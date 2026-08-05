type FetchWithRetryOptions = RequestInit & {
  retries?: number;
  retryDelayMs?: number;
  retryStatuses?: number[];
};

const defaultRetryStatuses = [429, 500, 502, 503, 504];

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRetryAfterMs(response: Response) {
  const retryAfter = response.headers.get("retry-after");

  if (!retryAfter) {
    return null;
  }

  const retryAfterSeconds = Number(retryAfter);

  if (!Number.isNaN(retryAfterSeconds)) {
    return retryAfterSeconds * 1000;
  }

  const retryAfterDate = Date.parse(retryAfter);

  if (!Number.isNaN(retryAfterDate)) {
    return Math.max(retryAfterDate - Date.now(), 0);
  }

  return null;
}

// Dış API isteklerinde geçici hatalar için kısa bekleyip tekrar deneme yapar.
export async function fetchWithRetry(
  url: string,
  options: FetchWithRetryOptions = {}
) {
  const {
    retries = 2,
    retryDelayMs = 1000,
    retryStatuses = defaultRetryStatuses,
    ...fetchOptions
  } = options;

  const retryStatusSet = new Set(retryStatuses);

  for (let attempt = 0; attempt <= retries; attempt++) {
    const response = await fetch(url, fetchOptions);

    if (!retryStatusSet.has(response.status) || attempt === retries) {
      return response;
    }

    const retryAfterMs = getRetryAfterMs(response);
    const delayMs = retryAfterMs ?? retryDelayMs * (attempt + 1);

    await wait(delayMs);
  }

  return fetch(url, fetchOptions);
}