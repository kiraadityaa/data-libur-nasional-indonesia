import { VercelResponse } from "@vercel/node";

export interface CacheOptions {
  maxAge?: number;
  sMaxAge?: number;
}

export function cacheHeaders(res: VercelResponse, opts: CacheOptions = {}) {
  const maxAge = opts.maxAge ?? 3600;
  const sMaxAge = opts.sMaxAge ?? 86400;
  res.setHeader("Cache-Control", `public, max-age=${maxAge}, s-maxage=${sMaxAge}`);
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