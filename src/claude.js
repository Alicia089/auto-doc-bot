const Anthropic = require("@anthropic-ai/sdk");

const client = new Anthropic();

const SYSTEM_PROMPT = `You are a technical documentation writer. You receive n8n workflow JSON and produce clear, structured documentation.

For each workflow, generate:
1. **Summary** — one sentence: what the workflow does end-to-end.
2. **Trigger** — what starts it (webhook, cron, manual, etc.).
3. **Steps** — numbered list of each node: name, type, and what it does in plain English.
4. **Data flow** — what data enters, transforms, and exits.
5. **Error handling** — any error branches, retries, or fallback nodes. If none exist, say "None configured."
6. **Dependencies** — external services, credentials, or APIs the workflow requires.

Use concise, scannable language. No filler. Write for an engineer who needs to debug this at 2 AM.`;

/**
 * Generate structured documentation from an n8n workflow.
 * @param {object|string} workflow — raw n8n workflow JSON or pasted text
 * @returns {Promise<string>} — markdown documentation
 */
async function generateDocs(workflow) {
  const workflowText =
    typeof workflow === "string" ? workflow : JSON.stringify(workflow, null, 2);

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Document this n8n workflow:\n\n${workflowText}`,
      },
    ],
  });

  const text = message.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");

  return text;
}

module.exports = { generateDocs };
