import { useCallback, useState, type AnimationEvent } from "react";

import {
  isOwnAnimationEnd,
  oppositeSheetSide,
  sheetSideWiggleClassName,
  type SheetSide,
} from "../utils/sheet-side";

export type { SheetSide };

// -----
// Side of a floating panel, plus a one-shot wiggle
// in the direction it just moved.
// -----
export function useSheetSide(initial: SheetSide = "right") {
  const [side, setSide] = useState<SheetSide>(initial);
  const [wiggle, setWiggle] = useState<SheetSide | null>(null);

  const moveToOppositeSide = useCallback(() => {
    const next = oppositeSheetSide(side);
    setSide(next);
    setWiggle(next);
  }, [side]);

  const onWiggleEnd = useCallback((event: AnimationEvent<HTMLElement>) => {
    if (!isOwnAnimationEnd(event)) return;
    setWiggle(null);
  }, []);

  return {
    side,
    moveToOppositeSide,
    wiggleClassName: sheetSideWiggleClassName(wiggle),
    onWiggleEnd,
  };
}
