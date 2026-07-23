const { Client } = require("@notionhq/client");

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const DATABASE_ID = process.env.NOTION_DATABASE_ID;

/**
 * Convert a markdown string into Notion blocks.
 * Handles headings (##), bullet lists (-), and plain paragraphs.
 */
function markdownToBlocks(md) {
  const lines = md.split("\n");
  const blocks = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("## ")) {
      blocks.push({
        object: "block",
        type: "heading_2",
        heading_2: {
          rich_text: [{ type: "text", text: { content: trimmed.slice(3) } }],
        },
      });
    } else if (trimmed.startsWith("### ")) {
      blocks.push({
        object: "block",
        type: "heading_3",
        heading_3: {
          rich_text: [{ type: "text", text: { content: trimmed.slice(4) } }],
        },
      });
    } else if (/^[-*]\s/.test(trimmed)) {
      blocks.push({
        object: "block",
        type: "bulleted_list_item",
        bulleted_list_item: {
          rich_text: [
            { type: "text", text: { content: trimmed.replace(/^[-*]\s/, "") } },
          ],
        },
      });
    } else if (/^\d+\.\s/.test(trimmed)) {
      blocks.push({
        object: "block",
        type: "numbered_list_item",
        numbered_list_item: {
          rich_text: [
            {
              type: "text",
              text: { content: trimmed.replace(/^\d+\.\s/, "") },
            },
          ],
        },
      });
    } else {
      blocks.push({
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: [{ type: "text", text: { content: trimmed } }],
        },
      });
    }
  }

  return blocks;
}

/**
 * Create a new documentation page in the Notion database.
 * @param {string} title — workflow name
 * @param {string} markdownBody — Claude-generated documentation
 * @param {object} meta — optional metadata (channel, author, timestamp)
 * @returns {Promise<string>} — URL of the created Notion page
 */
async function createDocPage(title, markdownBody, meta = {}) {
  const blocks = markdownToBlocks(markdownBody);

  // Notion API limits to 100 blocks per request
  const children = blocks.slice(0, 100);

  const page = await notion.pages.create({
    parent: { database_id: DATABASE_ID },
    properties: {
      Name: {
        title: [{ text: { content: title } }],
      },
      Status: {
        select: { name: "Auto-generated" },
      },
      ...(meta.channel && {
        Channel: {
          rich_text: [{ text: { content: meta.channel } }],
        },
      }),
      ...(meta.author && {
        "Requested By": {
          rich_text: [{ text: { content: meta.author } }],
        },
      }),
    },
    children,
  });

  return page.url;
}

module.exports = { createDocPage };
