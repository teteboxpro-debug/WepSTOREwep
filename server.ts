import express from 'express';
import path from 'node:path';
import dotenv from 'dotenv';
import app from './server/app.js';
import { db } from './server/db.js';
import { telegramBot } from './server/telegramBot.js';

dotenv.config();

const PORT = parseInt(process.env.PORT || '3000', 10);
const isProd = process.env.NODE_ENV === 'production';

async function bootstrap() {
  // If a valid bot token was previously stored and active, auto-reconnect on server startup
  const initialSettings = db.getRaw().bot_settings;
  if (initialSettings.main_bot_token && initialSettings.is_main_active) {
    console.log('[Bot Service] Auto-reconnecting saved Telegram Bot Token...');
    telegramBot.startBot(initialSettings.main_bot_token).catch((err) => {
      console.warn('[Bot Service] Auto-reconnect warning:', err.message);
    });
  }

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Etebox System] Server running on port ${PORT} (Prod: ${isProd})`);
  });
}

bootstrap().catch((err) => {
  console.error('[Etebox System] Fatal bootstrap error:', err);
});

export default app;
