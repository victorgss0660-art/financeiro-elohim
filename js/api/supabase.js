const SUPABASE_URL = "https://qaqszkhkizeifwkhumka.supabase.co";
const SUPABASE_KEY = "sb_publishable_D8_2NXn6BH9xA_RnfEJ-uA_jventu5_";

window.supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY,
  {
    auth: {
      persistSession: false
    }
  }
);

window.api = {
  async insert(table, payload) {
    const { data, error } = await window.supabaseClient
      .from(table)
      .insert(payload)
      .select();

    if (error) {
      console.error(`Erro INSERT em ${table}:`, error);
      throw new Error(error.message || "Erro ao inserir dados.");
    }

    return data;
  },

  async select(table, filters = {}) {
    let query = window.supabaseClient.from(table).select("*");

    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });

    const { data, error } = await query;

    if (error) {
      console.error(`Erro SELECT em ${table}:`, error);
      throw new Error(error.message || "Erro ao buscar dados.");
    }

    return data;
  },

  async update(table, id, payload) {
    const { data, error } = await window.supabaseClient
      .from(table)
      .update(payload)
      .eq("id", id)
      .select();

    if (error) {
      console.error(`Erro UPDATE em ${table}:`, error);
      throw new Error(error.message || "Erro ao atualizar dados.");
    }

    return data;
  },

  async delete(table, id) {
    const { error } = await window.supabaseClient
      .from(table)
      .delete()
      .eq("id", id);

    if (error) {
      console.error(`Erro DELETE em ${table}:`, error);
      throw new Error(error.message || "Erro ao excluir dados.");
    }

    return true;
  }
};
