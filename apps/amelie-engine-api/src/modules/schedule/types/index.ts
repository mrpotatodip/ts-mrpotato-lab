export type BusinessHours = {
  dayOfWeek: number;
  opensAt: string | null;
  closesAt: string | null;
  isClosed: boolean;
};

export type HoursOverride = Omit<BusinessHours, "dayOfWeek"> & {
  date: string;
  note: string | null;
};

export type ScheduleDay = {
  date: string;
  weekday: string;
  isSet: boolean;
  isClosed: boolean;
  opensAt: string | null;
  closesAt: string | null;
  note: string | null;
  isSpecial: boolean;
};

export type WeeklyHours = {
  weekday: string;
  isSet: boolean;
  isClosed: boolean;
  opensAt: string | null;
  closesAt: string | null;
};

export type SpecialDate = {
  date: string;
  isClosed: boolean;
  opensAt: string | null;
  closesAt: string | null;
  note: string | null;
};

export type TenantSchedule = {
  location: { id: string; name: string };
  timezone: string;
  today: string;
  now: string;
  openNow: string;
  weekly: WeeklyHours[];
  next7Days: ScheduleDay[];
  specialDates: SpecialDate[];
};
