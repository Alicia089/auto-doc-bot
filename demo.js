// Standalone demo: generate documentation from a sample n8n workflow.
// No Slack or Notion required — just an ANTHROPIC_API_KEY.
//
//   1. cp .env.example .env   (then fill in ANTHROPIC_API_KEY)
//   2. npm install
//   3. node demo.js
//
// The API key is read from the environment (.env is gitignored) and is never
// written into this file or any committed file.

require("dotenv").config();

if (!process.env.ANTHROPIC_API_KEY) {
  console.error(
    "Missing ANTHROPIC_API_KEY.\n" +
      "Add it to a local .env file (copy .env.example to .env and fill it in), " +
      "then run `node demo.js` again."
  );
  process.exit(1);
}

// Require after the key check — the Anthropic client is constructed on import.
const { generateDocs } = require("./src/claude");

// A small but realistic n8n workflow to document.
const sampleWorkflow = {
  name: "Lead Enrichment",
  nodes: [
    {
      name: "Webhook",
      type: "n8n-nodes-base.webhook",
      parameters: { httpMethod: "POST", path: "new-lead" },
    },
    {
      name: "Clearbit Lookup",
      type: "n8n-nodes-base.httpRequest",
      parameters: {
        method: "GET",
        url: "https://person.clearbit.com/v2/combined/find",
      },
    },
    {
      name: "Filter Valid",
      type: "n8n-nodes-base.if",
      parameters: { conditions: { string: [{ value1: "={{$json.email}}" }] } },
    },
    {
      name: "Create HubSpot Contact",
      type: "n8n-nodes-base.hubspot",
      parameters: { resource: "contact", operation: "create" },
    },
  ],
  connections: {
    Webhook: { main: [[{ node: "Clearbit Lookup" }]] },
    "Clearbit Lookup": { main: [[{ node: "Filter Valid" }]] },
    "Filter Valid": { main: [[{ node: "Create HubSpot Contact" }]] },
  },
};

(async () => {
  console.log(`Generating documentation for "${sampleWorkflow.name}"...\n`);
  try {
    const docs = await generateDocs(sampleWorkflow);
    console.log(docs);
  } catch (err) {
    console.error(`Failed to generate docs: ${err.message}`);
    process.exit(1);
  }
})();
