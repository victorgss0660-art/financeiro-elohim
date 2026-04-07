window.utils = {
  CATEGORIAS: [
    "MC",
    "MP",
    "TERC",
    "FRETE",
    "DESP",
    "TAR",
    "PREST",
    "FOLHA",
    "COMIS",
    "IMPOS",
    "RESC",
    "MANUT",
    "ANTECIPAÇÃO"
  ],

  normalizarTexto(valor) {
    return String(valor || "")
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase();
  },

  categoriaValida(categoria) {
    const cat = this.normalizarTexto(categoria);
    return this.CATEGORIAS.map(c => this.normalizarTexto(c)).includes(cat);
  },

  categoriaCanonica(categoria) {
    const cat = this.normalizarTexto(categoria);
    const encontrada = this.CATEGORIAS.find(c => this.normalizarTexto(c) === cat);
    return encontrada || String(categoria || "").trim().toUpperCase();
  },

  getCategorias() {
    return [...this.CATEGORIAS];
  },

  moeda(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
  },

  numero(valor) {
    if (typeof valor === "number") return valor;
    if (valor == null) return 0;

    const texto = String(valor).trim();
    if (!texto) return 0;

    const limpo = texto.replace(/[R$\s]/g, "");
    const temVirgula = limpo.includes(",");
    const temPonto = limpo.includes(".");

    if (temVirgula && temPonto) {
      return Number(limpo.replace(/\./g, "").replace(",", ".")) || 0;
    }

    if (temVirgula) {
      return Number(limpo.replace(",", ".")) || 0;
    }

    return Number(limpo) || 0;
  },

  hojeISO() {
    return new Date().toISOString().slice(0, 10);
  },

  formatarDataBR(data) {
    if (!data) return "-";

    if (/^\d{4}-\d{2}-\d{2}$/.test(String(data))) {
      const [yyyy, mm, dd] = String(data).split("-");
      return `${dd}/${mm}/${yyyy}`;
    }

    const d = new Date(data);
    if (Number.isNaN(d.getTime())) return "-";

    return d.toLocaleDateString("pt-BR");
  },

  definirMesAtual() {
    const mesSelect = document.getElementById("mesSelect");
    const anoSelect = document.getElementById("anoSelect");

    const agora = new Date();
    const mesAtual = agora.toLocaleString("pt-BR", { month: "long" });
    const mesFormatado = mesAtual.charAt(0).toUpperCase() + mesAtual.slice(1);
    const anoAtual = String(agora.getFullYear());

    if (mesSelect) {
      const existeMes = Array.from(mesSelect.options).some(opt => opt.text === mesFormatado);
      if (existeMes) mesSelect.value = mesFormatado;
    }

    if (anoSelect) {
      const existeAno = Array.from(anoSelect.options).some(opt => opt.text === anoAtual);
      if (existeAno) anoSelect.value = anoAtual;
    }
  },

  getMesAno() {
    const mesSelect = document.getElementById("mesSelect");
    const anoSelect = document.getElementById("anoSelect");

    const mes = mesSelect ? mesSelect.value : "";
    const ano = anoSelect ? Number(anoSelect.value || 0) : 0;

    return { mes, ano };
  },

  setAppMsg(msg, tipo = "info") {
    const el = document.getElementById("appMsg");
    if (!el) return;

    el.textContent = msg || "";
    el.classList.remove("info", "ok", "err");

    if (tipo === "ok") el.classList.add("ok");
    else if (tipo === "err") el.classList.add("err");
    else el.classList.add("info");
  },

  setLoginMsg(msg, tipo = "info") {
    const el = document.getElementById("loginMsg");
    if (!el) return;

    el.textContent = msg || "";
    el.classList.remove("info", "ok", "err");

    if (tipo === "ok") el.classList.add("ok");
    else if (tipo === "err") el.classList.add("err");
    else el.classList.add("info");
  },

  limparMsgApp() {
    const el = document.getElementById("appMsg");
    if (!el) return;
    el.textContent = "";
    el.classList.remove("info", "ok", "err");
  },

  limparMsgLogin() {
    const el = document.getElementById("loginMsg");
    if (!el) return;
    el.textContent = "";
    el.classList.remove("info", "ok", "err");
  },

  somarPorCategoria(lista, campoCategoria = "categoria", campoValor = "valor") {
    const mapa = {};

    (lista || []).forEach(item => {
      const categoria = this.categoriaCanonica(item?.[campoCategoria] || "");
      const valor = Number(item?.[campoValor] || 0);

      if (!mapa[categoria]) mapa[categoria] = 0;
      mapa[categoria] += valor;
    });

    return mapa;
  },

  percentual(valor, total) {
    if (!total) return 0;
    return (Number(valor || 0) / Number(total || 0)) * 100;
  },

  arredondar(valor, casas = 2) {
    return Number(Number(valor || 0).toFixed(casas));
  }
};
