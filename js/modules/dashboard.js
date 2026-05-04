const dashboardModule = {

  async carregar() {
    try {

      const gastos = await api.restGet("gastos", "select=*");
      const meses = await api.restGet("meses", "select=*");
      const metas = await api.restGet("metas", "select=*");

      this.processar(gastos || [], meses || [], metas || []);

    } catch (e) {
      console.error(e);
    }
  },

  numero(v) {
    return parseFloat(v || 0) || 0;
  },

  moeda(v) {
    return v.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
  },

  processar(gastos, meses, metas) {

    // ===== AGRUPAR GASTOS =====
    const totalGastos = gastos.reduce((t, g) => t + this.numero(g.valor), 0);

    // ===== FATURAMENTO =====
    const totalFaturamento = meses.reduce((t, m) => t + this.numero(m.faturamento), 0);

    // ===== LUCRO =====
    const lucro = totalFaturamento - totalGastos;

    // ===== METAS =====
    const metaTotalPercent = metas.reduce((t, m) => t + this.numero(m.percentual_meta), 0);

    const gastoIdeal = (totalFaturamento * metaTotalPercent) / 100;

    const estouro = totalGastos - gastoIdeal;

    // ===== STATUS =====
    let status = "SAUDÁVEL";
    let detalhe = "Operação dentro da meta";

    if (estouro > 0) {
      status = "CRÍTICO";
      detalhe = "Gastos acima da meta definida";
    }

    if (lucro < 0) {
      status = "CRÍTICO";
      detalhe = "Operação com prejuízo";
    }

    // ===== OUTPUT =====
    this.set("dashCEOReceberAberto", this.moeda(totalFaturamento));
    this.set("dashCEOPagarAberto", this.moeda(totalGastos));
    this.set("dashCEOSaldoProjetado", this.moeda(lucro));

    this.set("dashCEOStatus", status);
    this.set("dashCEOStatusDetalhe", detalhe);

    this.set("dashCEOLucroMes", this.moeda(lucro));
    this.set("dashCEOFluxoMensal", this.moeda(lucro));

    this.set("dashCEODiasCaixa", "—");

    const el = document.getElementById("dashCEOStatus");
    if (el) {
      el.className =
        status === "CRÍTICO" ? "status-critico" : "status-ok";
    }

    // ===== GRÁFICO CATEGORIA =====
    this.graficoCategorias(gastos);

    // ===== GRÁFICO REAL vs META =====
    this.graficoMeta(totalGastos, gastoIdeal);

  },

  graficoCategorias(gastos) {

    const mapa = {};

    gastos.forEach(g => {
      const cat = g.categoria || "Outros";
      mapa[cat] = (mapa[cat] || 0) + this.numero(g.valor);
    });

    const labels = Object.keys(mapa);
    const valores = Object.values(mapa);

    new Chart(document.getElementById("chartCEOCategorias"), {
      type: "doughnut",
      data: {
        labels,
        datasets: [{ data: valores }]
      }
    });
  },

  graficoMeta(real, meta) {

    new Chart(document.getElementById("chartCEOFluxo"), {
      type: "bar",
      data: {
        labels: ["Real", "Meta"],
        datasets: [{
          data: [real, meta]
        }]
      }
    });
  },

  set(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

};

window.dashboardModule = dashboardModule;
