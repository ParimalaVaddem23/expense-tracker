function getConfigFromEnv(env = process.env) {
  const JWT_SECRET = env.JWT_SECRET;
  const PORT = Number(env.PORT) || 3000;
  const DB_PATH = env.DB_PATH;

  return { JWT_SECRET, PORT, DB_PATH };
}

function validateConfig(config) {
  if (!config || typeof config !== 'object') {
    const err = new TypeError('config must be an object');
    err.code = 'CONFIG_INVALID';
    throw err;
  }

  if (!config.JWT_SECRET || String(config.JWT_SECRET).length < 32) {
    const err = new Error('JWT_SECRET is required and must be at least 32 characters');
    err.code = 'CONFIG_INVALID';
    throw err;
  }
}

module.exports = { getConfigFromEnv, validateConfig };
