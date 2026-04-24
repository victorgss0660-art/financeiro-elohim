window.dashboardModule = {
  barChart: null,
  pieChart: null,
  lineChart: null,
  rankingChart: null,
  forecastChart: null,
  popupChart: null,

  categoriasPadrao: [
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
    "MANUT"
  ],

  ultimoAnalise: null,

  palette: [
    "#dc2626",
    "#f97316",
    "#fbbf24",
    "#22c55e",
    "#14b8a6",
    "#3b82f6",
    "#6366f1",
    "#8b5cf6",
    "#c026d3",
    "#ec4899",
    "#94a3b8",
    "#64748b"
  ],

  doughnutCenterTextPlugin: {
    id: "doughnutCenterTextPlugin",
    afterDraw(chart, args, pluginOptions) {
      if (chart.config.type !== "doughnut") return;

      const meta = chart.getDatasetMeta(0);
      if (!meta || !meta.data || !meta.data.length) return;

      const { ctx } = chart;
      const x = meta.data[0].x;
      const y = meta.data[0].y;

      const title = pluginOptions?.title || "TOTAL";
      const value = pluginOptions?.value || "";

      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      ctx.fillStyle = "#475569";
      ctx.font = "700 13px Inter, sans-serif";
      ctx.fillText(title, x, y - 14);

      ctx.fillStyle = "#0f172a";
      ctx.font = "800 22px Inter, sans-serif";
      ctx.fillText(value, x, y + 12);

      ctx.restore();
    }
  },

  async carregarDashboard() {
    try {
      const { mes, ano } = this.getMesAnoSeguro();

      const [
        faturamentoMes,
        faturamentoAno,
        gastosMes,
        metasMes,
        gastosAno,
        contasPagar,
        contasReceber
      ] = await Promise.all([
        this.buscarFaturamentoMes(mes, ano),
        this.buscarFaturamentoAno(ano),
        this.buscarGastosMes(mes, ano),
        this.buscarMetasMes(mes, ano),
        this.buscarGastosAno(ano),
        this.buscarContasPagar(),
        this.buscarContasReceber()
      ]);

      const analise = this.processarDados({
        faturamentoMes,
        faturamentoAno,
        gastosMes,
        metasMes,
        gastosAno,
        contasPagar,
        contasReceber,
        mes,
        ano
      });

      this.ultimoAnalise = analise;

      this.safeCall("renderCards", () => this.renderCards(analise));
      this.safeCall("renderResumoTabela", () => this.renderResumoTabela(analise));
      this.safeCall("renderTopListas", () => this.renderTopListas(analise));
      this.safeCall("renderAlertas", () => this.renderAlertas(analise));

      this.safeCall("renderBarChart", () => this.renderBarChart(analise));
      this.safeCall("renderPieChart", () => this.renderPieChart(analise));
      this.safeCall("renderLineChart", () => this.renderLineChart(analise));
      this.safeCall("renderRankingChart", () => this.renderRankingChart(analise));
      this.safeCall("renderForecastChart", () => this.renderForecastChart(analise));

      this.safeCall("renderRankingResumo", () => this.renderRankingResumo(analise));
      this.safeCall("renderSummaryStrip", () => this.renderSummaryStrip(analise));
      this.safeCall("renderForecast", () => this.renderForecast(analise));
      this.safeCall("renderForecastFaturamentoResumo", () =>
        this.renderForecastFaturamentoResumo(analise)
      );
      this.safeCall("renderStatusMes", () => this.renderStatusMes(analise));
    } catch (error) {
      console.error("Erro ao carregar dashboard:", error);
    }
  },

  safeCall(label, fn) {
    try {
      fn();
    } catch (error) {
      console.error(`Erro em ${label}:`, error);
    }
  },

  getMesAnoSeguro() {
    if (window.utils?.getMesAno) return utils.getMesAno();

    const mes = document.getElementById("mesSelect")?.value || "Janeiro";
    const ano = Number(
      document.getElementById("anoSelect")?.value || new Date().getFullYear()
    );

    return { mes, ano };
  },

  normalizarNumero(valor) {
    if (typeof valor === "number") return Number.isFinite(valor) ? valor : 0;
    if (valor == null) return 0;

    let texto = String(valor).trim();
    if (!texto) return 0;

    texto = texto.replace(/R\$/gi, "").replace(/\s/g, "");

    const temVirgula = texto.includes(",");
    const temPonto = texto.includes(".");

    if (temVirgula && temPonto) {
      texto = texto.replace(/\./g, "").replace(",", ".");
    } else if (temVirgula) {
      texto = texto.replace(",", ".");
    }

    const numero = Number(texto);
    return Number.isFinite(numero) ? numero : 0;
  },

  normalizarTexto(valor) {
    return String(valor || "").trim().toUpperCase();
  },

  formatarMoeda(valor) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(Number(valor || 0));
  },

  formatarMoedaCompacta(valor) {
    const n = Number(valor || 0);

    if (Math.abs(n) >= 1000000) {
      return `R$ ${(n / 1000000).toFixed(2)} mi`;
    }

    if (Math.abs(n) >= 1000) {
      return `R$ ${(n / 1000).toFixed(1)} mil`;
    }

    return this.formatarMoeda(n);
  },

  formatarPercentual(valor) {
    return `${Number(valor || 0).toFixed(2)}%`;
  },

  arredondar(valor, casas = 2) {
    return Number(Number(valor || 0).toFixed(casas));
  },

  numeroParaMes(numero) {
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
    return meses[(Number(numero) || 1) - 1];
  },

  mesAnterior(nomeMes) {
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

    const idx = meses.indexOf(nomeMes);
    if (idx <= 0) return "Dezembro";
    return meses[idx - 1];
  },

  variacaoPercentual(atual, anterior) {
    const a = Number(atual || 0);
    const b = Number(anterior || 0);

    if (b === 0 && a === 0) return 0;
    if (b === 0) return 100;

    return ((a - b) / Math.abs(b)) * 100;
  },

  getChartBaseOptions() {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top",
          labels: {
            color: "#334155",
            usePointStyle: true,
            pointStyle: "circle"
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (v) => this.formatarMoedaCompacta(v)
          }
        }
      }
    };
  },

  async buscarFaturamentoMes(mes, ano) {
    const data = await api.select("meses", { mes, ano });

    if (!data.length) {
      return {
        faturado: 0,
        aFaturar: 0,
        total: 0
      };
    }

    const item = data[0];

    return {
      faturado: Number(item.faturado || 0),
      aFaturar: Number(item.a_faturar || 0),
      total: Number(item.faturamento || 0)
    };
  },

  async buscarFaturamentoAno(ano) {
    const data = await api.select("meses", { ano });
    return Array.isArray(data) ? data : [];
  },

  async buscarGastosMes(mes, ano) {
    const data = await api.select("gastos", { ano });

    return (data || []).filter((i) => i.mes === mes);
  },

  async buscarMetasMes(mes, ano) {
    const data = await api.select("metas", { ano });

    return (data || []).filter((i) => i.mes === mes);
  },

  async buscarGastosAno(ano) {
    return await api.select("gastos", { ano });
  },

  async buscarContasPagar() {
    const data = await api.restGet(
      "contas_pagar",
      "select=*&order=vencimento.asc"
    );
    return Array.isArray(data) ? data : [];
  },

  async buscarContasReceber() {
    const data = await api.restGet(
      "contas_receber",
      "select=*&order=vencimento.asc"
    );
    return Array.isArray(data) ? data : [];
  },

  processarDados({
    faturamentoMes,
    faturamentoAno,
    gastosMes,
    metasMes,
    gastosAno,
    contasPagar,
    contasReceber,
    mes,
    ano
  }) {
    const faturadoMes = Number(faturamentoMes?.faturado || 0);
    const aFaturarMes = Number(faturamentoMes?.aFaturar || 0);
    const previsaoFaturamentoMes = Number(faturamentoMes?.total || 0);

    const categorias = {};

    this.categoriasPadrao.forEach((c) => {
      categorias[c] = {
        categoria: c,
        gasto: 0,
        metaValor: 0,
        percentualMeta: 0,
        tipoMeta: "percentual",
        diferenca: 0,
        desvioPercentual: 0,
        situacao: "Dentro da meta"
      };
    });

    (gastosMes || []).forEach((item) => {
      const cat = this.normalizarTexto(item.categoria || "DESP");

      if (!categorias[cat]) {
        categorias[cat] = {
          categoria: cat,
          gasto: 0,
          metaValor: 0,
          percentualMeta: 0,
          tipoMeta: "percentual"
        };
      }

      categorias[cat].gasto += this.normalizarNumero(item.valor);
    });

    (metasMes || []).forEach((item) => {
      const cat = this.normalizarTexto(item.categoria || "");

      if (!cat) return;

      if (!categorias[cat]) {
        categorias[cat] = {
          categoria: cat,
          gasto: 0,
          metaValor: 0,
          percentualMeta: 0,
          tipoMeta: "percentual"
        };
      }

      categorias[cat].tipoMeta = item.tipo_meta || "percentual";
      categorias[cat].percentualMeta = this.normalizarNumero(
        item.percentual_meta || 0
      );

      if (categorias[cat].tipoMeta === "valor") {
        categorias[cat].metaValor = this.normalizarNumero(item.valor_meta || 0);
      } else {
        categorias[cat].metaValor =
          previsaoFaturamentoMes *
          (categorias[cat].percentualMeta / 100);
      }
    });

    Object.values(categorias).forEach((item) => {
      item.diferenca = item.metaValor - item.gasto;

      if (item.metaValor > 0) {
        item.desvioPercentual =
          ((item.gasto - item.metaValor) / item.metaValor) * 100;
      } else {
        item.desvioPercentual = 0;
      }

      item.situacao =
        item.gasto > item.metaValor ? "Acima da meta" : "Dentro da meta";
    });

    const totalGastosMes = Object.values(categorias).reduce(
      (a, b) => a + b.gasto,
      0
    );

    const lucroMes = previsaoFaturamentoMes - totalGastosMes;
    const lucroPrevistoMes = lucroMes;

    const margemMes =
      previsaoFaturamentoMes > 0
        ? (lucroMes / previsaoFaturamentoMes) * 100
        : 0;

    const gastosPorMes = {};
    const faturamentoPorMes = {};
    const lucroPorMes = {};

    for (let i = 1; i <= 12; i++) {
      const nome = this.numeroParaMes(i);
      gastosPorMes[nome] = 0;
      faturamentoPorMes[nome] = 0;
      lucroPorMes[nome] = 0;
    }

    (gastosAno || []).forEach((item) => {
      if (gastosPorMes[item.mes] !== undefined) {
        gastosPorMes[item.mes] += this.normalizarNumero(item.valor);
      }
    });

    (faturamentoAno || []).forEach((item) => {
      if (faturamentoPorMes[item.mes] !== undefined) {
        faturamentoPorMes[item.mes] += this.normalizarNumero(
          item.faturamento || 0
        );
      }
    });

    Object.keys(gastosPorMes).forEach((m) => {
      lucroPorMes[m] = faturamentoPorMes[m] - gastosPorMes[m];
    });

    const rankingAnualCategorias = {};

    (gastosAno || []).forEach((item) => {
      const cat = this.normalizarTexto(item.categoria || "DESP");

      rankingAnualCategorias[cat] =
        (rankingAnualCategorias[cat] || 0) +
        this.normalizarNumero(item.valor);
    });

    const totalFatAno = Object.values(faturamentoPorMes).reduce(
      (a, b) => a + b,
      0
    );

    const totalGasAno = Object.values(gastosPorMes).reduce(
      (a, b) => a + b,
      0
    );

    const totalLucroAno = totalFatAno - totalGasAno;

    const margemAno =
      totalFatAno > 0 ? (totalLucroAno / totalFatAno) * 100 : 0;

    const mesAnterior = this.mesAnterior(mes);

    const variacaoFat = this.variacaoPercentual(
      previsaoFaturamentoMes,
      faturamentoPorMes[mesAnterior]
    );

    const variacaoGas = this.variacaoPercentual(
      totalGastosMes,
      gastosPorMes[mesAnterior]
    );

    const variacaoLucro = this.variacaoPercentual(
      lucroMes,
      lucroPorMes[mesAnterior]
    );

    const metaGlobal = Object.values(categorias).reduce(
      (a, b) => a + b.metaValor,
      0
    );

    return {
      mes,
      ano,

      faturadoMes,
      aFaturarMes,
      previsaoFaturamentoMes,
      lucroPrevistoMes,

      faturamentoMes: previsaoFaturamentoMes,
      totalGastosMes,
      lucroMes,
      margemMes,
      metaGlobal,

      categorias: Object.values(categorias),

      gastosPorMes,
      faturamentoPorMes,
      lucroPorMes,
      rankingAnualCategorias,

      totalFatAno,
      totalGasAno,
      totalLucroAno,
      margemAno,

      variacaoFat,
      variacaoGas,
      variacaoLucro,

      contasVencidas: [],
      vencemHoje: [],
      proximos7Dias: [],
      topPagar: contasPagar.slice(0, 5),
      topReceber: contasReceber.slice(0, 5),

      alertas: []
    };
  },

  renderCards(a) {
    this.setText("fat", this.formatarMoeda(a.faturamentoMes));
    this.setText("gas", this.formatarMoeda(a.totalGastosMes));
    this.setText("lucroCard", this.formatarMoeda(a.lucroMes));
    this.setText("margemCard", this.formatarPercentual(a.margemMes));
    this.setText("metaAtingida", this.formatarPercentual(a.margemMes));

    this.setText(
      "fatVsMesAnterior",
      `vs mês anterior: ${this.formatarPercentual(a.variacaoFat)}`
    );

    this.setText(
      "gasVsMesAnterior",
      `vs mês anterior: ${this.formatarPercentual(a.variacaoGas)}`
    );

    this.setText(
      "lucroVsMesAnterior",
      `vs mês anterior: ${this.formatarPercentual(a.variacaoLucro)}`
    );

    this.setText(
      "metaGlobalInfo",
      `meta global: ${this.formatarMoeda(a.metaGlobal)}`
    );
  },

  renderSummaryStrip(a) {
    this.setText("dashFatYtd", this.formatarMoeda(a.totalFatAno));
    this.setText("dashGasYtd", this.formatarMoeda(a.totalGasAno));
    this.setText("dashLucroYtd", this.formatarMoeda(a.totalLucroAno));
    this.setText("dashMargemYtd", this.formatarPercentual(a.margemAno));
  },

  renderForecastFaturamentoResumo(a) {
    this.setText("dashFaturado", this.formatarMoeda(a.faturadoMes));
    this.setText("dashAFaturar", this.formatarMoeda(a.aFaturarMes));
    this.setText(
      "dashPrevisaoFat",
      this.formatarMoeda(a.previsaoFaturamentoMes)
    );
    this.setText(
      "dashLucroPrevisto",
      this.formatarMoeda(a.lucroPrevistoMes)
    );
  },

  renderForecast(a) {
    this.setText(
      "forecastLucro",
      this.formatarMoeda(a.lucroPrevistoMes)
    );

    this.setText(
      "forecastMargem",
      this.formatarPercentual(a.margemMes)
    );

    this.setText(
      "forecastRisco",
      a.lucroPrevistoMes >= 0 ? "Controlado" : "Crítico"
    );
  },

  renderStatusMes(a) {
    this.setText("statusMes", `${a.mes}/${a.ano}`);
  },

  renderResumoTabela(a) {
    const tbody = document.getElementById("tabelaResumo");
    if (!tbody) return;

    tbody.innerHTML = a.categorias
      .map(
        (i) => `
        <tr>
          <td>${i.categoria}</td>
          <td>${this.formatarMoeda(i.gasto)}</td>
          <td>${this.formatarPercentual(i.percentualMeta)}</td>
          <td>${this.formatarMoeda(i.metaValor)}</td>
          <td>${this.formatarMoeda(i.diferenca)}</td>
          <td>${this.formatarPercentual(i.desvioPercentual)}</td>
          <td>${i.situacao}</td>
        </tr>
      `
      )
      .join("");
  },

  renderTopListas(a) {
    this.renderListaTop("topPagar", a.topPagar, "fornecedor");
    this.renderListaTop("topReceber", a.topReceber, "cliente");
  },

  renderListaTop(id, lista, campo) {
    const el = document.getElementById(id);
    if (!el) return;

    el.innerHTML = lista
      .map(
        (i) => `
      <div class="alert-item">
        <strong>${i[campo] || "-"}</strong><br>
        ${this.formatarMoeda(i.valor || 0)}
      </div>
    `
      )
      .join("");
  },

  renderAlertas() {
    const el = document.getElementById("alertList");
    if (!el) return;
    el.innerHTML =
      '<div class="alert-item ok"><strong>🟢 Sistema operacional</strong></div>';
  },

  renderRankingResumo(a) {
    const el = document.getElementById("rankingResumo");
    if (!el) return;

    const ranking = Object.entries(a.rankingAnualCategorias)
      .sort((x, y) => y[1] - x[1])
      .slice(0, 5);

    el.innerHTML = ranking
      .map(
        ([cat, valor]) => `
      <div class="ranking-summary-item">
        <div class="left"><strong>${cat}</strong></div>
        <div class="right">${this.formatarMoeda(valor)}</div>
      </div>
    `
      )
      .join("");
  },

  renderBarChart(a) {
    const c = document.getElementById("barChart");
    if (!c || typeof Chart === "undefined") return;

    if (this.barChart) this.barChart.destroy();

    this.barChart = new Chart(c, {
      data: {
        labels: a.categorias.map((i) => i.categoria),
        datasets: [
          {
            type: "bar",
            label: "Gasto",
            data: a.categorias.map((i) => i.gasto),
            backgroundColor: "#2563eb"
          },
          {
            type: "line",
            label: "Meta",
            data: a.categorias.map((i) => i.metaValor),
            borderColor: "#dc2626",
            borderWidth: 3
          }
        ]
      },
      options: this.getChartBaseOptions()
    });
  },

  renderPieChart(a) {
    const c = document.getElementById("pieChart");
    if (!c || typeof Chart === "undefined") return;

    if (this.pieChart) this.pieChart.destroy();

    this.pieChart = new Chart(c, {
      type: "doughnut",
      data: {
        labels: a.categorias.map((i) => i.categoria),
        datasets: [
          {
            data: a.categorias.map((i) => i.gasto),
            backgroundColor: this.palette
          }
        ]
      },
      plugins: [this.doughnutCenterTextPlugin],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "66%"
      }
    });
  },

  renderLineChart(a) {
    const c = document.getElementById("lineChart");
    if (!c || typeof Chart === "undefined") return;

    if (this.lineChart) this.lineChart.destroy();

    const meses = Object.keys(a.gastosPorMes);

    this.lineChart = new Chart(c, {
      type: "line",
      data: {
        labels: meses,
        datasets: [
          {
            label: "Gastos",
            data: meses.map((m) => a.gastosPorMes[m]),
            borderColor: "#dc2626"
          },
          {
            label: "Faturamento",
            data: meses.map((m) => a.faturamentoPorMes[m]),
            borderColor: "#2563eb"
          },
          {
            label: "Lucro",
            data: meses.map((m) => a.lucroPorMes[m]),
            borderColor: "#16a34a"
          }
        ]
      },
      options: this.getChartBaseOptions()
    });
  },

  renderRankingChart(a) {
    const c = document.getElementById("rankingChart");
    if (!c || typeof Chart === "undefined") return;

    if (this.rankingChart) this.rankingChart.destroy();

    const ranking = Object.entries(a.rankingAnualCategorias).sort(
      (x, y) => y[1] - x[1]
    );

    this.rankingChart = new Chart(c, {
      type: "bar",
      data: {
        labels: ranking.map((i) => i[0]),
        datasets: [
          {
            label: "Ano",
            data: ranking.map((i) => i[1]),
            backgroundColor: "#6366f1"
          }
        ]
      },
      options: {
        ...this.getChartBaseOptions(),
        indexAxis: "y"
      }
    });
  },

  renderForecastChart(a) {
    const c = document.getElementById("forecastChart");
    if (!c || typeof Chart === "undefined") return;

    if (this.forecastChart) this.forecastChart.destroy();

    this.forecastChart = new Chart(c, {
      data: {
        labels: ["Mês"],
        datasets: [
          {
            type: "bar",
            label: "Faturado",
            data: [a.faturadoMes],
            backgroundColor: "#2563eb",
            stack: "fat"
          },
          {
            type: "bar",
            label: "A faturar",
            data: [a.aFaturarMes],
            backgroundColor: "#f97316",
            stack: "fat"
          },
          {
            type: "line",
            label: "Gastos",
            data: [a.totalGastosMes],
            borderColor: "#dc2626",
            borderWidth: 4
          },
          {
            type: "line",
            label: "Lucro previsto",
            data: [a.lucroPrevistoMes],
            borderColor: "#16a34a",
            borderWidth: 4
          }
        ]
      },
      options: this.getChartBaseOptions()
    });
  },

  abrirGraficoFullscreen(chartId, titulo) {
    const popup = document.getElementById("popupGrafico");
    const title = document.getElementById("popupGraficoTitulo");

    if (!popup || !title) return;

    title.textContent = titulo;
    popup.classList.remove("hidden");
  },

  fecharGraficoFullscreen() {
    const popup = document.getElementById("popupGrafico");
    if (popup) popup.classList.add("hidden");
  },

  setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }
};
