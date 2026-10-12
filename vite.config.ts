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

function yahooProxyPlugin(): Plugin {
  return {
    name: 'yahoo-proxy-plugin',
    configureServer(server) {
      // 1. Yahoo Auth endpoint
      server.middlewares.use('/api/yahoo-auth', async (req, res) => {
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
            const { action, code, redirectUri, refreshToken } = parsed;

            const clientId = process.env.YAHOO_CLIENT_ID || parsed.clientId;
            const clientSecret = process.env.YAHOO_CLIENT_SECRET || parsed.clientSecret;

            if (!clientId || !clientSecret) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  error: 'Missing Yahoo Client ID or Client Secret in .env.local or request payload.',
                })
              );
              return;
            }

            const authHeader = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;
            const tokenUrl = 'https://api.login.yahoo.com/oauth2/get_token';

            const params = new URLSearchParams();

            if (action === 'exchange_code') {
              params.append('grant_type', 'authorization_code');
              params.append('redirect_uri', redirectUri);
              params.append('code', code);
            } else if (action === 'refresh_token') {
              params.append('grant_type', 'refresh_token');
              params.append('refresh_token', refreshToken);
            }

            const response = await fetch(tokenUrl, {
              method: 'POST',
              headers: {
                Authorization: authHeader,
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
              },
              body: params.toString(),
            });

            const data = await response.text();
            res.statusCode = response.status;
            res.setHeader('Content-Type', 'application/json');
            res.end(data);
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message || 'Internal Yahoo Auth error' }));
          }
        });
      });

      // 2. Yahoo API Proxy endpoint
      server.middlewares.use('/api/yahoo-proxy', async (req, res) => {
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
            const { url, accessToken } = parsed;

            if (!url) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Missing target URL' }));
              return;
            }

            if (!accessToken) {
              res.statusCode = 401;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Missing Yahoo Access Token' }));
              return;
            }

            const separator = url.includes('?') ? '&' : '?';
            const jsonUrl = url.includes('format=json') ? url : `${url}${separator}format=json`;

            const response = await fetch(jsonUrl, {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/json',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
              },
            });

            const data = await response.text();
            res.statusCode = response.status;
            res.setHeader('Content-Type', 'application/json');
            res.end(data);
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message || 'Internal Yahoo Proxy error' }));
          }
        });
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), espnProxyPlugin(), yahooProxyPlugin()],
});
