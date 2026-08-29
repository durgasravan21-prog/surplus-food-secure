import { getById, insert } from '../db/database.js';

export function idempotency(req, res, next) {
  const key = req.headers['idempotency-key'];

  if (!key) return next();

  const cached = getById('idempotency_keys', key);
  if (cached) {
    return res.status(200).json(JSON.parse(cached.response));
  }

  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      insert('idempotency_keys', {
        key: key,
        response: JSON.stringify(body),
        created_at: new Date().toISOString(),
      });
    }
    return originalJson(body);
  }

  next();
}
