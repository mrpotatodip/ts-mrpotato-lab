export interface ResponseEnvelope<T> {
  data: T;
  error: null;
}

export interface PaginatedData<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export type PaginatedResponse<T> = ResponseEnvelope<PaginatedData<T>>;
