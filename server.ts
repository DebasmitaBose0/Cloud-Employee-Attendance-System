import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { connectDatabase } from './server/config/db.ts';
import { env } from './server/config/env.ts';
import { createApiApp } from './server/app.ts';
import { seedDatabase } from './server/utils/seedData.ts';

async function startServer() {
  await connectDatabase();
  await seedDatabase(false);

  const app = createApiApp();

  if (env.nodeEnv !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distDir, 'index.html'));
      });
    }
  }

  app.listen(env.port, '0.0.0.0', () => {
    console.log(
      `[Server] AttendCloud running on http://0.0.0.0:${env.port} (${env.nodeEnv})`
    );
  });
}

startServer().catch((err) => {
  console.error('[Server] Fatal startup error:', err);
  process.exit(1);
});
