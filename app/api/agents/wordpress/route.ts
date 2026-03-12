import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { siteUrl, username, appPassword, dataType } = await req.json();

    if (!siteUrl || !username || !appPassword) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
    }

    const base = siteUrl.replace(/\/$/, '');
    const authHeader = 'Basic ' + Buffer.from(`${username}:${appPassword}`).toString('base64');
    const headers = { Authorization: authHeader, 'Content-Type': 'application/json' };

    const results: Record<string, unknown> = {};

    // Posts & Pages
    if (!dataType || dataType === 'posts' || dataType === 'all') {
      const [postsRes, pagesRes] = await Promise.all([
        fetch(`${base}/wp-json/wp/v2/posts?per_page=20&_fields=id,title,status,author,date,slug,excerpt,categories,tags`, { headers }),
        fetch(`${base}/wp-json/wp/v2/pages?per_page=20&_fields=id,title,status,author,date,slug,excerpt`, { headers }),
      ]);
      results.posts = postsRes.ok ? await postsRes.json() : { error: `Posts fetch failed: ${postsRes.status}` };
      results.pages = pagesRes.ok ? await pagesRes.json() : { error: `Pages fetch failed: ${pagesRes.status}` };
    }

    // Media/Assets
    if (!dataType || dataType === 'media' || dataType === 'all') {
      const mediaRes = await fetch(`${base}/wp-json/wp/v2/media?per_page=20&_fields=id,title,source_url,mime_type,date,author,alt_text,media_details`, { headers });
      results.media = mediaRes.ok ? await mediaRes.json() : { error: `Media fetch failed: ${mediaRes.status}` };
    }

    // Users/Authors
    if (!dataType || dataType === 'users' || dataType === 'all') {
      const usersRes = await fetch(`${base}/wp-json/wp/v2/users?per_page=20&_fields=id,name,slug,email,roles,avatar_urls,registered_date,description`, { headers });
      results.users = usersRes.ok ? await usersRes.json() : { error: `Users fetch failed: ${usersRes.status}` };
    }

    // Custom Content Types
    if (!dataType || dataType === 'custom' || dataType === 'all') {
      const typesRes = await fetch(`${base}/wp-json/wp/v2/types`, { headers });
      if (typesRes.ok) {
        const types = await typesRes.json();
        // Filter out built-in types
        const customTypes = Object.entries(types).filter(
          ([key]) => !['post', 'page', 'attachment', 'revision', 'nav_menu_item', 'wp_block', 'wp_template', 'wp_template_part', 'wp_navigation', 'wp_font_family', 'wp_font_face'].includes(key)
        );
        results.customTypes = customTypes.map(([key, val]) => ({ key, ...(val as object) }));

        // Fetch items for each custom type (up to 3)
        const customItems: Record<string, unknown> = {};
        for (const [key] of customTypes.slice(0, 3)) {
          const cRes = await fetch(`${base}/wp-json/wp/v2/${key}?per_page=10`, { headers });
          customItems[key] = cRes.ok ? await cRes.json() : [];
        }
        results.customTypeItems = customItems;
      } else {
        results.customTypes = { error: `Types fetch failed: ${typesRes.status}` };
      }
    }

    // Site info
    const infoRes = await fetch(`${base}/wp-json/`, { headers });
    results.siteInfo = infoRes.ok ? await infoRes.json() : {};

    return NextResponse.json({ cms: 'wordpress', siteUrl: base, data: results, fetchedAt: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
