// 🔴 CONFIGURAÇÃO DO SUPABASE
const SUPABASE_URL = "https://qaqszkhkizeifwkhumka.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_D8_2NXn6BH9xA_RnfEJ-uA_jventu5_";

// 🔴 VALIDAÇÃO
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Supabase não configurado corretamente!");
}

// 🔴 CRIA CLIENTE GLOBAL
const _supabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

// 🔴 EXPÕE GLOBALMENTE
window.supabaseClient = _supabase;

// 🔴 API PADRONIZADA (NÍVEL EMPRESA)
window.api = {
  async select(table, filters = {}) {
    let query = _supabase.from(table).select("*");

    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });

    const { data, error } = await query;

    if (error) {
      console.error(`Erro SELECT em ${table}:`, error);
      throw error;
    }

    return data;
  },

  async insert(table, payload) {
    const { data, error } = await _supabase
      .from(table)
      .insert(payload)
      .select();

    if (error) {
      console.error(`Erro INSERT em ${table}:`, error);
      throw error;
    }

    return data;
  },

  async update(table, id, payload) {
    const { data, error } = await _supabase
      .from(table)
      .update(payload)
      .eq("id", id)
      .select();

    if (error) {
      console.error(`Erro UPDATE em ${table}:`, error);
      throw error;
    }

    return data;
  },

  async delete(table, id) {
    const { error } = await _supabase
      .from(table)
      .delete()
      .eq("id", id);

    if (error) {
      console.error(`Erro DELETE em ${table}:`, error);
      throw error;
    }

    return true;
  }
};
