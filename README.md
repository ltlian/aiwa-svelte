# AIWA-Svelte

AIWA (AI web application) Svelte is a simple web interface for interacting with [AIWA.API](https://github.com/ltlian/aiwa-api).

## Running locally

Create `.env.local` in the root folder based on `.env.example` in order to set the API endpoint url during development.

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
