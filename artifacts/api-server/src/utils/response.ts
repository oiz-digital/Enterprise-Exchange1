export type SuccessResponse<T> = {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
};

export type ErrorResponse = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export type PaginationMeta = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};

export function success<T>(data: T, meta?: Record<string, unknown>): SuccessResponse<T> {
  const result: SuccessResponse<T> = { success: true, data };
  if (meta !== undefined) {
    result.meta = meta;
  }
  return result;
}

export function paginated<T>(
  items: T[],
  total: number,
  page: number,
  limit: number,
): SuccessResponse<T[]> {
  const totalPages = Math.ceil(total / limit);
  return {
    success: true,
    data: items,
    meta: {
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

export function errorResponse(
  code: string,
  message: string,
  details?: unknown,
): ErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
    },
  };
}
