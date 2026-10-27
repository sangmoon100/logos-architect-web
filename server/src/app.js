const express = require('express');
const cors = require('cors');
const path = require('node:path');
const { config } = require('./config/env');
const wordRoutes = require('./routes/wordRoutes');
const nameRoutes = require('./routes/nameRoutes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();
const allowedOrigins = ['http://localhost:5173', config.clientOrigin].filter(Boolean);
const clientBuildDirectory = path.resolve(__dirname, '../../client/dist');

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());
app.use('/api', wordRoutes);
app.use('/api', nameRoutes);

app.get('/health', (request, response) => {
  response.status(200).json({ status: 'ok' });
});

app.use(express.static(clientBuildDirectory));
app.get(/^(?!\/api(?:\/|$)).*/, (request, response, next) => {
  response.sendFile(path.join(clientBuildDirectory, 'index.html'), (error) => {
    if (error) {
      next(error);
    }
  });
});

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
