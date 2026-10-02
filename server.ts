import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { app } from './server/app';
import { verifySupabaseConnection, getSupabaseStatus, SUPABASE_CONFIG } from './server/supabase';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production' || fs.existsSync(path.join(__dirname, 'dist'));

async function startServer() {
  console.log('----------------------------------------------------');
  console.log('🚀 Starting ETEBOX Telegram Bot & Admin Server...');
  console.log(`📡 Supabase URL: ${SUPABASE_CONFIG.url}`);
  console.log(`🔐 Supabase Configured: ${SUPABASE_CONFIG.isConfigured ? 'YES (Secret Key Set)' : 'NO (Missing Secret Key)'}`);

  // Test Supabase connectivity on startup
  const supaCheck = await verifySupabaseConnection();
  console.log(`🗄️ Supabase Status: ${supaCheck.message}`);
  console.log('----------------------------------------------------');

  if (!isProduction) {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa'
      });
      app.use(vite.middlewares);
      console.log('⚡ Vite dev server middleware mounted.');
    } catch (err: any) {
      console.warn('Vite dev middleware failed, serving static fallback:', err.message);
    }
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✨ Server running at: http://localhost:${PORT}`);
    console.log(`🤖 Telegram Webhook: http://localhost:${PORT}/api/telegram/webhook`);
  });
}

startServer().catch(err => {
  console.error('Fatal server boot error:', err);
  process.exit(1);
});
