const { ApifyClient } = require('apify-client');

// Env-driven configuration
const WEBFLOW_COLLECTION_ID = process.env.WEBFLOW_COLLECTION_ID || '';
const WEBFLOW_TOKEN = process.env.WEBFLOW_TOKEN || '';
const APIFY_TOKEN = process.env.APIFY_TOKEN || '';
const APIFY_ACTOR_ID = process.env.APIFY_ACTOR_ID || 'shu8hvrXbJbY3Eb9W';
const INSTAGRAM_USERNAME = process.env.INSTAGRAM_USERNAME || 'eaed_org';
const DIRECT_URL = process.env.INSTAGRAM_URL || `https://www.instagram.com/${INSTAGRAM_USERNAME}/`;
const SKIP_WEBFLOW = process.env.SKIP_WEBFLOW === '1';

async function getInstagramPostsFromApify() {
  if (!APIFY_TOKEN) throw new Error('Missing APIFY_TOKEN');
  const client = new ApifyClient({ token: APIFY_TOKEN });
  const input = {
    directUrls: [DIRECT_URL],
    resultsType: 'posts',
    resultsLimit: 200,
    searchType: 'hashtag',
    searchLimit: 1,
    addParentData: false,
  };
  const run = await client.actor(APIFY_ACTOR_ID).call(input);
  const { items } = await client.dataset(run.defaultDatasetId).listItems();

  function toIsoDate(ts) {
    if (!ts && ts !== 0) return new Date().toISOString();
    if (typeof ts === 'number') {
      const millis = ts < 1e12 ? ts * 1000 : ts;
      return new Date(millis).toISOString();
    }
    if (typeof ts === 'string') {
      const num = Number(ts);
      if (!Number.isNaN(num) && ts.trim() !== '') {
        const millis = num < 1e12 ? num * 1000 : num;
        return new Date(millis).toISOString();
      }
      const d = new Date(ts);
      if (!Number.isNaN(d.getTime())) return d.toISOString();
      return new Date().toISOString();
    }
    if (ts instanceof Date) return new Date(ts).toISOString();
    return new Date().toISOString();
  }

  return items.map((item) => {
    const image = item.displayUrl || item.imageUrl || (item.imageUrls && item.imageUrls[0]) || item.thumbnailUrl || '';
    const shortcode = item.shortcode || item.code || '';
    const link = item.url || (shortcode ? `https://www.instagram.com/p/${shortcode}/` : '');
    const captionRaw = item.caption || item.title || 'Instagram post';
    const caption = captionRaw.slice(0, 120);
    const ts = item.takenAtTimestamp || item.timestamp || item.taken_at_timestamp;
    const date = toIsoDate(ts);
    return { image, link, caption, date };
  });
}

async function createWebflowItem(post) {
  if (!WEBFLOW_COLLECTION_ID || !WEBFLOW_TOKEN) throw new Error('Missing Webflow env vars');
  const url = `https://api.webflow.com/v2/collections/${WEBFLOW_COLLECTION_ID}/items`;
  function slugify(input) {
    const base = (input || '').toString().toLowerCase().trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60);
    const suffix = Date.now().toString().slice(-6);
    return base ? `${base}-${suffix}` : `post-${suffix}`;
  }
  const wfRes = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${WEBFLOW_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      isArchived: false,
      isDraft: false,
      fieldData: {
        name: post.caption,
        media: post.image,
        link: post.link,
        slug: slugify(post.caption)
      },
    }),
  });
  if (!wfRes.ok) {
    const text = await wfRes.text();
    console.error('Webflow error', text);
  }
}

exports.handler = async function (event, context) {
  try {
    const posts = await getInstagramPostsFromApify();
    if (SKIP_WEBFLOW) {
      console.log('Dry run enabled. First 4 posts:');
      console.log(JSON.stringify(posts.slice(0, 4), null, 2));
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Dry run complete', posts: posts.slice(0, 4) })
      };
    }
    
    let syncedCount = 0;
    for (const post of posts.slice(0, 4)) {
      await createWebflowItem(post);
      syncedCount++;
    }
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message: 'Sync completed successfully',
        synced: syncedCount,
        timestamp: new Date().toISOString()
      })
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message || 'Error during sync' })
    };
  }
};

