export interface Env {
	FEEDBACK_KV: KVNamespace;
	STATS_KV: KVNamespace;
	FEEDBACK_R2: R2Bucket;
}

// Max bytes = 9GB to protect against 10GB free quota
const MAX_BYTES = 9 * 1024 * 1024 * 1024;

const CORS_HEADERS = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "POST, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type",
};

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		// Handle CORS preflight
		if (request.method === "OPTIONS") {
			return new Response(null, {
				status: 204,
				headers: CORS_HEADERS,
			});
		}

		if (request.method !== "POST") {
			return new Response("Use POST", {
				status: 405,
				headers: { ...CORS_HEADERS, Allow: "POST, OPTIONS" },
			});
		}

		const ct = request.headers.get("content-type") ?? "";
		let text = "";
		const images: { name: string; buffer: ArrayBuffer; type: string }[] = [];

		// Extract text/decode base64 img
		if (ct.startsWith("application/json")) {
			const payload = (await request.json()) as {
				text?: string;
				images?: string[];
			};
			text = payload.text ?? "";
			for (let i = 0; i < (payload.images ?? []).length; i++) {
				const data = payload.images![i];
				const { buffer, type } = decodeBase64(data);
				images.push({ name: `image_${i}.png`, buffer, type });
			}
		}
		else if (ct.startsWith("multipart/form-data")) {
			const form = await request.formData();
			text = String(form.get("text") ?? "");
			for (const entry of form.getAll("images")) {
				if (entry instanceof Blob) {
					const blob = entry as Blob & { name?: string };
					const buffer = await blob.arrayBuffer();
					const name = blob instanceof File ? blob.name : `image`;
					images.push({
						name,
						buffer,
						type: blob.type || "application/octet-stream",
					});
				}
			}
		}
		else {
			return new Response("Unsupported content-type", {
				status: 415,
				headers: CORS_HEADERS,
			});
		}

		if (!text.trim()) {
			return new Response("Empty feedback", {
				status: 400,
				headers: CORS_HEADERS,
			});
		}

		// Free quota guard
		const used = Number((await env.STATS_KV.get("bytes_used")) ?? "0");
		const incoming = images.reduce((sum, img) => sum + img.buffer.byteLength, 0);
		if (used + incoming > MAX_BYTES) {
			return new Response("Storage quota reached", {
				status: 507,
				headers: CORS_HEADERS,
			});
		}

		// Generate unique ID / timestamp
		const id = crypto.randomUUID();
		const ts = Date.now();
		const r2Keys: string[] = [];

		// Store image in R2
		for (const img of images) {
			const key = `${id}/${img.name}`;
			await env.FEEDBACK_R2.put(key, img.buffer, {
				httpMetadata: { contentType: img.type },
			});
			r2Keys.push(key);
		}

		// Store feedback in kv
		await env.FEEDBACK_KV.put(
			id,
			JSON.stringify({ id, ts, text, images: r2Keys })
		);

		// Store bytes in KV
		await env.STATS_KV.put("bytes_used", String(used + incoming));

		return new Response(JSON.stringify({ ok: true, id }), {
			status: 200,
			headers: CORS_HEADERS,
		});
	},
};

function decodeBase64(data: string): { buffer: ArrayBuffer; type: string } {
	const match = data.match(/^data:(.+?);base64,(.+)$/);
	const type = match?.[1] ?? "application/octet-stream";
	const raw = match?.[2] ?? data;
	const bin = atob(raw);
	const len = bin.length;
	const bytes = new Uint8Array(len);
	for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
	return { buffer: bytes.buffer, type };
}
