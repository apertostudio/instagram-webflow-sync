import fetch from "node-fetch";

// Constants
const WEBFLOW_COLLECTION_ID = "6849a38e931f14e6e8731e1d";
const WEBFLOW_TOKEN = "0eb8d6cc6d9bd138c990743250140ad6c0d2b58480c4430dfc7d3801f01313cf";
const INSTAGRAM_USERNAME = "eaed_org";

// Fetch latest posts from Instagram
async function getInstagramPosts(username) {
  const url = `https://www.instagram.com/${username}/?__a=1&__d=dis`;
  const res = await fetch(url);
  const json = await res.json();
  // Extract first 4 posts
  const edges = json.graphql?.user?.edge_owner_to_timeline_media?.edges || [];
  return edges.slice(0, 4).map(edge => {
    const node = edge.node;
    return {
      image: node.display_url,
      link: `https://www.instagram.com/p/${node.shortcode}/`,
      caption: node.edge_media_to_caption.edges[0]?.node?.text?.slice(0, 120) || "Instagram post",
      date: new Date(node.taken_at_timestamp * 1000).toISOString()
    };
  });
}

// Create item in Webflow CMS
async function createWebflowItem(post) {
  const url = `https://api.webflow.com/v2/collections/${WEBFLOW_COLLECTION_ID}/items`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WEBFLOW_TOKEN}`,
      "Content-Type": "application/json",
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
  if (!res.ok) {
    console.error("Failed to create item in Webflow:", await res.text());
  } else {
    console.log(`Created item for ${post.link}`);
  }
}

// Main function
(async () => {
  try {
    const posts = await getInstagramPosts(INSTAGRAM_USERNAME);
    for (const post of posts) {
      await createWebflowItem(post);
    }
    console.log("Sync complete");
  } catch (error) {
    console.error("Error during sync:", error);
  }
})();
