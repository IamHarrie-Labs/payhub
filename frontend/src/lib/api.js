const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

async function request(path, opts = {}) {
  const res  = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...opts.headers },
    ...opts,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || `Request failed: ${res.status}`);
  return json;
}

export const api = {
  preflight:        (body)              => request("/payments/preflight", { method: "POST", body: JSON.stringify(body) }),
  registerPayment:  (body)              => request("/payments/register",  { method: "POST", body: JSON.stringify(body) }),
  getPayment:       (id)                => request(`/payments/${id}`),
  disputePreflight: (id, callerAddress) => request(`/payments/${id}/dispute/preflight`, { method: "POST", body: JSON.stringify({ callerAddress }) }),
  registerDispute:  (id, body)          => request(`/payments/${id}/dispute/register`,  { method: "POST", body: JSON.stringify(body) }),
  resolve:          (id, body)          => request(`/payments/${id}/resolve`, { method: "POST", body: JSON.stringify(body) }),
  autoResolve:      (id)                => request(`/payments/${id}/auto-resolve`, { method: "POST", body: JSON.stringify({}) }),
  getAudit:         (id)                => request(`/payments/${id}/audit`),
};
