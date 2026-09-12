import { readFileSync } from "node:fs";
import { join } from "node:path";

export const DATA_DIR = join(process.cwd(), "data");

export function loadJson<T>(relative: string): T {
  return JSON.parse(readFileSync(join(DATA_DIR, relative), "utf-8")) as T;
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