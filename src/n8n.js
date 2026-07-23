/**
 * Optional: pull workflow JSON directly from a running n8n instance.
 * If N8N_BASE_URL and N8N_API_KEY are not set, the bot still works —
 * users just paste workflow JSON into Slack instead.
 */

const BASE_URL = process.env.N8N_BASE_URL;
const API_KEY = process.env.N8N_API_KEY;

function isConfigured() {
  return Boolean(BASE_URL && API_KEY);
}

/**
 * Fetch a workflow by ID from the n8n REST API.
 * @param {string} workflowId
 * @returns {Promise<object>} — raw n8n workflow JSON
 */
async function fetchWorkflow(workflowId) {
  if (!isConfigured()) {
    throw new Error(
      "n8n integration not configured. Set N8N_BASE_URL and N8N_API_KEY."
    );
  }

  const url = `${BASE_URL}/api/v1/workflows/${workflowId}`;
  const res = await fetch(url, {
    headers: { "X-N8N-API-KEY": API_KEY },
  });

  if (!res.ok) {
    throw new Error(`n8n API returned ${res.status}: ${await res.text()}`);
  }

  return res.json();
}

/**
 * List all workflows (for the /doc-list command).
 * @returns {Promise<Array>} — array of { id, name, active }
 */
async function listWorkflows() {
  if (!isConfigured()) return [];

  const url = `${BASE_URL}/api/v1/workflows`;
  const res = await fetch(url, {
    headers: { "X-N8N-API-KEY": API_KEY },
  });

  if (!res.ok) return [];

  const data = await res.json();
  return (data.data || []).map((wf) => ({
    id: wf.id,
    name: wf.name,
    active: wf.active,
  }));
}

module.exports = { isConfigured, fetchWorkflow, listWorkflows };
