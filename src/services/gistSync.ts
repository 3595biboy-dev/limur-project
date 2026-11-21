import { GIST_FILENAME, normalizeMultiProjectStore } from '../data/defaultData';
import { MultiProjectStore } from '../types/dashboard';

export interface FetchGistResult {
  status: 'not-modified' | 'updated';
  etag: string | null;
  data?: MultiProjectStore;
}

function buildHeaders(token?: string, etag?: string | null): HeadersInit {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
  };
  if (token && token.trim()) {
    headers['Authorization'] = `Bearer ${token.trim()}`;
  }
  if (etag && etag.trim()) {
    headers['If-None-Match'] = etag.trim();
  }
  return headers;
}

export async function fetchGistWithEtag(
  gistId: string,
  token?: string,
  etag?: string | null
): Promise<FetchGistResult> {
  const cleanId = gistId.trim();
  if (!cleanId) {
    throw new Error('Не указан Gist ID');
  }

  const response = await fetch(
    `https://api.github.com/gists/${encodeURIComponent(cleanId)}`,
    {
      method: 'GET',
      headers: buildHeaders(token, etag),
      cache: 'no-store',
    }
  );

  if (response.status === 304) {
    return {
      status: 'not-modified',
      etag: etag ?? null,
    };
  }

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Gist не найден (404). Проверьте Gist ID.');
    }
    if (response.status === 401 || response.status === 403) {
      throw new Error('Ошибка доступа к GitHub API. Проверьте токен или лимит запросов.');
    }
    throw new Error(`Ошибка GitHub API (${response.status})`);
  }

  const nextEtag = response.headers.get('ETag') || response.headers.get('etag');
  const json = await response.json();
  const files = json?.files as Record<string, { content?: string }> | undefined;

  if (!files) {
    throw new Error('В выбранном Gist отсутствуют файлы.');
  }

  const targetFile =
    files[GIST_FILENAME] ||
    Object.values(files).find((f) => typeof f?.content === 'string');

  if (!targetFile || typeof targetFile.content !== 'string') {
    throw new Error('Файл данных дашборда в Gist не найден.');
  }

  const parsed = JSON.parse(targetFile.content);
  const data = normalizeMultiProjectStore(parsed);

  return {
    status: 'updated',
    etag: nextEtag,
    data,
  };
}

export async function createPrivateGist(
  store: MultiProjectStore,
  token: string
): Promise<{ gistId: string; etag: string | null }> {
  const cleanToken = token.trim();
  if (!cleanToken) {
    throw new Error('Для создания Gist введите GitHub Personal Access Token.');
  }

  const payload = {
    description: 'LimurProject — Дашборд дизайн-проектов',
    public: false,
    files: {
      [GIST_FILENAME]: {
        content: JSON.stringify(
          { ...store, updatedAt: new Date().toISOString() },
          null,
          2
        ),
      },
    },
  };

  const response = await fetch('https://api.github.com/gists', {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${cleanToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Неверный GitHub токен (401).');
    }
    throw new Error(`Не удалось создать Gist (${response.status}).`);
  }

  const nextEtag = response.headers.get('ETag') || response.headers.get('etag');
  const created = await response.json();
  return {
    gistId: created.id as string,
    etag: nextEtag,
  };
}

export async function updateGist(
  gistId: string,
  store: MultiProjectStore,
  token: string
): Promise<{ etag: string | null }> {
  const cleanId = gistId.trim();
  const cleanToken = token.trim();
  if (!cleanId || !cleanToken) {
    throw new Error('Укажите Gist ID и GitHub токен для сохранения.');
  }

  const payload = {
    files: {
      [GIST_FILENAME]: {
        content: JSON.stringify(
          { ...store, updatedAt: new Date().toISOString() },
          null,
          2
        ),
      },
    },
  };

  const response = await fetch(
    `https://api.github.com/gists/${encodeURIComponent(cleanId)}`,
    {
      method: 'PATCH',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${cleanToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('Нет прав на изменение этого Gist. Проверьте scope "gist".');
    }
    if (response.status === 404) {
      throw new Error('Gist для обновления не найден (404).');
    }
    throw new Error(`Ошибка сохранения в Gist (${response.status}).`);
  }

  const nextEtag = response.headers.get('ETag') || response.headers.get('etag');
  return { etag: nextEtag };
}
