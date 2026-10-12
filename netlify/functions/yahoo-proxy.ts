import type { Handler } from '@netlify/functions';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    const { url, accessToken } = payload;

    if (!url) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing target URL' }),
      };
    }

    if (!accessToken) {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing Yahoo Access Token' }),
      };
    }

    // Ensure format=json is appended
    const separator = url.includes('?') ? '&' : '?';
    const jsonUrl = url.includes('format=json') ? url : `${url}${separator}format=json`;

    const response = await fetch(jsonUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      },
    });

    const text = await response.text();

    return {
      statusCode: response.status,
      headers: { 'Content-Type': 'application/json' },
      body: text,
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message || 'Internal Yahoo Proxy error' }),
    };
  }
};
