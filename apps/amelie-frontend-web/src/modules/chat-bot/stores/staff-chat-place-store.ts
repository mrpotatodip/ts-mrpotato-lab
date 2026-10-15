import type { StaffChatPlace } from "../types";

let place: StaffChatPlace = {};

export function getStaffChatPlace(): StaffChatPlace {
  return place;
}

export function setStaffChatPlace(next: StaffChatPlace): void {
  place = next;
}
