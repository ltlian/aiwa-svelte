import type { AiwaRequest } from './aiwaRequest';

declare global {
	var aiwaConfig: {
		baseUrl?: string;
		endpoints?: {
			generateUkesmail?: string;
			healthz?: string;
		};
	};
}

const config = {
	baseUrl: new URL(globalThis.aiwaConfig?.baseUrl || import.meta.env.VITE_AIWA_API_HOST),
	endpoints: {
		generateUkesmail: globalThis.aiwaConfig?.endpoints?.generateUkesmail || 'generate/ukesmail',
		healthz: globalThis.aiwaConfig?.endpoints?.healthz || 'healthz'
	},
	timeoutMs: 360000
};

const headersAcceptStream: HeadersInit = {
	Accept: 'text/event-stream',
	'Content-Type': 'application/json'
};

const generateUrl = new URL(config.endpoints.generateUkesmail, config.baseUrl);
const healthCheckUrl = new URL(config.endpoints.healthz, config.baseUrl);

export async function callChunkedAsync(
	request: AiwaRequest,
	callback: (segment: string) => void
): Promise<void> {
	const body: BodyInit = JSON.stringify(request);
	const controller = new AbortController();
	const _ = setTimeout(() => controller.abort(), config.timeoutMs);

	const options: RequestInit = {
		credentials: 'omit',
		headers: headersAcceptStream,
		method: 'POST',
		body,
		signal: controller.signal
	};

	var response = await fetch(generateUrl, options);
	if (response.body == null) throw Error();

	const reader = response.body.getReader();
	let result = await reader.read();
	const textDecoder = new TextDecoder();
	while (!result.done) {
		const segment = textDecoder.decode(result.value);

		callback(segment);

		result = await reader.read();
	}
}

export function callHealthCheckAsync(): Promise<Response> {
	const controller = new AbortController();
	const _ = setTimeout(() => controller.abort(), config.timeoutMs);

	const options: RequestInit = {
		credentials: 'omit',
		method: 'GET',
		signal: controller.signal
	};

	return fetch(healthCheckUrl, options);
}
