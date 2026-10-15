export type SheetSide = "left" | "right";

export function oppositeSheetSide(side: SheetSide): SheetSide {
  return side === "right" ? "left" : "right";
}

export function sheetSideWiggleClassName(wiggle: SheetSide | null): string | undefined {
  if (wiggle === "left") return "motion-reduce:animate-none animate-sheet-wiggle-left";
  if (wiggle === "right") return "motion-reduce:animate-none animate-sheet-wiggle-right";
}

export function isOwnAnimationEnd(event: { target: EventTarget | null; currentTarget: EventTarget | null }): boolean {
  return event.target === event.currentTarget;
}
