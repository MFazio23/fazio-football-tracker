import type { Handler } from '@netlify/functions';

export const handler: Handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    const { action, code, redirectUri, refreshToken } = payload;

    const clientId = process.env.YAHOO_CLIENT_ID || payload.clientId;
    const clientSecret = process.env.YAHOO_CLIENT_SECRET || payload.clientSecret;

    if (!clientId || !clientSecret) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Missing Yahoo Client ID or Client Secret in environment variables or request payload.',
        }),
      };
    }

    const authHeader = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;
    const tokenUrl = 'https://api.login.yahoo.com/oauth2/get_token';

    const params = new URLSearchParams();

    if (action === 'exchange_code') {
      if (!code || !redirectUri) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Missing code or redirectUri for exchange_code' }),
        };
      }
      params.append('grant_type', 'authorization_code');
      params.append('redirect_uri', redirectUri);
      params.append('code', code);
    } else if (action === 'refresh_token') {
      if (!refreshToken) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Missing refreshToken for refresh_token' }),
        };
      }
      params.append('grant_type', 'refresh_token');
      params.append('refresh_token', refreshToken);
    } else {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: `Unknown action: ${action}` }),
      };
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

    const data = await response.json();

    return {
      statusCode: response.status,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message || 'Internal Yahoo Auth error' }),
    };
  }
};
