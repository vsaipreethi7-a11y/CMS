import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { siteUrl, apiToken, dataType } = await req.json();

    if (!siteUrl || !apiToken) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
    }

    const base = siteUrl.replace(/\/$/, '');
    const headers = {
      'X-Joomla-Token': apiToken,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    const results: Record<string, unknown> = {};

    // Articles (Posts/Pages)
    if (!dataType || dataType === 'posts' || dataType === 'all') {
      const articlesRes = await fetch(`${base}/api/index.php/v1/content/articles?page[limit]=20`, { headers });
      results.articles = articlesRes.ok ? await articlesRes.json() : { error: `Articles fetch failed: ${articlesRes.status}` };
    }

    // Media/Assets
    if (!dataType || dataType === 'media' || dataType === 'all') {
      const mediaRes = await fetch(`${base}/api/index.php/v1/media/files`, { headers });
      results.media = mediaRes.ok ? await mediaRes.json() : { error: `Media fetch failed: ${mediaRes.status}` };
    }

    // Users/Authors
    if (!dataType || dataType === 'users' || dataType === 'all') {
      const usersRes = await fetch(`${base}/api/index.php/v1/users?page[limit]=20`, { headers });
      results.users = usersRes.ok ? await usersRes.json() : { error: `Users fetch failed: ${usersRes.status}` };
    }

    // Categories as custom content types equivalent
    if (!dataType || dataType === 'custom' || dataType === 'all') {
      const catsRes = await fetch(`${base}/api/index.php/v1/content/categories`, { headers });
      results.categories = catsRes.ok ? await catsRes.json() : { error: `Categories fetch failed: ${catsRes.status}` };
      
      // Components (custom content types)
      const compsRes = await fetch(`${base}/api/index.php/v1/extensions?filter[type]=component&page[limit]=20`, { headers });
      results.components = compsRes.ok ? await compsRes.json() : { error: `Components fetch failed: ${compsRes.status}` };
    }

    // Site info
    const infoRes = await fetch(`${base}/api/index.php/v1/config/application`, { headers });
    results.siteInfo = infoRes.ok ? await infoRes.json() : {};

    return NextResponse.json({ cms: 'joomla', siteUrl: base, data: results, fetchedAt: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
