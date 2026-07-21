/**
 * 安全的 fetch wrapper：
 * - 自動帶 Authorization header（如有 token）
 * - 回傳前檢查 response 是否有 JSON body，避免 "Unexpected end of JSON input"
 * - 非 2xx 時拋出帶有訊息的錯誤
 */
export async function safeFetch(
  url: string,
  options: RequestInit = {},
  token?: string
): Promise<any> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (options.body && typeof options.body === 'string') {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }

  const res = await fetch(url, { ...options, headers });

  // 嘗試解析 JSON，若 body 為空則回傳 null
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    return null;
  }

  const text = await res.text();
  if (!text.trim()) {
    if (!res.ok) throw new Error(`HTTP ${res.status}: empty response`);
    return null;
  }

  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Invalid JSON response: ${text.substring(0, 200)}`);
  }

  if (!res.ok) {
    throw new Error(data?.error || data?.message || `HTTP ${res.status}`);
  }

  return data;
}
