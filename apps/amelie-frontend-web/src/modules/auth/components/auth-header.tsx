// -----
// Wordmark sits above the landing headline so the lockup
// stays centred on narrow screens.
// -----
export function AuthHeader() {
  return (
    <div className="flex w-full flex-col items-center md:w-[70%]">
      <span className="text-5xl font-semibold tracking-tight">Amelie</span>
      <p className="mt-5 w-full text-center text-xl font-light text-muted-foreground md:w-3/4">
        Amelie answers your customers' questions from your own menu, hours and
        FAQs.
      </p>
    </div>
  );
}
