import type { StatusCode } from "hono/utils/http-status";

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: StatusCode = 500,
    public code?: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "AppError";
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found", options?: ErrorOptions) {
    super(message, 404, "NOT_FOUND", options);
  }
}

export class NotFoundErrorPipeline extends AppError {
  constructor(message: string) {
    super(message, 404, "NOT_FOUND_PIPELINE");
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, "VALIDATION_ERROR");
  }
}

export class ConflictError extends AppError {
  constructor(message = "Resource already exists") {
    super(message, 409, "CONFLICT");
  }
}

export class InternalServiceError extends AppError {
  constructor(message = "Internal service failed", options?: ErrorOptions) {
    super(message, 500, "INTERNAL_SERVICE_ERROR", options);
  }
}

export class ExternalServiceError extends AppError {
  constructor(message = "External service failed", options?: ErrorOptions) {
    super(message, 502, "EXTERNAL_SERVICE_ERROR", options);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(message, 403, "FORBIDDEN");
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(message, 401, "UNAUTHORIZED");
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message: string, code: string) {
    super(message, 429, code);
  }
}

export class PayloadTooLargeError extends AppError {
  constructor(message = "Request body too large") {
    super(message, 413, "PAYLOAD_TOO_LARGE");
  }
}
