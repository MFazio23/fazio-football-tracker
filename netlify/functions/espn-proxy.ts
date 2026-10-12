/**
 * Netlify Serverless Function: Stateless Pass-Through Relay for ESPN API requests.
 * Automatically detected and deployed by Netlify during standard builds.
 */

export const handler = async (event: any) => {
  // Handle CORS Preflight if applicable
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { url, swid, espnS2 } = body;

    if (!url) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing target URL' }),
      };
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
    let text = await response.text();

    // If response is large (near or above AWS Lambda / Netlify 6MB limit), parse and trim unnecessary historical schedule items
    if (text.length > 4 * 1024 * 1024) {
      try {
        const json = JSON.parse(text);
        if (json.schedule && Array.isArray(json.schedule)) {
          const currentWeek = json.scoringPeriodId || 1;
          // Keep only current week and nearby matchups
          json.schedule = json.schedule.filter(
            (m: any) =>
              m.matchupPeriodId === currentWeek ||
              m.scoringPeriodId === currentWeek ||
              m.matchupPeriodId === currentWeek - 1 ||
              m.matchupPeriodId === currentWeek + 1
          );
        }
        text = JSON.stringify(json);
      } catch {
        // Fallback to original text if JSON parse fails
      }
    }

    return {
      statusCode: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: text,
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message || 'Internal proxy error' }),
    };
  }
};
