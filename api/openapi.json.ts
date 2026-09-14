import { VercelRequest, VercelResponse } from "@vercel/node";
import { buildOpenApiSpec } from "../lib/openapi";
import { sendJSON, sendOptions } from "../lib/respond";

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") return sendOptions(res);
  if (req.method !== "GET") {
    return sendJSON(res, 405, { error: "Method Not Allowed", hint: "Gunakan GET" });
  }
  const proto = (req.headers["x-forwarded-proto"] as string) ?? "https";
  const host = (req.headers["x-forwarded-host"] as string) ?? (req.headers.host as string) ?? "";
  const siteUrl = host ? `${proto}://${host}` : "https://data-libur-nasional-indonesia.vercel.app";
  return sendJSON(res, 200, buildOpenApiSpec(siteUrl), { maxAge: 3600, sMaxAge: 86400 });
}
