const API_BASE = "http://localhost:5000/api";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || "Request failed");
  }

  return response.json();
}

export async function uploadPdf(file) {
  const data = new FormData();
  data.append("file", file);
  const response = await fetch(`${API_BASE}/upload/pdf`, {
    method: "POST",
    body: data
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "Upload failed" }));
    throw new Error(err.error || "Upload failed");
  }

  return response.json();
}

export function createDeck(payload) {
  return request("/decks", { method: "POST", body: JSON.stringify(payload) });
}

export function listDecks() {
  return request("/decks");
}

export function generateCards(deckId) {
  return request("/decks/generate", { method: "POST", body: JSON.stringify({ deckId }) });
}

export function getDeckCards(deckId) {
  return request(`/decks/${deckId}/cards`);
}

export function getDueCards(deckId) {
  return request(`/review/due/${deckId}`);
}

export function submitReview(payload) {
  return request("/review/submit", { method: "POST", body: JSON.stringify(payload) });
}

export function getDeckAnalytics(deckId) {
  return request(`/analytics/deck/${deckId}`);
}
