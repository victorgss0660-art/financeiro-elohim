const SUPABASE_URL = "https://qaqszkhkizeifwkhumka.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_D8_2NXn6BH9xA_RnfEJ-uA_jventu5_";

window.api = {
  async request(table, query = "", options = {}) {
    const url = `${SUPABASE_URL}/rest/v1/${table}${query ? "?" + query : ""}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
        ...(options.headers || {})
      }
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Erro Supabase: ${response.status}`);
    }

    const text = await response.text();
    return text ? JSON.parse(text) : null;
  },

  async select(table, filters = {}) {
    const params = new URLSearchParams();
    params.set("select", "*");

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params.set(key, `eq.${value}`);
      }
    });

    return await this.request(table, params.toString(), {
      method: "GET"
    });
  },

  async restGet(table, query = "select=*") {
    return await this.request(table, query, {
      method: "GET"
    });
  },

  async insert(table, data) {
    return await this.request(table, "", {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  async update(table, id, data) {
    return await this.request(table, `id=eq.${id}`, {
      method: "PATCH",
      body: JSON.stringify(data)
    });
  },

  async delete(table, id) {
    return await this.request(table, `id=eq.${id}`, {
      method: "DELETE"
    });
  },

  async remove(table, id) {
    return await this.delete(table, id);
  }
};
