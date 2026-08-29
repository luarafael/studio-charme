import { API_ERROR_MESSAGES, type ApiErrorCode } from '@studio-charme/contracts';

/** Aceita host sem protocolo (erro comum na Vercel) e remove `/api/v1` no final. */
export function resolveApiUrl(raw: string | undefined): string {
  const fallback = 'http://localhost:3333';
  let value = raw?.trim() || fallback;

  if (!/^https?:\/\//i.test(value)) {
    value = `https://${value}`;
  }

  value = value.replace(/\/+$/, '').replace(/\/api\/v1$/i, '');

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return fallback;
    }
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return fallback;
  }
}

const API_URL = resolveApiUrl(import.meta.env.VITE_API_URL as string | undefined);

let csrfToken: string | null = null;

export function setCsrfToken(token: string | null): void {
  csrfToken = token;
}

export function getCsrfToken(): string | null {
  return csrfToken;
}

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly fields?: { path: string; message: string }[];

  constructor(
    status: number,
    code: ApiErrorCode,
    message: string,
    fields?: { path: string; message: string }[],
  ) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  search?: Record<string, string | undefined>;
};

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? 'GET';
  const url = new URL(`/api/v1${path}`, `${API_URL}/`);

  if (options.search) {
    for (const [key, value] of Object.entries(options.search)) {
      if (value) url.searchParams.set(key, value);
    }
  }

  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (method !== 'GET' && csrfToken) headers['X-CSRF-Token'] = csrfToken;

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      credentials: 'include',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new ApiClientError(
      0,
      'INTERNAL_ERROR',
      'Não foi possível conectar à API. Confira VITE_API_URL e o CORS (WEB_ORIGINS).',
    );
  }

  if (response.status === 204) return undefined as T;

  const payload = (await response.json().catch(() => null)) as
    | T
    | { error?: { code?: ApiErrorCode; message?: string; fields?: { path: string; message: string }[] } }
    | null;

  if (!response.ok) {
    const error = payload && typeof payload === 'object' && 'error' in payload ? payload.error : undefined;
    const code = error?.code ?? 'INTERNAL_ERROR';
    throw new ApiClientError(
      response.status,
      code,
      error?.message ?? API_ERROR_MESSAGES[code],
      error?.fields,
    );
  }

  return payload as T;
}

export async function ensureCsrfToken(): Promise<string> {
  const data = await api<{ csrfToken: string }>('/auth/csrf');
  setCsrfToken(data.csrfToken);
  return data.csrfToken;
}
