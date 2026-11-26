const path = require('path');
const express = require('express');
const swaggerUi = require('swagger-ui-express');
const openapi = require('./openapi');
const { createRouter } = require('./routes');

function createApp(repo) {
  const app = express();
  app.use(express.json());
  app.use(express.static(path.join(__dirname, '..', 'public')));
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapi));
  app.use('/api', createRouter(repo));

  app.use('/api', (req, res) => res.status(404).json({ error: 'NotFound', message: 'Route not found' }));

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'BadRequest', message: 'Malformed JSON body' });
    }
    console.error(err);
    res.status(500).json({ error: 'InternalServerError', message: 'Something went wrong' });
  });
  return app;
}

module.exports = { createApp };
