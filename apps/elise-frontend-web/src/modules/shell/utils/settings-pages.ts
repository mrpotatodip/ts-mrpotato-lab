import { hasAccessPower } from "@repo/contracts/elise";
import { SETTINGS_PAGES } from "../constants";

export const settingsPagesFor = (powers: readonly string[]) => SETTINGS_PAGES.filter((page) => hasAccessPower(powers, page.power));
