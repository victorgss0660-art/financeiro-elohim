

window.api = {
  async restGet(tabela, query) {
    const res = await fetch(`${window.APP_CONFIG.API_BASE}/rest/v1/${tabela}?${query}`, {
      headers: {
        apikey: window.APP_CONFIG.API_KEY,
        Authorization: "Bearer " + window.APP_CONFIG.API_KEY
      }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "Erro GET");
    return data;
  },

  async restInsert(tabela, payload) {
    const res = await fetch(`${window.APP_CONFIG.API_BASE}/rest/v1/${tabela}`, {
      method: "POST",
      headers: {
        apikey: window.APP_CONFIG.API_KEY,
        Authorization: "Bearer " + window.APP_CONFIG.API_KEY,
        "Content-Type": "application/json",
        Prefer: "return=representation"
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "Erro INSERT");
    return data;
  },

  async restPatch(tabela, filtros, payload) {
    const res = await fetch(`${window.APP_CONFIG.API_BASE}/rest/v1/${tabela}?${filtros}`, {
      method: "PATCH",
      headers: {
        apikey: window.APP_CONFIG.API_KEY,
        Authorization: "Bearer " + window.APP_CONFIG.API_KEY,
        "Content-Type": "application/json",
        Prefer: "return=representation"
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "Erro PATCH");
    return data;
  },

  async restDelete(tabela, filtros) {
    const res = await fetch(`${window.APP_CONFIG.API_BASE}/rest/v1/${tabela}?${filtros}`, {
      method: "DELETE",
      headers: {
        apikey: window.APP_CONFIG.API_KEY,
        Authorization: "Bearer " + window.APP_CONFIG.API_KEY
      }
    });
    if (!res.ok) {
      let data = {};
      try { data = await res.json(); } catch {}
      throw new Error(data?.message || "Erro DELETE");
    }
  }
};

