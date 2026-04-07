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
    return this.CATEGORIAS
      .map(item => this.normalizarTexto(item))
      .includes(cat);
  },

  categoriaCanonica(categoria) {
    const cat = this.normalizarTexto(categoria);
    const encontrada = this.CATEGORIAS.find(
      item => this.normalizarTexto(item) === cat
    );

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
    if (valor === null || valor === undefined) return 0;

    let texto = String(valor).trim();
    if (!texto) return 0;

    texto = texto.replace(/R\$/gi, "").replace(/\s/g, "");

    const temVirgula = texto.includes(",");
    const temPonto = texto.includes(".");

    if (temVirgula && temPonto) {
      texto = texto.replace(/\./g, "").replace(",", ".");
      return Number(texto) || 0;
    }

    if (temVirgula) {
      texto = texto.replace(",", ".");
      return Number(texto) || 0;
    }

    return Number(texto) || 0;
  },

  arredondar(valor, casas = 2) {
    return Number(Number(valor || 0).toFixed(casas));
  },

  percentual(valor, total) {
    if (!Number(total)) return 0;
    return (Number(valor || 0) / Number(total)) * 100;
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

  normalizarDataISO(valor) {
    if (!valor) return "";

    if (typeof valor === "string") {
      const v = valor.trim();
      if (!v) return "";

      if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;

      if (/^\d{2}\/\d{2}\/\d{4}$/.test(v)) {
        const [dd, mm, yyyy] = v.split("/");
        return `${yyyy}-${mm}-${dd}`;
      }

      const d = new Date(v);
      if (!Number.isNaN(d.getTime())) {
        return d.toISOString().slice(0, 10);
      }

      return "";
    }

    if (typeof valor === "number") {
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      const date = new Date(excelEpoch.getTime() + valor * 86400000);
      return date.toISOString().slice(0, 10);
    }

    if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
      return valor.toISOString().slice(0, 10);
    }

    return "";
  },

  definirMesAtual() {
    const mesSelect = document.getElementById("mesSelect");
    const anoSelect = document.getElementById("anoSelect");

    const agora = new Date();
    const meses = [
      "Janeiro",
      "Fevereiro",
      "Março",
      "Abril",
      "Maio",
      "Junho",
      "Julho",
      "Agosto",
      "Setembro",
      "Outubro",
      "Novembro",
      "Dezembro"
    ];

    const mesAtual = meses[agora.getMonth()];
    const anoAtual = String(agora.getFullYear());

    if (mesSelect) {
      const existeMes = Array.from(mesSelect.options).some(
        opt => opt.value === mesAtual || opt.text === mesAtual
      );
      if (existeMes) mesSelect.value = mesAtual;
    }

    if (anoSelect) {
      const existeAno = Array.from(anoSelect.options).some(
        opt => opt.value === anoAtual || opt.text === anoAtual
      );
      if (existeAno) anoSelect.value = anoAtual;
    }
  },

  getMesAno() {
    const mesSelect = document.getElementById("mesSelect");
    const anoSelect = document.getElementById("anoSelect");

    return {
      mes: mesSelect ? mesSelect.value : "",
      ano: anoSelect ? Number(anoSelect.value || 0) : 0
    };
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

  totalizar(lista, campoValor = "valor") {
    return (lista || []).reduce((acc, item) => {
      return acc + Number(item?.[campoValor] || 0);
    }, 0);
  }
};

window.utils.num = window.utils.numero;
