import { HolidayEntry } from "./load";

export function icsEscape(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function stamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function hashName(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) >>> 0;
  }
  return h.toString(36);
}

export function holidaysToICS(entries: HolidayEntry[], calendarName: string): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//data-libur-nasional-indonesia//Hari Libur Indonesia//ID",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:" + icsEscape(calendarName),
    "X-WR-TIMEZONE:Asia/Jakarta",
  ];
  for (const entry of entries) {
    const start = entry.date.replace(/-/g, "");
    const endStamp = new Date(`${entry.date}T00:00:00Z`);
    endStamp.setUTCDate(endStamp.getUTCDate() + 1);
    const end = endStamp.toISOString().slice(0, 10).replace(/-/g, "");
    lines.push(
      "BEGIN:VEVENT",
      `UID:${start}-${hashName(entry.name)}@libur-nasional-indonesia`,
      `DTSTAMP:${stamp(new Date())}`,
      `DTSTART;VALUE=DATE:${start}`,
      `DTEND;VALUE=DATE:${end}`,
      `SUMMARY:${icsEscape(entry.name)}`,
      `DESCRIPTION:${icsEscape(entry.name + " — Hari libur Indonesia")}`,
      "TRANSP:TRANSPARENT",
      "END:VEVENT"
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}
