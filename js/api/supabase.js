const SUPABASE_URL = "https://qaqszkhkizeifwkhumka.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_D8_2NXn6BH9xA_RnfEJ-uA_jventu5_";

if (!window.supabase || typeof window.supabase.createClient !== "function") {
  throw new Error("Biblioteca do Supabase não carregada.");
}

window.supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);

window.api = {
  async select(table, filters = {}, options = {}) {
    let query = window.supabaseClient.from(table).select(options.select || "*");

    for (const [key, value] of Object.entries(filters)) {
      query = query.eq(key, value);
    }

    if (options.orderBy) {
      query = query.order(options.orderBy, {
        ascending: options.ascending !== false
      });
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async insert(table, payload) {
    const rows = Array.isArray(payload) ? payload : [payload];
    const { data, error } = await window.supabaseClient
      .from(table)
      .insert(rows)
      .select();

    if (error) throw error;
    return data;
  },

  async update(table, filters, payload) {
    let query = window.supabaseClient.from(table).update(payload);

    for (const [key, value] of Object.entries(filters)) {
      query = query.eq(key, value);
    }

    const { data, error } = await query.select();
    if (error) throw error;
    return data;
  },

  async remove(table, filters) {
    let query = window.supabaseClient.from(table).delete();

    for (const [key, value] of Object.entries(filters)) {
      query = query.eq(key, value);
    }

    const { error } = await query;
    if (error) throw error;
    return true;
  },

  async callFunction(functionName, body = {}) {
    const { data, error } = await window.supabaseClient.functions.invoke(
      functionName,
      { body }
    );

    if (error) throw error;
    return data;
  }
};
