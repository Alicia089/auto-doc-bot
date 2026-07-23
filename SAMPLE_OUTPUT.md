# Sample Output

Real documentation the **Auto-Doc Bot** generated from an n8n workflow, produced end to end (Slack `/doc` → n8n → Claude → Notion) and included verbatim so you can see the output quality without running the bot.

---

# Frost Law AI Client Intake Workflow

## Summary
Receives client messages via webhook, processes them through a Claude-powered legal intake AI agent (with access to a local knowledge base), formats the AI output as HTML, and emails a structured intake summary to a Frost Law attorney.

---

## Trigger
**Webhook** — HTTP POST to `/frost-intake`. Activated; listens for incoming client submissions containing a `client_message` field in the request body.

---

## Steps

1. **Webhook** (`n8n-nodes-base.webhook`)
   Receives the POST request. Passes `body.client_message` downstream.

2. **Anthropic Chat Model** (`@n8n/n8n-nodes-langchain.lmChatAnthropic`)
   Provides `claude-sonnet-4-5-20250929` as the LLM backbone for the AI Agent. Connected as an `ai_languageModel` sub-node.

3. **HTTP Request** (`n8n-nodes-base.httpRequestTool`)
   Tool available to the AI Agent. POSTs `client_message` to `http://127.0.0.1:5001/intake` — a **local** knowledge base service for Frost Law procedures and policies. Returns context the agent can use when composing its response.

4. **AI Agent** (`@n8n/n8n-nodes-langchain.agent`)
   Receives `client_message` as the prompt. System prompt instructs it to:
   - Summarize the legal issue (2–3 sentences)
   - Classify into a practice area (tax controversy / tax planning / estate planning / business law)
   - Flag urgency (IRS deadlines, court dates, filing deadlines)
   - Suggest 2–3 clarifying questions for the attorney
   - Never give legal advice; always close with the standard attorney follow-up disclaimer
   
   Can invoke the HTTP Request tool to query the local knowledge base. Outputs plain-text/markdown to `$json.output`.

5. **Code in JavaScript** (`n8n-nodes-base.code`)
   Converts the AI Agent's markdown output to HTML:
   - `**bold**` → `<strong>`
   - `*italic*` → `<em>`
   - Numbered list items → `<li>`
   - Newlines → `<br>`
   
   Outputs `{ output: "<html string>" }`.

6. **Send a message** (`n8n-nodes-base.gmail`)
   Sends a styled HTML email to `komereglissade@gmail.com` with subject **"New Client Intake — Frost Law"**. Email includes timestamp, a review warning banner, the formatted AI output, and a disclaimer that this is not legal advice.

---

## Data Flow

```
POST /frost-intake
  └─ body.client_message
       └─► AI Agent (prompt)
             ├─► HTTP Request tool → localhost:5001/intake (knowledge base lookup)
             └─► Claude Sonnet 4.5
                   └─► output (markdown text)
                         └─► Code node (markdown → HTML)
                               └─► output (HTML string)
                                     └─► Gmail (HTML email to attorney)
```

---

## Error Handling
**None configured.** No error branches, retries, or fallback nodes exist. Key failure points to watch:
- `localhost:5001/intake` is unavailable (agent tool will fail or return empty context)
- Anthropic API rate limits or outages
- Gmail OAuth token expiry
- Malformed webhook payload (missing `client_message` key)

---

## Dependencies

| Dependency | Details |
|---|---|
| **Anthropic API** | Credential ID `qoPtLTlxXV3avZAf`; model `claude-sonnet-4-5-20250929` |
| **Gmail OAuth2** | Credential ID `uuNcWQ7L52Hw9ewG`; sends to `komereglissade@gmail.com` |
| **Local knowledge base service** | HTTP at `http://127.0.0.1:5001/intake` — must be running on the same host as n8n; no auth configured |
| **n8n Webhook endpoint** | Path: `frost-intake`; webhook ID `295268a5-8e04-4509-9b3d-cb0c56994170` |

> ⚠️ **Note:** The local knowledge base at `127.0.0.1:5001` creates a hard infrastructure dependency. If n8n is containerized or moved, this URL must be updated. The HTTP Request tool also has an empty first parameter entry (unnamed, no value) — verify this doesn't cause payload issues.
