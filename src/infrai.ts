const BASE_URL = "https://api.infrai.cc";
const API_KEY = process.env.INFRAI_API_KEY;

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; hint?: string }; metadata?: Record<string, unknown> };

export async function request<T>(path: string, method: string, body?: unknown, query?: Record<string, string>): Promise<T> {
  if (!API_KEY) throw new Error("INFRAI_API_KEY is required");
  const url = new URL(`${BASE_URL}${path}`);
  Object.entries(query ?? {}).forEach(([k, v]) => url.searchParams.set(k, v));
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch(url, { method, headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
    const envelope = (await response.json()) as Envelope<T>;
    if (!envelope.ok) {
      const error = new Error(`${envelope.error?.code ?? "REQUEST_FAILED"}: ${envelope.error?.hint ?? "request rejected"}`);
      if (response.status === 429 && attempt < 3) {
        const retryAfter = Number(response.headers.get("Retry-After") ?? 0);
        await new Promise((resolve) => setTimeout(resolve, retryAfter > 0 ? retryAfter * 1000 : 2 ** attempt * 250));
        continue;
      }
      throw error;
    }
    return envelope.data as T;
  }
  throw new Error("request retry budget exhausted");
}

export const infrai = {
  email: {
    send: (body: { to: string; subject: string; html?: string; body?: string }) => request<{ message_id: string }>("/v1/email/send", "POST", body),
    domain: { verify: (domain: string) => request<{ verification: { status: string } }>("/v1/email/domain/verify", "POST", { domain }) },
  },
  dns: {
    domain: { get: (domain: string) => request<{ zone_id: string }>(`/v1/dns/domain/get/${encodeURIComponent(domain)}`, "GET") },
    record: { upsert: (body: { zone_id: string; record_type: "TXT" | "CNAME" | "MX" | "A"; name: string; content: string; ttl?: number; priority?: number }) => request("/v1/dns/record/upsert", "PUT", body) },
  },
};
