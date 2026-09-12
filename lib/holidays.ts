import { HolidayEntry, HolidayFile, loadJson } from "./load";

export const IS_DATE = /^\d{4}-\d{2}-\d{2}$/;
export const IS_YEAR = /^\d{4}$/;

export function isValidDateString(value: string): boolean {
  if (!IS_DATE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function isMonth(value: string): boolean {
  const raw = Number(value);
  return /^\d{1,2}$/.test(value) && raw >= 1 && raw <= 12;
}

export function todayWIB(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return parts;
}

export function listYearsHolidays(file: HolidayFile): string[] {
  return Object.keys(file.years)
    .filter((year) => IS_YEAR.test(year))
    .sort();
}

export function yearEntries(file: HolidayFile, year: number): HolidayEntry[] {
  return file.years[String(year)]?.holidays ?? [];
}

export interface MergedHoliday {
  date: string;
  libur_nasional: HolidayEntry | null;
  cuti_bersama: HolidayEntry | null;
}

export function mergedByYear(libur: HolidayFile, cuti: HolidayFile, year: number): MergedHoliday[] {
  const byDate = new Map<string, MergedHoliday>();
  const add = (entry: HolidayEntry, key: "libur_nasional" | "cuti_bersama") => {
    const existing = byDate.get(entry.date) ?? { date: entry.date, libur_nasional: null, cuti_bersama: null };
    existing[key] = entry;
    byDate.set(entry.date, existing);
  };
  for (const entry of yearEntries(libur, year)) add(entry, "libur_nasional");
  for (const entry of yearEntries(cuti, year)) add(entry, "cuti_bersama");
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function nextHoliday(
  libur: HolidayFile,
  cuti: HolidayFile,
  fromIso: string
): MergedHoliday | null {
  if (!isValidDateString(fromIso)) return null;
  for (let year = Number(fromIso.slice(0, 4)); year <= new Date().getUTCFullYear() + 10; year++) {
    for (const entry of mergedByYear(libur, cuti, year)) {
      if (entry.date >= fromIso) return entry;
    }
  }
  return null;
}

export function monthHolidays(
  libur: HolidayFile,
  cuti: HolidayFile,
  year: number,
  month: number
): MergedHoliday[] {
  const prefix = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-`;
  return mergedByYear(libur, cuti, year).filter((entry) => entry.date.startsWith(prefix));
}