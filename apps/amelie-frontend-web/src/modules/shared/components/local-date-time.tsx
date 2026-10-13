import { useHydrated } from "../hooks/use-hydrated";
import { formatDateTime } from "../utils/format-date-time";

type LocalDateTimeProps = {
  iso: string;
};

// -----
// A time in the viewer's own zone. The server and the
// first browser render show the stable UTC form, then
// it switches, so hydration never sees two different texts.
// -----
export function LocalDateTime({ iso }: LocalDateTimeProps) {
  const hydrated = useHydrated();
  return <time dateTime={iso}>{formatDateTime(iso, !hydrated)}</time>;
}
