export type ApiError = {
	message: string;
	status?: number;
	details?: unknown;
};

export class ApiClient {
	constructor(
		private baseUrl: string,
		private apiKey?: string,
		private authToken?: string,
	) {}

	private buildHeaders(headers?: HeadersInit) {
		const h: Record<string, string> = {
			...((headers as Record<string, string>) || {}),
		};
		if (this.apiKey) h["x-api-key"] = this.apiKey;
		if (this.authToken) h.authorization = h.authorization ?? `Bearer ${this.authToken}`;
		h["content-type"] = h["content-type"] ?? "application/json";
		return h;
	}

	private async normalize(res: Response) {
		const text = await res.text();
		let body: unknown = text;
		try {
			body = text ? JSON.parse(text) : undefined;
		} catch {}
		if (!res.ok) {
			const err: ApiError = {
				message: res.statusText || "Request failed",
				status: res.status,
				details: body,
			};
			throw err;
		}
		return body;
	}

	private async safeFetch(input: RequestInfo, init?: RequestInit) {
		try {
			const res = await fetch(input, init);
			return await this.normalize(res);
		} catch (e: any) {
			if ((e && e.message) || typeof e === "string") {
				throw { message: e.message ?? String(e) } as ApiError;
			}
			throw { message: "Unknown fetch error", details: e } as ApiError;
		}
	}

	public async get<T = unknown>(path: string, headers?: HeadersInit) {
		const url = this.baseUrl + path;
		return this.safeFetch(url, {
			method: "GET",
			headers: this.buildHeaders(headers),
		}) as Promise<T>;
	}

	public async post<T = unknown>(
		path: string,
		body?: unknown,
		headers?: HeadersInit,
	) {
		const url = this.baseUrl + path;
		return this.safeFetch(url, {
			method: "POST",
			headers: this.buildHeaders(headers),
			body: body == null ? undefined : JSON.stringify(body),
		}) as Promise<T>;
	}
}

export default ApiClient;
