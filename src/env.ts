import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	VITE_AIWA_API_HOST: {
		public: true,
		static: true,
		description: 'Base URL of the AIWA API, e.g. https://aiwa.example.com',
		schema: (value) => value || undefined
	},
	VITE_COMMIT_SHA: {
		public: true,
		static: true,
		description: 'Git commit SHA shown in the footer',
		schema: (value) => value || undefined
	}
});
