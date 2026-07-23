require("dotenv").config();

const { App } = require("@slack/bolt");
const { generateDocs } = require("./claude");
const { createDocPage } = require("./notion");
const n8n = require("./n8n");

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
});

// ──────────────────────────────────────────────
// /doc <workflow-id>  — pull from n8n and document
// ──────────────────────────────────────────────
app.command("/doc", async ({ command, ack, respond }) => {
  await ack();

  // Strip Slack formatting / stray characters (backticks, asterisks, zero-width, whitespace)
  // so a pasted or auto-formatted workflow ID still resolves. n8n IDs are [A-Za-z0-9_-].
  const workflowId = command.text.replace(/[^A-Za-z0-9_-]/g, "");
  if (!workflowId) {
    await respond("Usage: `/doc <workflow-id>` or paste workflow JSON and tag me.");
    return;
  }

  if (!n8n.isConfigured()) {
    await respond(
      "n8n integration isn't configured. Paste the workflow JSON in a message and tag me instead."
    );
    return;
  }

  await respond(`⏳ Pulling workflow \`${workflowId}\` from n8n...`);

  try {
    const workflow = await n8n.fetchWorkflow(workflowId);
    const docs = await generateDocs(workflow);
    const notionUrl = await createDocPage(
      workflow.name || `Workflow ${workflowId}`,
      docs,
      {
        channel: command.channel_name,
        author: command.user_name,
      }
    );

    await respond(
      `✅ Documented *${workflow.name || workflowId}*\n📄 ${notionUrl}`
    );
  } catch (err) {
    console.error("Error documenting workflow:", err);
    await respond(`❌ Failed: ${err.message}`);
  }
});

// ──────────────────────────────────────────────
// /doc-list  — show all n8n workflows
// ──────────────────────────────────────────────
app.command("/doc-list", async ({ command, ack, respond }) => {
  await ack();

  const workflows = await n8n.listWorkflows();
  if (workflows.length === 0) {
    await respond("No workflows found (or n8n integration not configured).");
    return;
  }

  const list = workflows
    .map((wf) => `• \`${wf.id}\` — ${wf.name} ${wf.active ? "🟢" : "⚪"}`)
    .join("\n");

  await respond(`*n8n Workflows:*\n${list}\n\nUse \`/doc <id>\` to document one.`);
});

// ──────────────────────────────────────────────
// @bot mention with pasted JSON — document it
// ──────────────────────────────────────────────
app.event("app_mention", async ({ event, say }) => {
  const text = event.text.replace(/<@[^>]+>/g, "").trim();

  if (!text || text.length < 20) {
    await say(
      "Paste an n8n workflow JSON (or use `/doc <workflow-id>` if n8n is connected) and I'll document it."
    );
    return;
  }

  await say("⏳ Generating documentation...");

  try {
    // Try to parse as JSON; if it fails, send the raw text to Claude
    let workflow;
    try {
      workflow = JSON.parse(text);
    } catch {
      workflow = text;
    }

    const title =
      typeof workflow === "object" && workflow.name
        ? workflow.name
        : `Workflow — ${new Date().toISOString().slice(0, 10)}`;

    const docs = await generateDocs(workflow);
    const notionUrl = await createDocPage(title, docs, {
      channel: event.channel,
      author: event.user,
    });

    await say(`✅ Documented *${title}*\n📄 ${notionUrl}`);
  } catch (err) {
    console.error("Error documenting workflow:", err);
    await say(`❌ Failed to generate docs: ${err.message}`);
  }
});

// ──────────────────────────────────────────────
// Start
// ──────────────────────────────────────────────
(async () => {
  const port = process.env.PORT || 3000;
  await app.start(port);
  console.log(`⚡ Auto-Doc Bot running on port ${port}`);
})();
