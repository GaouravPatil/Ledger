const API_BASE = import.meta.env.VITE_API_URL || "/api";

const request = async (path, options = {}) => {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(
      payload?.message || `Request failed with status ${response.status}.`,
    );
    error.status = response.status;
    error.details = payload?.details;
    throw error;
  }

  return payload;
};

const body = (data) => JSON.stringify(data);

export const api = {
  health: () => request("/health"),
  stats: () => request("/accounts/stats"),
  listAccounts: () => request("/accounts"),
  getAccount: (id) => request(`/accounts/${id}`),
  createAccount: (data) =>
    request("/accounts", { method: "POST", body: body(data) }),
  updateAccount: (id, data) =>
    request(`/accounts/${id}`, { method: "PATCH", body: body(data) }),
  deleteAccount: (id) =>
    request(`/accounts/${id}`, { method: "DELETE" }),
  listTransactions: (limit = 50) =>
    request(`/transactions?limit=${limit}`),
  deposit: (accountId, data) =>
    request(`/accounts/${accountId}/deposit`, {
      method: "POST",
      body: body(data),
    }),
  withdraw: (accountId, data) =>
    request(`/accounts/${accountId}/withdraw`, {
      method: "POST",
      body: body(data),
    }),
  transfer: (data) =>
    request("/transactions/transfer", {
      method: "POST",
      body: body(data),
    }),
};
