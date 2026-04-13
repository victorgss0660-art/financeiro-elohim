// ======================================================
// SUPABASE CONFIG
// ======================================================

// COLE AQUI OS DADOS REAIS DO SEU PROJETO
const SUPABASE_URL = "https://qaqszkhkizeifwkhumka.supabase.co";
const SUPABASE_KEY = "sb_publishable_D8_2NXn6BH9xA_RnfEJ-uA_jventu5_";

// ======================================================
// VALIDACAO BASICA
// ======================================================
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Supabase não configurado corretamente.");
}

if (!window.supabase || typeof window.supabase.createClient !== "function") {
  console.error("Biblioteca do Supabase não carregada. Verifique o index.html.");
}

// ======================================================
// CLIENTE GLOBAL
// ======================================================
window.supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false
    }
  }
);

// ======================================================
// HELPERS
// ======================================================
window.api = {
  // -----------------------------
  // API NOVA
  // -----------------------------
  async select(table, filters = {}) {
    let query = window.supabaseClient.from(table).select("*");

    for (const [key, value] of Object.entries(filters)) {
      query = query.eq(key, value);
    }

    const { data, error } = await query;

    if (error) {
      console.error(`Erro SELECT em ${table}:`, error);
      throw new Error(error.message || `Erro ao consultar ${table}`);
    }

    return data;
  },

  async insert(table, payload) {
    const rows = Array.isArray(payload) ? payload : [payload];

    const { data, error } = await window.supabaseClient
      .from(table)
      .insert(rows)
      .select();

    if (error) {
      console.error(`Erro INSERT em ${table}:`, error);
      throw new Error(error.message || `Erro ao inserir em ${table}`);
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
      throw new Error(error.message || `Erro ao atualizar ${table}`);
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
      throw new Error(error.message || `Erro ao excluir em ${table}`);
    }

    return true;
  },

  // -----------------------------
  // COMPATIBILIDADE COM REST ANTIGO
  // -----------------------------

  async restGet(table, queryString = "") {
    let query = window.supabaseClient.from(table).select("*");

    const params = this._parseQueryString(queryString);

    // select
    if (params.select) {
      query = window.supabaseClient.from(table).select(params.select);
    }

    // filtros
    Object.entries(params.filters).forEach(([field, rule]) => {
      const { op, value } = rule;

      switch (op) {
        case "eq":
          query = query.eq(field, value);
          break;
        case "neq":
          query = query.neq(field, value);
          break;
        case "gt":
          query = query.gt(field, value);
          break;
        case "gte":
          query = query.gte(field, value);
          break;
        case "lt":
          query = query.lt(field, value);
          break;
        case "lte":
          query = query.lte(field, value);
          break;
        case "like":
          query = query.like(field, value);
          break;
        case "ilike":
          query = query.ilike(field, value);
          break;
        default:
          break;
      }
    });

    // order
    if (params.order) {
      const [column, direction] = params.order.split(".");
      query = query.order(column, { ascending: direction !== "desc" });
    }

    // limit
    if (params.limit) {
      query = query.limit(Number(params.limit));
    }

    const { data, error } = await query;

    if (error) {
      console.error(`Erro restGet em ${table}:`, error);
      throw new Error(error.message || `Erro ao buscar ${table}`);
    }

    return data;
  },

  async restInsert(table, payload) {
    const rows = Array.isArray(payload) ? payload : [payload];

    const { data, error } = await window.supabaseClient
      .from(table)
      .insert(rows)
      .select();

    if (error) {
      console.error(`Erro restInsert em ${table}:`, error);
      throw new Error(error.message || `Erro ao inserir em ${table}`);
    }

    return data;
  },

  async restPatch(table, condition = "", payload = {}) {
    let query = window.supabaseClient.from(table).update(payload);

    const parsed = this._parseCondition(condition);

    if (parsed) {
      const { field, op, value } = parsed;

      switch (op) {
        case "eq":
          query = query.eq(field, value);
          break;
        case "neq":
          query = query.neq(field, value);
          break;
        case "gt":
          query = query.gt(field, value);
          break;
        case "gte":
          query = query.gte(field, value);
          break;
        case "lt":
          query = query.lt(field, value);
          break;
        case "lte":
          query = query.lte(field, value);
          break;
        default:
          break;
      }
    }

    const { data, error } = await query.select();

    if (error) {
      console.error(`Erro restPatch em ${table}:`, error);
      throw new Error(error.message || `Erro ao atualizar ${table}`);
    }

    return data;
  },

  async restDelete(table, condition = "") {
    let query = window.supabaseClient.from(table).delete();

    const parsed = this._parseCondition(condition);

    if (parsed) {
      const { field, op, value } = parsed;

      switch (op) {
        case "eq":
          query = query.eq(field, value);
          break;
        case "neq":
          query = query.neq(field, value);
          break;
        case "gt":
          query = query.gt(field, value);
          break;
        case "gte":
          query = query.gte(field, value);
          break;
        case "lt":
          query = query.lt(field, value);
          break;
        case "lte":
          query = query.lte(field, value);
          break;
        default:
          break;
      }
    }

    const { error } = await query;

    if (error) {
      console.error(`Erro restDelete em ${table}:`, error);
      throw new Error(error.message || `Erro ao excluir de ${table}`);
    }

    return true;
  },

  // -----------------------------
  // PARSERS
  // -----------------------------
  _parseQueryString(queryString = "") {
    const result = {
      select: "*",
      order: "",
      limit: "",
      filters: {}
    };

    if (!queryString || typeof queryString !== "string") {
      return result;
    }

    const parts = queryString.split("&").filter(Boolean);

    parts.forEach(part => {
      const [rawKey, ...rawRest] = part.split("=");
      const key = decodeURIComponent(rawKey || "").trim();
      const value = decodeURIComponent(rawRest.join("=") || "").trim();

      if (!key) return;

      if (key === "select") {
        result.select = value || "*";
        return;
      }

      if (key === "order") {
        result.order = value;
        return;
      }

      if (key === "limit") {
        result.limit = value;
        return;
      }

      // filtro tipo status=eq.pago
      const dotIndex = value.indexOf(".");
      if (dotIndex > -1) {
        const op = value.slice(0, dotIndex);
        const filterValue = value.slice(dotIndex + 1);

        result.filters[key] = {
          op,
          value: this._coerceValue(filterValue)
        };
      }
    });

    return result;
  },

  _parseCondition(condition = "") {
    if (!condition || typeof condition !== "string") return null;

    // exemplo: id=eq.10
    const [fieldRaw, valueRaw] = condition.split("=");
    const field = String(fieldRaw || "").trim();
    const raw = String(valueRaw || "").trim();

    if (!field || !raw.includes(".")) return null;

    const dotIndex = raw.indexOf(".");
    const op = raw.slice(0, dotIndex);
    const value = raw.slice(dotIndex + 1);

    return {
      field,
      op,
      value: this._coerceValue(value)
    };
  },

  _coerceValue(value) {
    const text = String(value ?? "").trim();

    if (text === "true") return true;
    if (text === "false") return false;
    if (text !== "" && !Number.isNaN(Number(text))) return Number(text);

    return text;
  }
};
