import http from 'node:http';
import { handleApiRequest } from './middleware.js';

// Load environment variables (.env) if running in Node 20.6+
if (typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile('.env');
  } catch {}
}

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '127.0.0.1';

const server = http.createServer(async (req, res) => {
  const handled = await handleApiRequest(req, res);
  if (!handled && !res.writableEnded) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
  }
});

server.listen(PORT, HOST, () => {
  console.log(`[AFL Server] Backend server running securely on http://${HOST}:${PORT}`);
});
