const DEFAULT_BASE_URL = 'https://localhost:7125';
const DEFAULT_TIMEOUT_MS = 360000;

const STREAM_HEADERS = {
	Accept: 'text/event-stream',
	'Content-Type': 'application/json'
};

const config = createConfig(globalThis.aiwaConfig ?? {});
const generateUrl = new URL(config.endpoints.generateUkesmail, config.baseUrl);
const healthCheckUrl = new URL(config.endpoints.healthz, config.baseUrl);

function createConfig(runtimeConfig) {
	return {
		baseUrl: new URL(
			runtimeConfig.baseUrl || import.meta.env.VITE_AIWA_API_HOST || DEFAULT_BASE_URL
		),
		endpoints: {
			generateUkesmail: runtimeConfig.endpoints?.generateUkesmail || 'generate/ukesmail',
			healthz: runtimeConfig.endpoints?.healthz || 'healthz'
		},
		timeoutMs: runtimeConfig.timeoutMs ?? DEFAULT_TIMEOUT_MS
	};
}

function createTimeout() {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs);

	return {
		signal: controller.signal,
		clear: () => clearTimeout(timeoutId)
	};
}

export async function callChunked(request, callback) {
	const timeout = createTimeout();

	try {
		const response = await fetch(generateUrl, {
			credentials: 'omit',
			headers: STREAM_HEADERS,
			method: 'POST',
			body: JSON.stringify(request),
			signal: timeout.signal
		});

		if (!response.ok) {
			throw new Error(`API request failed (${response.status} ${response.statusText})`);
		}

		if (!response.body) {
			throw new Error('API response did not include a readable body.');
		}

		await readStream(response.body, callback);
	} finally {
		timeout.clear();
	}
}

async function readStream(stream, callback) {
	const reader = stream.getReader();
	const textDecoder = new TextDecoder();

	try {
		let result = await reader.read();
		while (!result.done) {
			callback(textDecoder.decode(result.value, { stream: true }));
			result = await reader.read();
		}

		const tail = textDecoder.decode();
		if (tail.length > 0) {
			callback(tail);
		}
	} finally {
		reader.releaseLock();
	}
}

export function callHealthCheck() {
	const timeout = createTimeout();

	return fetch(healthCheckUrl, {
		credentials: 'omit',
		method: 'GET',
		signal: timeout.signal
	}).finally(() => timeout.clear());
}
