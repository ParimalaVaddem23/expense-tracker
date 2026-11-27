const jwt = require('jsonwebtoken');
const { getConfigFromEnv } = require('./config');

const COOKIE_NAME = 'auth_token';

function authRequired(req, res, next) {
  const token = req.cookies && req.cookies[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const { JWT_SECRET } = getConfigFromEnv();

  try {
    const payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

module.exports = { authRequired, COOKIE_NAME };
