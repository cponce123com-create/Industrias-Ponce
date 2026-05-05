/**
 * Unified error class and Express error handler for the API server.
 * All route-level errors should be thrown as ApiError so the handler
 * can serialize them consistently.
 */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }

  toJSON() {
    return {
      error: this.message,
      code: this.code,
      statusCode: this.statusCode,
    };
  }
}

export const apiErrorHandler: Parameters<typeof import("express").default.use>[1] = (err, _req, res, _next) => {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json(err.toJSON());
    return;
  }
  console.error("[Error]", err);
  res.status(500).json({ error: "Error interno del servidor", code: "INTERNAL_ERROR" });
};