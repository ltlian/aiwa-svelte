# AIWA-Svelte

AIWA (AI web application) Svelte is a small web interface for interacting with
[AIWA.API](https://github.com/ltlian/aiwa-api). It turns up to five short topics into a draft
"ukesmail" (weekly email) and shows the response as it streams in. The app is built as a fully
static SvelteKit site.

## Requirements

- Node.js **22.17 or newer** (Node 24 LTS recommended — see `.nvmrc`)
- npm

## Running locally

```bash
npm ci
cp .env.example .env.local   # then set VITE_AIWA_API_HOST
npm run dev
```

Open the printed URL. The API must allow cross-origin requests from the dev server origin.

## Scripts

| Script            | Description                                      |
| ----------------- | ------------------------------------------------ |
| `npm run dev`     | Start the development server                     |
| `npm run build`   | Build the static site into `build/`              |
| `npm run preview` | Preview the production build locally             |
| `npm run check`   | Run Svelte/TypeScript type checking              |
| `npm run lint`    | Check formatting (Prettier) and linting (ESLint) |
| `npm run format`  | Format the project with Prettier                 |

## Configuration

| Variable             | Required | Description                                             |
| -------------------- | -------- | ------------------------------------------------------- |
| `VITE_AIWA_API_HOST` | yes      | Base URL of the AIWA API, e.g. `https://localhost:7125` |
| `VITE_COMMIT_SHA`    | no       | Commit SHA shown in the footer; set by CI               |

Set `VITE_AIWA_API_HOST` in `.env.local` for local development (see `.env.example`). Variables are
declared in `src/env.ts` and inlined at build time, so they must also be set when running
`npm run build`.

The API base URL and endpoints can also be overridden at runtime by defining `globalThis.aiwaConfig`
before the app loads:

```js
window.aiwaConfig = {
	baseUrl: 'https://api.example.com',
	endpoints: { generateUkesmail: 'generate/ukesmail', healthz: 'healthz' }
};
```

## Building and deployment

`npm run build` produces a static site in `build/` using `@sveltejs/adapter-static`. The
[Azure Static Web Apps] workflow in `.github/workflows/` builds and deploys it, taking
`VITE_AIWA_API_HOST` from the `aiwa-api` web app. Hosted-site configuration is in
`static/staticwebapp.config.json`.

[azure static web apps]: https://azure.microsoft.com/products/app-service/static
