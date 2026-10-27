import path from 'path';
import express from 'express';

import { app } from './server/app.ts';

// Support --port CLI argument from npm run dev or process.env.PORT
const portArgIndex = process.argv.indexOf('--port');
const portFromArg = portArgIndex !== -1 ? parseInt(process.argv[portArgIndex + 1], 10) : NaN;
const PORT = Number(process.env.PORT) || (!isNaN(portFromArg) ? portFromArg : 3000);

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production' || process.argv[1]?.endsWith('server.mjs');

  if (isProduction) {
    // Serve static assets in production build
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));

    // Fallback to index.html for SPA routing
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) {
        return next();
      }
      res.sendFile(path.join(distPath, 'index.html'), (err) => {
        if (err) {
          res.status(503).send('Frontend build is unavailable. Run npm run build.');
        }
      });
    });
  } else {
    // Mount Vite dev server middlewares in development
    const {createServer:createViteServer} = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Study Sniper AI server running on http://0.0.0.0:${PORT} (${isProduction ? 'production' : 'development'})`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
