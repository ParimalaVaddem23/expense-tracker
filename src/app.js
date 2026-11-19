'use strict';
/**
 * Express application (no listen() here, so tools can import it).
 */
const path = require('path');
const express = require('express');
const swaggerUi = require('swagger-ui-express');

const openapi = require('./openapi');
const apiRoutes = require('./routes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

// Frontend
app.use(express.static(path.join(__dirname, '..', 'public')));

// API documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapi));

// REST API
app.use('/api', apiRoutes);
app.use('/api', notFoundHandler); // unknown /api/* -> JSON 404

// Anything else that is not a static file
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
