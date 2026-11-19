import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { env } from './config/env.ts';
import authRoutes from './routes/authRoutes.ts';
import employeeRoutes from './routes/employeeRoutes.ts';
import attendanceRoutes from './routes/attendanceRoutes.ts';
import reportRoutes from './routes/reportRoutes.ts';
import { errorHandler, notFound } from './middleware/errorMiddleware.ts';

export function createApiApp() {
  const app = express();

  app.use(
    cors((req, callback) => {
      const origin = req.header('Origin');
      const host = req.header('Host');
      const appUrl = process.env.APP_URL?.trim();
      const sameHostOrigins = host ? [`https://${host}`, `http://${host}`] : [];
      if (
        !origin ||
        env.nodeEnv !== 'production' ||
        env.clientUrls.includes('*') ||
        env.clientUrls.includes(origin) ||
        (appUrl && origin === appUrl) ||
        sameHostOrigins.includes(origin)
      ) {
        return callback(null, { origin: true, credentials: true });
      }
      return callback(new Error('Not allowed by CORS policy'), { origin: false });
    })
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.get('/api/health', (_req, res) => {
    const readyState = mongoose.connection.readyState;
    const dbStatus = readyState === 1 ? 'connected' : 'disconnected';
    res.status(readyState === 1 ? 200 : 503).json({
      status: readyState === 1 ? 'ok' : 'degraded',
      service: 'attendcloud-api',
      database: dbStatus,
      environment: env.nodeEnv,
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/employees', employeeRoutes);
  app.use('/api/attendance', attendanceRoutes);
  app.use('/api', reportRoutes);

  // API 404 handler only for /api/* paths so SPA fallback handles client routes
  app.use('/api', notFound);
  app.use(errorHandler);

  return app;
}
