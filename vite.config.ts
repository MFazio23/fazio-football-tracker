import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

function espnProxyPlugin(): Plugin {
  return {
    name: 'espn-proxy-plugin',
    configureServer(server) {
      server.middlewares.use('/api/espn-proxy', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });

        req.on('end', async () => {
          try {
            const parsed = JSON.parse(body || '{}');
            const { url, swid, espnS2 } = parsed;

            if (!url) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Missing target URL' }));
              return;
            }

            const headers: Record<string, string> = {
              Accept: 'application/json',
              'User-Agent':
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)',
            };

            if (swid && espnS2) {
              headers['Cookie'] = `SWID=${swid}; espn_s2=${espnS2};`;
            }

            const response = await fetch(url, { headers });
            const data = await response.text();

            res.statusCode = response.status;
            res.setHeader('Content-Type', 'application/json');
            res.end(data);
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message || 'Internal proxy error' }));
          }
        });
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), espnProxyPlugin()],
});
