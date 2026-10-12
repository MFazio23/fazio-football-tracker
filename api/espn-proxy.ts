/**
 * Serverless function for Vercel / Netlify / Node deployments.
 * Stateless Pass-Through Relay for ESPN API requests.
 */

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { url, swid, espnS2 } = req.body || {};

    if (!url) {
      return res.status(400).json({ error: 'Missing target URL' });
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
    const data = await response.json();

    return res.status(response.status).json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal proxy error' });
  }
}
