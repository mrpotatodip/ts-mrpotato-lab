import type { AccessPower } from "./catalogue";

type Equal<Left, Right> =
  (<T>() => T extends Left ? 1 : 2) extends <T>() => T extends Right ? 1 : 2 ? true : false;

type Assert<Condition extends true> = Condition;

export type PowerIsNotPlainString = Assert<Equal<Equal<AccessPower, string>, false>>;

export const knownPower: AccessPower = "company:team:members:update";
export const knownPlatformPower: AccessPower = "platform:admin:invite_codes:read";

// @ts-expect-error a missing letter is not a catalogue Power
export const missingLetter: AccessPower = "company:team:members:updat";

// @ts-expect-error an Action the leaf does not have
export const wrongAction: AccessPower = "company:team:members:archive";

// @ts-expect-error a path that stops before its Action is not a Power
export const noAction: AccessPower = "company:team:members";
