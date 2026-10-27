const express = require('express');
const cors = require('cors');
const { config } = require('./config/env');
const { createOriginCallback } = require('./config/cors');
const wordRoutes = require('./routes/wordRoutes');
const nameRoutes = require('./routes/nameRoutes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();

app.use(cors({ origin: createOriginCallback(config) }));
app.use(express.json());
app.use('/api', wordRoutes);
app.use('/api', nameRoutes);

app.get('/health', (request, response) => {
  response.status(200).json({ status: 'ok' });
});

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
