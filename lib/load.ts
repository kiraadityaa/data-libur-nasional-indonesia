import { readFileSync } from "node:fs";
import { join } from "node:path";

function resolveDataDir(): string {
  // Dapat dioverride untuk test: LIBUR_DATA_DIR=/path/ke/data
  const override = process.env.LIBUR_DATA_DIR;
  if (override) return override;
  // __dirname = <root>/lib (dev) atau bundel serverless; data selalu di <root>/data.
  // Jaga kompatibilitas CommonJS (tsconfig module=commonjs).
  try {
    if (typeof __dirname !== "undefined") return join(__dirname, "..", "data");
  } catch {
    // abaikan, fallback ke cwd di bawah
  }
  return join(process.cwd(), "data");
}

export const DATA_DIR = resolveDataDir();

const cache = new Map<string, unknown>();

export function loadJson<T>(relative: string): T {
  const hit = cache.get(relative);
  if (hit !== undefined) return hit as T;
  const parsed = JSON.parse(readFileSync(join(DATA_DIR, relative), "utf-8")) as T;
  cache.set(relative, parsed);
  return parsed;
}

/** Hapus cache di memori (berguna untuk test). */
export function clearLoadCache(): void {
  cache.clear();
}

export interface HolidayEntry {
  date: string;
  name: string;
}

export interface HolidayFile {
  schema_version: string;
  updated_at: string;
  sources: { name: string; title?: string; url?: string }[];
  years: Record<string, { count: number; holidays: HolidayEntry[] }>;
}

export interface ImsakEntry {
  day: number;
  date: string;
  imsak: string;
  subuh: string;
  zuhur: string;
  ashar: string;
  magrib: string;
  isya: string;
}

export interface ImsakFile {
  schema_version: string;
  city: string;
  province: string;
  year: number;
  hijri: string;
  timezone: string;
  schedule: ImsakEntry[];
}
