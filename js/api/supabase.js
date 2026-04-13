// 🔴 DADOS DO SUPABASE
const SUPABASE_URL = "https://qaqszkhkizeifwkhumka.supabase.co";
const SUPABASE_KEY = "sb_publishable_D8_2NXn6BH9xA_RnfEJ-uA_jventu5_";

// 🔴 CLIENTE CORRETO PARA NOVA API
window.supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY,
  {
    auth: {
      persistSession: false
    }
  }
);

// 🔴 API PADRONIZADA
window.api = {
  async insert(table, payload) {
    const { data, error } = await window.supabaseClient
      .from(table)
      .insert(payload)
      .select();

    if (error) {
      console.error("Erro insert:", error);
      throw error;
    }

    return data;
  },

  async select(table, filters = {}) {
    let query = window.supabaseClient.from(table).select("*");

    Object.entries(filters).forEach(([k, v]) => {
      query = query.eq(k, v);
    });

    const { data, error } = await query;

    if (error) {
      console.error("Erro select:", error);
      throw error;
    }

    return data;
  }
};
