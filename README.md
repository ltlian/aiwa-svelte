# AIWA-Svelte

AIWA (AI web application) Svelte is a simple web interface for interacting with [AIWA.API](https://github.com/ltlian/aiwa-api).

## Running locally

Use Node.js 20.19 or newer. Create `.env.local` in the root folder based on `.env.example` to set the API endpoint URL during development.

## Developing

Install dependencies and start a development server:

```bash
npm install
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

The project is configured to build for Azure Static Web Apps.
