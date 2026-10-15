import { buttonVariants } from "#/components/ui/button";
import { cn } from "#/lib/utils";
import { toChatBotCountryLabel, toChatBotMapsHref } from "../../utils";

type ChatBotLocationCardProps = {
  location: { id: string; name: string } | null;
  country: { id: string; name: string; code: string } | null;
  address: string | null;
  phone: string | null;
};

export function ChatBotLocationCard({ location, country, address, phone }: ChatBotLocationCardProps) {
  if (!location && !country && !address && !phone) return null;
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-accent px-4 py-3 text-sm">
      {location ? <p className="font-medium">{location.name}</p> : null}
      {country ? <p className="text-muted-foreground">{toChatBotCountryLabel(country)}</p> : null}
      {address || phone ? (
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
          {address ? (
            <div className="contents">
              <dt className="text-muted-foreground">Address</dt>
              <dd className="min-w-0 text-right">
                <a
                  href={toChatBotMapsHref(address)}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(buttonVariants({ variant: "link", size: "sm" }), "h-auto px-0 text-right whitespace-normal")}
                >
                  {address}
                </a>
              </dd>
            </div>
          ) : null}
          {phone ? (
            <div className="contents">
              <dt className="text-muted-foreground">Phone</dt>
              <dd className="min-w-0 text-right">
                <a href={`tel:${phone}`} className={cn(buttonVariants({ variant: "link", size: "sm" }), "h-auto px-0")}>
                  {phone}
                </a>
              </dd>
            </div>
          ) : null}
        </dl>
      ) : null}
    </div>
  );
}
