import cors from 'cors';
import express from 'express';
import path from 'node:path';
import { config } from './config/env';
import nameRoutes = require('./routes/nameRoutes');
import wordRoutes = require('./routes/wordRoutes');
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

const app = express();
const allowedOrigins = [
  'http://localhost:5173',
  config.clientOrigin,
].filter((origin): origin is string => origin !== null);
const clientBuildDirectory = path.resolve(__dirname, '../../client/dist');

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());
app.use('/api', wordRoutes);
app.use('/api', nameRoutes);

app.get('/health', (_request, response) => {
  response.status(200).json({ status: 'ok' });
});

app.use(express.static(clientBuildDirectory));
app.get(/^(?!\/api(?:\/|$)).*/, (_request, response, next) => {
  response.sendFile(path.join(clientBuildDirectory, 'index.html'), (error) => {
    if (error) {
      next(error);
    }
  });
});

app.use(notFoundHandler);
app.use(errorHandler);

export = app;
