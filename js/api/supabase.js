// ======================================================
// SUPABASE PROFISSIONAL - CLIENTE GLOBAL + API PADRÃO
// ======================================================

// COLE AQUI OS DADOS REAIS DO SEU PROJETO
const SUPABASE_URL = "https://qaqszkhkizeifwkhumka.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_D8_2NXn6BH9xA_RnfEJ-uA_jventu5_";

// ======================================================
// VALIDAÇÕES
// ======================================================
if (!window.supabase || typeof window.supabase.createClient !== "function") {
  throw new Error("Biblioteca do Supabase não carregada no index.html.");
}

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("SUPABASE_URL ou SUPABASE_ANON_KEY não configurados.");
}

// ======================================================
// CLIENTE GLOBAL
// ======================================================
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

// ======================================================
// HELPERS INTERNOS
// ======================================================
function coerceValue(value) {
  const text = String(value ?? "").trim();

  if (text === "true") return true;
  if (text === "false") return false;
  if (text !== "" && !Number.isNaN(Number(text))) return Number(text);

  return text;
}

function parseCondition(condition = "") {
  if (!condition || typeof condition !== "string") return null;

  // Ex: id=eq.10
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
    value: coerceValue(value)
  };
}

function applyFilter(query, field, op, value) {
  switch (op) {
    case "eq":
      return query.eq(field, value);
    case "neq":
      return query.neq(field, value);
    case "gt":
      return query.gt(field, value);
    case "gte":
      return query.gte(field, value);
    case "lt":
      return query.lt(field, value);
    case "lte":
      return query.lte(field, value);
    case "like":
      return query.like(field, value);
    case "ilike":
      return query.ilike(field, value);
    case "in":
      return query.in(field, Array.isArray(value) ? value : String(value).split(","));
    default:
      return query;
  }
}

function parseQueryString(queryString = "") {
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

    const dotIndex = value.indexOf(".");
    if (dotIndex > -1) {
      const op = value.slice(0, dotIndex);
      const filterValue = value.slice(dotIndex + 1);

      result.filters[key] = {
        op,
        value: coerceValue(filterValue)
      };
    }
  });

  return result;
}

function throwIfError(error, context) {
  if (error) {
    console.error(`[Supabase] ${context}:`, error);
    throw new Error(error.message || context);
  }
}

// ======================================================
// API PROFISSIONAL
// ======================================================
window.api = {
  // -------------------------
  // MÉTODOS NOVOS
  // -------------------------
  async select(table, filters = {}, options = {}) {
    let query = window.supabaseClient
      .from(table)
      .select(options.select || "*");

    Object.entries(filters).forEach(([field, value]) => {
      query = query.eq(field, value);
    });

    if (options.orderBy) {
      query = query.order(options.orderBy, {
        ascending: options.ascending !== false
      });
    }

    if (options.limit) {
      query = query.limit(Number(options.limit));
    }

    const { data, error } = await query;
    throwIfError(error, `Erro ao consultar ${table}`);
    return data;
  },

  async insert(table, payload) {
    const rows = Array.isArray(payload) ? payload : [payload];

    const { data, error } = await window.supabaseClient
      .from(table)
      .insert(rows)
      .select();

    throwIfError(error, `Erro ao inserir em ${table}`);
    return data;
  },

  async update(table, filters = {}, payload = {}) {
    let query = window.supabaseClient
      .from(table)
      .update(payload);

    Object.entries(filters).forEach(([field, value]) => {
      query = query.eq(field, value);
    });

    const { data, error } = await query.select();
    throwIfError(error, `Erro ao atualizar ${table}`);
    return data;
  },

  async remove(table, filters = {}) {
    let query = window.supabaseClient
      .from(table)
      .delete();

    Object.entries(filters).forEach(([field, value]) => {
      query = query.eq(field, value);
    });

    const { error } = await query;
    throwIfError(error, `Erro ao excluir em ${table}`);
    return true;
  },

  async callFunction(functionName, body = {}) {
    const { data, error } = await window.supabaseClient.functions.invoke(
      functionName,
      { body }
    );

    throwIfError(error, `Erro ao executar função ${functionName}`);
    return data;
  },

  // -------------------------
  // COMPATIBILIDADE LEGADA
  // -------------------------
  async restGet(table, queryString = "") {
    const params = parseQueryString(queryString);

    let query = window.supabaseClient
      .from(table)
      .select(params.select || "*");

    Object.entries(params.filters).forEach(([field, rule]) => {
      query = applyFilter(query, field, rule.op, rule.value);
    });

    if (params.order) {
      const [column, direction] = params.order.split(".");
      query = query.order(column, { ascending: direction !== "desc" });
    }

    if (params.limit) {
      query = query.limit(Number(params.limit));
    }

    const { data, error } = await query;
    throwIfError(error, `Erro ao buscar ${table}`);
    return data;
  },

  async restInsert(table, payload) {
    const rows = Array.isArray(payload) ? payload : [payload];

    const { data, error } = await window.supabaseClient
      .from(table)
      .insert(rows)
      .select();

    throwIfError(error, `Erro ao inserir em ${table}`);
    return data;
  },

  async restPatch(table, condition = "", payload = {}) {
    let query = window.supabaseClient
      .from(table)
      .update(payload);

    const parsed = parseCondition(condition);
    if (parsed) {
      query = applyFilter(query, parsed.field, parsed.op, parsed.value);
    }

    const { data, error } = await query.select();
    throwIfError(error, `Erro ao atualizar ${table}`);
    return data;
  },

  async restDelete(table, condition = "") {
    let query = window.supabaseClient
      .from(table)
      .delete();

    const parsed = parseCondition(condition);
    if (parsed) {
      query = applyFilter(query, parsed.field, parsed.op, parsed.value);
    }

    const { error } = await query;
    throwIfError(error, `Erro ao excluir em ${table}`);
    return true;
  }
};

// ======================================================
// TESTE OPCIONAL DE CONEXÃO
// ======================================================
window.testarSupabase = async function () {
  try {
    const { data, error } = await window.supabaseClient
      .from("gastos")
      .select("*")
      .limit(1);

    if (error) throw error;

    console.log("Supabase conectado com sucesso.", data);
    return true;
  } catch (err) {
    console.error("Falha na conexão com Supabase:", err);
    return false;
  }
};
