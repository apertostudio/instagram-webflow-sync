const WEBFLOW_COLLECTION_ID = '6849a38e931f14e6e8731e1d';
const WEBFLOW_TOKEN = '0eb8d6cc6d9bd138c990743250140ad6c0d2b58480c4430dfc7d3801f01313cf';
const INSTAGRAM_USERNAME = 'eaed_org';

exports.handler = async function(event, context) {
  try {
    const url = `https://i.instagram.com/api/v1/users/web_profile_info/?username=${INSTAGRAM_USERNAME}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        'x-ig-app-id': '936619743392459'
      }
    });
    if (!res.ok) {
      return { statusCode: res.status, body: 'Failed to fetch Instagram' };
    }
    const json = await res.json();
    const edges = json.data?.user?.edge_owner_to_timeline_media?.edges || [];
    const posts = edges.slice(0, 4).map(edge => {
      const node = edge.node;
      const captionEdge = node.edge_media_to_caption.edges[0];
      return {
        image: node.display_url,
        link: `https://www.instagram.com/p/${node.shortcode}/`,
        caption: captionEdge ? captionEdge.node.text.slice(0, 120) : 'Instagram post',
        date: new Date(node.taken_at_timestamp * 1000).toISOString(),
      };
    });

    for (const post of posts) {
      const createUrl = `https://api.webflow.com/v2/collections/${WEBFLOW_COLLECTION_ID}/items`;
      const wfRes = await fetch(createUrl, {
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
            image: post.image,
            link: post.link,
            date: post.date,
          },
        }),
      });
      const wfJson = await wfRes.json();
      if (!wfRes.ok) {
        console.error('Webflow error', wfJson);
      }
    }
    return { statusCode: 200, body: 'Sync completed' };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: 'Error' };
  }
};
