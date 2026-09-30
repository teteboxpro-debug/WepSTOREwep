import app from '../server/app.js';

export default function handler(req: any, res: any) {
  // If Vercel rewrote the URL to /api/index, restore original URL if present in headers
  if (req.url === '/api/index' || req.url === '/api' || req.url === '/api/') {
    const originalUrl = req.headers['x-matched-path'] || req.headers['x-original-url'] || req.headers['x-forwarded-uri'];
    if (originalUrl) {
      req.url = originalUrl;
    }
  }
  return app(req, res);
}
