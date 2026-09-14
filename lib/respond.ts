import { VercelResponse } from "@vercel/node";

export interface CacheOptions {
  maxAge?: number;
  sMaxAge?: number;
  staleWhileRevalidate?: number;
}

export function cacheHeaders(res: VercelResponse, opts: CacheOptions = {}) {
  const maxAge = opts.maxAge ?? 3600;
  const sMaxAge = opts.sMaxAge ?? 86400;
  const swr = opts.staleWhileRevalidate ?? 86400;
  res.setHeader("Cache-Control", `public, max-age=${maxAge}, s-maxage=${sMaxAge}, stale-while-revalidate=${swr}`);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
}

export function sendJSON(res: VercelResponse, status: number, body: unknown, opts?: CacheOptions) {
  cacheHeaders(res, opts);
  return res.status(status).json(body);
}

export function sendText(
  res: VercelResponse,
  status: number,
  body: string,
  contentType: string,
  opts?: CacheOptions
) {
  cacheHeaders(res, opts);
  res.setHeader("Content-Type", contentType);
  return res.status(status).send(body);
}

export function sendOptions(res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Max-Age", "86400");
  return res.status(204).send("");
}

export function errorBody(error: string, hint?: string, extra?: Record<string, unknown>) {
  return { error, ...(hint ? { hint } : {}), ...(extra ?? {}) };
}
