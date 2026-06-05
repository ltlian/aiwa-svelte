# AIWA-Svelte

AIWA (AI web application) Svelte is a simple web interface for interacting with [AIWA.API](https://github.com/ltlian/aiwa-api).

## Running locally

Create `.env.local` in the root folder based on `.env.example` in order to set the API endpoint url during development.

## Codex Docker sandbox

The Docker setup provides an isolated development workspace with Node, Git, SSH, and the Codex CLI installed.

```bash
# PowerShell example
$env:SSH_PUBLIC_KEY = Get-Content $env:USERPROFILE\.ssh\id_ed25519.pub
$env:OPENAI_API_KEY = "<your-api-key>"
docker compose up -d --build
ssh -p 6022 codex@localhost
```

Inside the `aiwa-ui` container, install dependencies and start the UI dev server:

```bash
npm install
npm run dev -- --host 0.0.0.0
```

The dev server is exposed at http://localhost:6173, and the production preview is exposed at http://localhost:6174. If the local AIWA API is running on the host machine, the container defaults `VITE_AIWA_API_HOST` to `https://host.docker.internal:7125`.

## Developing

Once you've installed dependencies with `npm install`, start a development server:

```bash
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```bash
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://kit.svelte.dev/docs/adapters) for your target environment.
