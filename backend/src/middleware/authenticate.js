import { verifyAccessToken } from '../utils/jwt.js';
import { getById } from '../db/database.js';
import { unauthorized } from '../utils/envelope.js';

export function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return unauthorized(res, 'Missing or malformed Authorization header');
    }
    const token = authHeader.split(' ')[1];

    const decoded = verifyAccessToken(token);

    const user = getById('users', decoded.user_id);
    if (!user) {
      return unauthorized(res, 'User account not found');
    }
    if (user.suspended) {
      return unauthorized(res, 'Account has been suspended');
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return unauthorized(res, 'Access token expired');
    }
    return unauthorized(res, 'Invalid access token');
  }
}
