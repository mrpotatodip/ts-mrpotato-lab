type ChatBotHours = {
  isSet?: boolean;
  isClosed: boolean;
  opensAt: string | null;
  closesAt: string | null;
};

export function toChatBotHoursText(hours: ChatBotHours): string {
  if (hours.isSet === false) return "Not set";
  if (hours.isClosed) return "Closed";
  return `${hours.opensAt} to ${hours.closesAt}`;
}

export function toChatBotDateLabel(date: string): string {
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
