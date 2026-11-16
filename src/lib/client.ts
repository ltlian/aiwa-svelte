import { VITE_AIWA_API_HOST } from '$app/env/public';
import type { AiwaRequest } from './aiwaRequest';

type AiwaConfig = {
	baseUrl?: string;
	endpoints?: {
		generateUkesmail?: string;
		healthz?: string;
	};
};

declare global {
	var aiwaConfig: AiwaConfig | undefined;
}

const DEFAULT_ENDPOINTS = {
	generateUkesmail: 'generate/ukesmail',
	healthz: 'healthz'
};

const TIMEOUT_MS = 360_000;

/**
 * Resolves the API base URL. `globalThis.aiwaConfig` wins over the env var, which
 * is only a default. Resolved lazily so a missing env var never crashes at load.
 */
function resolveBaseUrl(): URL {
	const baseUrl = globalThis.aiwaConfig?.baseUrl ?? VITE_AIWA_API_HOST;

	if (baseUrl === undefined || baseUrl === '') {
		throw new Error('Mangler API-adresse. Sett VITE_AIWA_API_HOST i .env.local (se .env.example).');
	}

	const url = new URL(baseUrl);

	// Keep any path prefix on the base URL when joining relative endpoint paths.
	if (!url.pathname.endsWith('/')) url.pathname += '/';

	return url;
}

function resolveUrls(): { generateUrl: URL; healthCheckUrl: URL } {
	const baseUrl = resolveBaseUrl();
	const endpoints = globalThis.aiwaConfig?.endpoints;

	return {
		generateUrl: new URL(
			endpoints?.generateUkesmail ?? DEFAULT_ENDPOINTS.generateUkesmail,
			baseUrl
		),
		healthCheckUrl: new URL(endpoints?.healthz ?? DEFAULT_ENDPOINTS.healthz, baseUrl)
	};
}

export async function callChunkedAsync(
	request: AiwaRequest,
	callback: (segment: string) => void
): Promise<void> {
	const { generateUrl } = resolveUrls();
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

	try {
		const response = await fetch(generateUrl, {
			credentials: 'omit',
			headers: {
				Accept: 'text/event-stream',
				'Content-Type': 'application/json'
			},
			method: 'POST',
			body: JSON.stringify(request),
			signal: controller.signal
		});

		if (!response.ok) {
			throw new Error(`API-kallet feilet med status ${response.status}.`);
		}

		if (response.body === null) {
			throw new Error('API-kallet returnerte ingen data.');
		}

		const reader = response.body.getReader();
		const textDecoder = new TextDecoder();

		for (;;) {
			const { done, value } = await reader.read();
			if (done) break;

			callback(textDecoder.decode(value, { stream: true }));
		}

		// Flush a trailing multibyte character that was split across chunks.
		callback(textDecoder.decode());
	} finally {
		clearTimeout(timeout);
	}
}

export async function callHealthCheckAsync(): Promise<Response> {
	const { healthCheckUrl } = resolveUrls();
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

	try {
		return await fetch(healthCheckUrl, {
			credentials: 'omit',
			method: 'GET',
			signal: controller.signal
		});
	} finally {
		clearTimeout(timeout);
	}
}
