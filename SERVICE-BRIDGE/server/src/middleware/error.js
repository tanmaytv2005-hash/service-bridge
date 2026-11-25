import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';

export function notFound(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  let status = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let details = err.details;
  if (err.name === 'ValidationError') {
    status = 400;
    message = 'Validation failed';
    details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  } else if (err.code === 11000) {
    status = 409;
    message = 'An account with this email or phone already exists';
  } else if (err.name === 'CastError') {
    status = 400;
    message = 'Invalid identifier';
  }
  if (status >= 500) {
    // Keep internal database, gateway, and stack details out of production responses.
    console.error(`[api-error] ${err.name || 'Error'}: ${err.message || 'Unknown error'}`);
    details = undefined;
    if (env.nodeEnv === 'production') message = 'A server error occurred. Please try again later.';
  }
  res.status(status).json({ success: false, message, ...(details && { details }) });
}
