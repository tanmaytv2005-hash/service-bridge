import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../modules/users/user.model.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const protect = asyncHandler(async (req, res, next) => {
  const bearer = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null;
  const token = req.cookies?.token || bearer;
  if (!token) throw new ApiError(401, 'Please log in to continue');
  let payload;
  try { payload = jwt.verify(token, env.jwtSecret); }
  catch { throw new ApiError(401, 'Your session has expired. Please log in again'); }
  const user = await User.findById(payload.id);
  if (!user || user.status !== 'active') throw new ApiError(401, 'Your account is unavailable');
  req.user = user;
  next();
});

export const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) return next(new ApiError(403, 'You do not have permission to do that'));
  next();
};
