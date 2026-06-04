import type { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError.js";

export const errorMiddleware = (
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const isAppError = error instanceof AppError;

  const statusCode = isAppError ? error.statusCode : 500;
  const status = isAppError ? error.status : "error";
  const message = isAppError
    ? error.message
    : "Error interno del servidor";
  console.error(error);

  res.status(statusCode).json({
    status,
    message,
  });
};