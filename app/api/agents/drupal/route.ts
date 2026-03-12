import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { siteUrl, username, password, dataType } = await req.json();

    if (!siteUrl || !username || !password) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
    }

    const base = siteUrl.replace(/\/$/, '');
    const authHeader = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');
    const headers = {
      Authorization: authHeader,
      'Content-Type': 'application/vnd.api+json',
      Accept: 'application/vnd.api+json',
    };

    const results: Record<string, unknown> = {};

    // Posts (Articles + Basic Pages)
    if (!dataType || dataType === 'posts' || dataType === 'all') {
      const [articleRes, pageRes] = await Promise.all([
        fetch(`${base}/jsonapi/node/article?page[limit]=20&fields[node--article]=id,title,status,created,changed,field_body,path,uid`, { headers }),
        fetch(`${base}/jsonapi/node/page?page[limit]=20&fields[node--page]=id,title,status,created,changed,body,path,uid`, { headers }),
      ]);
      results.articles = articleRes.ok ? await articleRes.json() : { error: `Articles fetch failed: ${articleRes.status}` };
      results.pages = pageRes.ok ? await pageRes.json() : { error: `Pages fetch failed: ${pageRes.status}` };
    }

    // Media/Assets
    if (!dataType || dataType === 'media' || dataType === 'all') {
      const mediaRes = await fetch(`${base}/jsonapi/media/image?page[limit]=20&fields[media--image]=id,name,status,created,field_media_image`, { headers });
      results.media = mediaRes.ok ? await mediaRes.json() : { error: `Media fetch failed: ${mediaRes.status}` };
    }

    // Users/Authors
    if (!dataType || dataType === 'users' || dataType === 'all') {
      const usersRes = await fetch(`${base}/jsonapi/user/user?page[limit]=20&fields[user--user]=id,name,mail,created,roles`, { headers });
      results.users = usersRes.ok ? await usersRes.json() : { error: `Users fetch failed: ${usersRes.status}` };
    }

    // Content Types (Drupal node types)
    if (!dataType || dataType === 'custom' || dataType === 'all') {
      const typesRes = await fetch(`${base}/jsonapi/node_type/node_type`, { headers });
      results.contentTypes = typesRes.ok ? await typesRes.json() : { error: `Content types fetch failed: ${typesRes.status}` };
    }

    // Site info via Drupal's state endpoint
    const infoRes = await fetch(`${base}/jsonapi`, { headers });
    results.siteInfo = infoRes.ok ? await infoRes.json() : {};

    return NextResponse.json({ cms: 'drupal', siteUrl: base, data: results, fetchedAt: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
