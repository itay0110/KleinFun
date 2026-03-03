export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

export function addHours(date: Date, hours: number) {
  return addMinutes(date, hours * 60);
}

export function formatTimeShort(date: Date) {
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
}

export function formatRelativeInHours(target: Date, from: Date = new Date()) {
  const diffMs = target.getTime() - from.getTime();
  const diffMinutes = Math.round(diffMs / (60 * 1000));

  if (diffMinutes <= 0) return "now";
  if (diffMinutes < 60) return `in ${diffMinutes}m`;

  const hours = Math.round(diffMinutes / 60);
  return `in ${hours}h`;
}

export function formatDateTimeLocalInput(date: Date) {
  const rounded = roundToNextQuarterHour(date);
  const pad = (value: number) => String(value).padStart(2, "0");
  const year = rounded.getFullYear();
  const month = pad(rounded.getMonth() + 1);
  const day = pad(rounded.getDate());
  const hours = pad(rounded.getHours());
  const minutes = pad(rounded.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function roundToNextQuarterHour(date: Date) {
  const d = new Date(date.getTime());
  const minutes = d.getMinutes();
  const remainder = minutes % 15;
  if (remainder !== 0) {
    d.setMinutes(minutes + (15 - remainder));
  }
  d.setSeconds(0);
  d.setMilliseconds(0);
  return d;
}

