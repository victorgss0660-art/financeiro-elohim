

window.utils = {
  moeda(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
  },

  num(valor) {
    return Math.round(Number(valor || 0) * 100) / 100;
  },

  hojeISO() {
    return new Date().toISOString().slice(0, 10);
  },

  getMesAno() {
    return {
      mes: document.getElementById("mesSelect").value,
      ano: document.getElementById("anoSelect").value
    };
  },

  setAppMsg(texto, tipo = "info") {
    const el = document.getElementById("appMsg");
    if (!el) return;
    el.className = tipo;
    el.textContent = texto;
  },

  setLoginMsg(texto, tipo = "info") {
    const el = document.getElementById("loginMsg");
    if (!el) return;
    el.className = tipo;
    el.textContent = texto;
  },

  definirMesAtual() {
    const hoje = new Date();
    const meses = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
    document.getElementById("mesSelect").value = meses[hoje.getMonth()];
    document.getElementById("anoSelect").value = String(hoje.getFullYear());
  }
};

