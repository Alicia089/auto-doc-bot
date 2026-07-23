# Auto-Doc Bot

Slack bot that auto-documents n8n workflows in Notion using the Claude API.

Tag the bot with pasted workflow JSON or use `/doc <workflow-id>` to pull directly from n8n — it generates structured documentation and writes it to a Notion database in seconds.

**➡️ See [SAMPLE_OUTPUT.md](SAMPLE_OUTPUT.md)** for real documentation the bot generated from an n8n workflow (Slack → n8n → Claude → Notion, end to end).

## How It Works

```
┌──────────┐      ┌──────────────┐      ┌───────────┐      ┌────────┐
│  Slack   │ ──▶  │  Auto-Doc    │ ──▶  │  Claude   │ ──▶  │ Notion │
│  trigger │      │  Bot (Node)  │      │  API      │      │  page  │
└──────────┘      └──────────────┘      └───────────┘      └────────┘
  @mention          parse JSON           generate           write to
  or /doc           or pull from         structured         database
                    n8n API              docs
```

**Trigger options:**
- `@Auto-Doc Bot` + pasted workflow JSON in any channel
- `/doc <workflow-id>` — pulls the workflow from your n8n instance via API
- `/doc-list` — shows all available n8n workflows

**What Claude generates for each workflow:**
- One-line summary
- Trigger type (webhook, cron, manual)
- Numbered step-by-step breakdown of every node
- Data flow: what enters, transforms, and exits
- Error handling (or flags that none exists)
- External dependencies and required credentials

## Setup

### 1. Clone and install

```bash
git clone https://github.com/Alicia089/auto-doc-bot.git
cd auto-doc-bot
npm install
```

### 2. Create a Slack App

1. Go to [api.slack.com/apps](https://api.slack.com/apps) → **Create New App** → **From scratch**
2. Under **Socket Mode**, enable it and generate an app-level token (`xapp-...`)
3. Under **Slash Commands**, create `/doc` and `/doc-list`
4. Under **Event Subscriptions**, subscribe to `app_mention`
5. Under **OAuth & Permissions**, add scopes: `app_mentions:read`, `chat:write`, `commands`
6. Install the app to your workspace and copy the Bot User OAuth Token (`xoxb-...`)

### 3. Create a Notion integration

1. Go to [notion.so/my-integrations](https://www.notion.so/my-integrations) → **New integration**
2. Create a database with these properties:
   - `Name` (title)
   - `Status` (select — add an "Auto-generated" option)
   - `Channel` (rich text)
   - `Requested By` (rich text)
3. Share the database with your integration
4. Copy the database ID from the URL: `notion.so/<workspace>/<DATABASE_ID>?v=...`

### 4. Configure environment

```bash
cp .env.example .env
# Fill in your tokens
```

### 5. Run

```bash
npm start
```

## Usage

**Option A — paste JSON in Slack:**
```
@Auto-Doc Bot
{
  "name": "Lead Enrichment",
  "nodes": [ ... ]
}
```

**Option B — pull from n8n:**
```
/doc 42
```

The bot responds with a link to the new Notion page.

## Project Structure

```
auto-doc-bot/
├── src/
│   ├── index.js      # Slack Bolt app, routes commands and mentions
│   ├── claude.js      # Claude API — generates structured docs from workflow JSON
│   ├── notion.js      # Notion API — creates pages with markdown→block conversion
│   └── n8n.js         # Optional n8n client — pulls workflow JSON by ID
├── demo.js            # Standalone demo — generate docs from a sample workflow (no Slack/Notion)
├── .env.example       # Required environment variables
├── package.json
└── README.md
```

## Notes

- To see the core doc-generation step without setting up Slack or Notion, set `ANTHROPIC_API_KEY` in your `.env` and run `node demo.js`.
- The n8n integration is optional — the bot works without it by accepting pasted JSON.
- Notion's API limits block creation to 100 blocks per request. For very large workflows, the documentation is truncated.

## License

MIT
