const SUPABASE_URL = "https://qaqszkhkizeifwkhumka.supabase.co/rest/v1/";
const SUPABASE_KEY = "sb_publishable_D8_2NXn6BH9xA_RnfEJ-uA_jventu5_";

window.api = {

  async request(table, query = "", method = "GET", body = null) {

    let url =
      `${SUPABASE_URL}/rest/v1/${table}`;

    if (query && query !== "") {
      url += `?${query}`;
    }

    const options = {
      method,
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation"
      }
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const res = await fetch(url, options);

    const txt = await res.text();

    if (!res.ok) {
      throw new Error(txt);
    }

    return txt ? JSON.parse(txt) : [];
  },

  async restGet(table, query = "select=*") {
    return await this.request(table, query, "GET");
  },

  async insert(table, data) {
    return await this.request(table, "", "POST", data);
  },

  async update(table, id, data) {
    return await this.request(
      table,
      `id=eq.${id}`,
      "PATCH",
      data
    );
  },

  async delete(table, id) {
    return await this.request(
      table,
      `id=eq.${id}`,
      "DELETE"
    );
  }
};
