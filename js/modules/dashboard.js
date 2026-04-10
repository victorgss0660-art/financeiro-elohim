window.dashboardModule = {
  barChart: null,
  pieChart: null,
  lineChart: null,
  rankingChart: null,
  cacheMeses: [],

  mesesOrdem: [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ],

  mesesCurtos: ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"],

  async carregarDashboard() {
    try {
      const { mes, ano } = utils.getMesAno();

      const [
        faturamento,
        gastosMes,
        metasAno,
        gastosAno,
        mesesAno,
        contasPagar,
        contasReceber
      ] = await Promise.all([
        this.buscarFaturamentoMes(mes, ano),
        this.buscarGastosMes(mes, ano),
        this.buscarMetasAno(ano),
        this.buscarGastosAno(ano),
        this.buscarMesesAno(ano),
        this.buscarContasPagar(),
        this.buscarContasReceber()
      ]);

      this.cacheMeses = mesesAno || [];

      const faturamentoValor = utils.numero(faturamento?.valor || 0);
      const totalGastos = utils.totalizar(gastosMes, "valor");
      const saldo = faturamentoValor - totalGastos;
      const metaAtingida = faturamentoValor > 0 ? (totalGastos / faturamentoValor) * 100 : 0;

      const metasMap = this.montarMapaMetas(metasAno);
      const gastosPorCategoria = utils.somarPorCategoria(gastosMes, "categoria", "valor");

      this.preencherCards({ faturamento: faturamentoValor, gastos: totalGastos, saldo, metaAtingida });
      this.renderComparativo(mes, ano, faturamentoValor);
      this.renderVencimentos(contasPagar || []);
      this.renderTopContas(contasPagar || [], contasReceber || []);
      this.renderTabelaResumo(gastosPorCategoria, metasMap, faturamentoValor);
      this.renderAlertas(gastosPorCategoria, metasMap, faturamentoValor, saldo, contasPagar || []);

      if (typeof Chart !== "undefined") {
        this.renderBarChart(gastosPorCategoria, metasMap, faturamentoValor);
        this.renderPieChart(gastosPorCategoria);
        this.renderLineChart(gastosAno, this.cacheMeses);
        this.renderRankingChart(gastosAno);
      } else {
        console.warn("Chart.js não carregado no dashboard.");
      }
    } catch (e) {
      console.error("Erro no dashboard:", e);
      utils.setAppMsg("Erro no dashboard: " + e.message, "err");
    }
  },

  async buscarFaturamentoMes(mes, ano) {
    try {
      const data = await api.restGet("meses", "select=*");
      const item = (data || []).find(row =>
        String(row.mes || row.nome_mes || "").toLowerCase() === String(mes).toLowerCase() &&
        Number(row.ano || row.exercicio || 0) === Number(ano)
      );
      return { valor: utils.numero(item?.valor ?? item?.faturamento ?? item?.receita ?? 0) };
    } catch {
      return { valor: 0 };
    }
  },

  async buscarMesesAno(ano) {
    try {
      const data = await api.restGet("meses", "select=*");
      return (data || []).filter(item => Number(item.ano || item.exercicio || 0) === Number(ano));
    } catch {
      return [];
    }
  },

  async buscarGastosMes(mes, ano) {
    try {
      const data = await api.restGet("gastos", "select=*");
      return (data || []).filter(item =>
        String(item.mes || "").toLowerCase() === String(mes).toLowerCase() &&
        Number(item.ano || 0) === Number(ano)
      );
    } catch {
      return [];
    }
  },

  async buscarGastosAno(ano) {
    try {
      const data = await api.restGet("gastos", "select=*");
      return (data || []).filter(item => Number(item.ano || 0) === Number(ano));
    } catch {
      return [];
    }
  },

  async buscarMetasAno(ano) {
    try {
      const data = await api.restGet("metas", "select=*");
      return (data || []).filter(item => Number(item.ano || item.exercicio || 0) === Number(ano));
    } catch {
      return [];
    }
  },

  async buscarContasPagar() {
    try {
      return await api.restGet("contas_pagar", "select=*");
    } catch {
      return [];
    }
  },

  async buscarContasReceber() {
    try {
      return await api.restGet("contas_receber", "select=*");
    } catch {
      return [];
    }
  },

  montarMapaMetas(metas) {
    const mapa = {};
    (metas || []).forEach(item => {
      mapa[String(item.categoria || "").trim()] = utils.numero(item.percentual_meta || item.percentual || item.meta || item.valor || 0);
    });
    return mapa;
  },

  preencherCards({ faturamento, gastos, saldo, metaAtingida }) {
    const fat = document.getElementById("fat");
    const gas = document.getElementById("gas");
    const saldoEl = document.getElementById("saldo");
    const metaEl = document.getElementById("metaAtingida");

    if (fat) fat.textContent = utils.moeda(faturamento);
    if (gas) gas.textContent = utils.moeda(gastos);
    if (saldoEl) saldoEl.textContent = utils.moeda(saldo);
    if (metaEl) metaEl.textContent = `${utils.arredondar(metaAtingida, 0)}%`;
  },

  renderComparativo(mes, ano, fatAtual) {
    const varFatEl = document.getElementById("varFat");
    if (!varFatEl) return;
    varFatEl.textContent = "0%";
  },

  renderVencimentos(contas) {
    const elVencidas = document.getElementById("cardVencidas");
    const elHoje = document.getElementById("cardHoje");
    const el7dias = document.getElementById("card7dias");

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const em7 = new Date(hoje);
    em7.setDate(hoje.getDate() + 7);

    const vencidas = (contas || []).filter(c => c.vencimento && String(c.status || "").toLowerCase() !== "pago" && new Date(c.vencimento + "T00:00:00") < hoje);
    const hojeLista = (contas || []).filter(c => c.vencimento && String(c.status || "").toLowerCase() !== "pago" && new Date(c.vencimento + "T00:00:00").getTime() === hoje.getTime());
    const proximas = (contas || []).filter(c => {
      if (!c.vencimento || String(c.status || "").toLowerCase() === "pago") return false;
      const d = new Date(c.vencimento + "T00:00:00");
      return d > hoje && d <= em7;
    });

    if (elVencidas) elVencidas.textContent = String(vencidas.length);
    if (elHoje) elHoje.textContent = String(hojeLista.length);
    if (el7dias) el7dias.textContent = String(proximas.length);
  },

  renderTopContas(pagar, receber) {
    const topPagarEl = document.getElementById("topPagar");
    const topReceberEl = document.getElementById("topReceber");

    if (topPagarEl) {
      const lista = [...(pagar || [])]
        .filter(i => String(i.status || "").toLowerCase() !== "pago")
        .sort((a, b) => utils.numero(b.valor) - utils.numero(a.valor))
        .slice(0, 5);

      topPagarEl.innerHTML = lista.length
        ? lista.map(i => `<div><strong>${i.fornecedor || "-"}</strong><br>${utils.moeda(i.valor || 0)} · ${i.vencimento || "-"}</div>`).join("")
        : `<div class="muted">Nenhuma conta encontrada.</div>`;
    }

    if (topReceberEl) {
      const lista = [...(receber || [])]
        .filter(i => String(i.status || "").toLowerCase() !== "recebido")
        .sort((a, b) => utils.numero(b.valor) - utils.numero(a.valor))
        .slice(0, 5);

      topReceberEl.innerHTML = lista.length
        ? lista.map(i => `<div><strong>${i.cliente || "-"}</strong><br>${utils.moeda(i.valor || 0)} · ${i.vencimento || "-"}</div>`).join("")
        : `<div class="muted">Nenhuma conta encontrada.</div>`;
    }
  },

  renderTabelaResumo(gastosPorCategoria, metasMap, faturamento) {
    const tbody = document.getElementById("tabelaResumo");
    if (!tbody) return;

    const categorias = Object.keys(gastosPorCategoria || {});
    if (!categorias.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="muted">Nenhum dado carregado.</td></tr>`;
      return;
    }

    tbody.innerHTML = categorias.map(cat => {
      const gasto = utils.numero(gastosPorCategoria[cat] || 0);
      const metaPerc = utils.numero(metasMap[cat] || 0);
      const metaValor = faturamento > 0 ? faturamento * (metaPerc / 100) : 0;
      const diferenca = metaValor - gasto;

      return `
        <tr>
          <td>${cat}</td>
          <td>${utils.moeda(gasto)}</td>
          <td>${utils.arredondar(metaPerc, 2)}%</td>
          <td>${utils.moeda(metaValor)}</td>
          <td>${utils.moeda(diferenca)}</td>
          <td>${metaPerc > 0 && gasto <= metaValor ? "OK" : "Atenção"}</td>
        </tr>
      `;
    }).join("");
  },

  renderAlertas(gastos, metas, faturamento, saldo, contasPagar = []) {
    const el = document.getElementById("alertList");
    if (!el) return;

    const alertas = [];

    if (saldo < 0) {
      alertas.push(`<div class="alert-item critico"><strong>Saldo negativo</strong><br>${utils.moeda(saldo)}</div>`);
    }

    const vencidas = (contasPagar || []).filter(c => c.vencimento && String(c.status || "").toLowerCase() !== "pago" && new Date(c.vencimento + "T00:00:00") < new Date());
    if (vencidas.length) {
      alertas.push(`<div class="alert-item atencao"><strong>Contas vencidas</strong><br>${vencidas.length} em atraso</div>`);
    }

    el.innerHTML = alertas.length
      ? alertas.join("")
      : `<div class="alert-item ok"><strong>Tudo sob controle</strong><br>Sem alertas críticos.</div>`;
  },

  renderBarChart(gastos, metas, faturamento) {
    const ctx = document.getElementById("barChart");
    if (!ctx) return;
    if (this.barChart) this.barChart.destroy();

    const categorias = Object.keys(gastos || {});
    const valores = categorias.map(c => utils.numero(gastos[c] || 0));

    this.barChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: categorias,
        datasets: [{ label: "Gastos", data: valores }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  },

  renderPieChart(gastos) {
    const ctx = document.getElementById("pieChart");
    if (!ctx) return;
    if (this.pieChart) this.pieChart.destroy();

    const categorias = Object.keys(gastos || {});
    const valores = categorias.map(c => utils.numero(gastos[c] || 0));

    this.pieChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: categorias,
        datasets: [{ data: valores }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  },

  renderLineChart(gastosAno, mesesAno) {
    const ctx = document.getElementById("lineChart");
    if (!ctx) return;
    if (this.lineChart) this.lineChart.destroy();

    this.lineChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: this.mesesCurtos,
        datasets: [{ label: "Gastos", data: new Array(12).fill(0) }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  },

  renderRankingChart(gastosAno) {
    const ctx = document.getElementById("rankingChart");
    if (!ctx) return;
    if (this.rankingChart) this.rankingChart.destroy();

    this.rankingChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: [],
        datasets: [{ label: "Gasto anual", data: [] }]
      },
      options: { responsive: true, maintainAspectRatio: false, indexAxis: "y" }
    });
  }
};
