window.dashboardModule = {
  barChart: null,
  pieChart: null,
  lineChart: null,
  rankingChart: null,

  async carregarDashboard() {
    try {
      const { mes, ano } = utils.getMesAno();

      const [faturamento, gastosMes, metasAno, gastosAno] = await Promise.all([
        this.buscarFaturamentoMes(mes, ano),
        this.buscarGastosMes(mes, ano),
        this.buscarMetasAno(ano),
        this.buscarGastosAno(ano)
      ]);

      const faturamentoValor = faturamento?.valor || 0;
      const totalGastos = utils.totalizar(gastosMes, "valor");
      const saldo = faturamentoValor - totalGastos;
      const metaAtingida = faturamentoValor > 0
        ? (totalGastos / faturamentoValor) * 100
        : 0;

      this.preencherCards({
        faturamento: faturamentoValor,
        gastos: totalGastos,
        saldo,
        metaAtingida
      });

      const metasMap = this.montarMapaMetas(metasAno);
      const gastosPorCategoria = utils.somarPorCategoria(gastosMes);

      this.renderTabelaResumo(gastosPorCategoria, metasMap, faturamentoValor);
      this.renderBarChart(gastosPorCategoria, metasMap, faturamentoValor);
      this.renderPieChart(gastosPorCategoria);
      this.renderLineChart(gastosAno);
      this.renderRankingChart(gastosAno);
      this.renderAlertas(gastosPorCategoria, metasMap, faturamentoValor, saldo);

    } catch (e) {
      utils.setAppMsg("Erro ao carregar dashboard: " + e.message, "err");
    }
  },

  // 🔹 FATURAMENTO = tabela "meses"
  async buscarFaturamentoMes(mes, ano) {
    try {
      const data = await api.restGet(
        "meses",
        `select=*&mes=eq.${encodeURIComponent(mes)}&ano=eq.${ano}&limit=1`
      );

      return data?.[0] || { valor: 0 };
    } catch {
      return { valor: 0 };
    }
  },

  // 🔹 GASTOS
  async buscarGastosMes(mes, ano) {
    const data = await api.restGet(
      "gastos",
      `select=*&mes=eq.${encodeURIComponent(mes)}&ano=eq.${ano}`
    );

    return (data || []).map(item => ({
      ...item,
      categoria: utils.categoriaCanonica(item.categoria),
      valor: utils.numero(item.valor)
    }));
  },

  // 🔹 METAS = tabela "metas"
  async buscarMetasAno(ano) {
    const data = await api.restGet(
      "metas",
      `select=*&ano=eq.${ano}`
    );

    return (data || []).map(item => ({
      ...item,
      categoria: utils.categoriaCanonica(item.categoria),
      percentual_meta: utils.numero(item.percentual_meta)
    }));
  },

  async buscarGastosAno(ano) {
    const data = await api.restGet(
      "gastos",
      `select=*&ano=eq.${ano}`
    );

    return (data || []).map(item => ({
      ...item,
      categoria: utils.categoriaCanonica(item.categoria),
      valor: utils.numero(item.valor)
    }));
  },

  montarMapaMetas(metas) {
    const mapa = {};
    metas.forEach(item => {
      mapa[item.categoria] = item.percentual_meta;
    });
    return mapa;
  },

  preencherCards({ faturamento, gastos, saldo, metaAtingida }) {
    document.getElementById("fat").textContent = utils.moeda(faturamento);
    document.getElementById("gas").textContent = utils.moeda(gastos);
    document.getElementById("saldo").textContent = utils.moeda(saldo);
    document.getElementById("metaAtingida").textContent =
      `${utils.arredondar(metaAtingida, 0)}%`;
  },

  renderTabelaResumo(gastosPorCategoria, metasMap, faturamento) {
    const tbody = document.getElementById("tabelaResumo");

    const categorias = utils.getCategorias();

    tbody.innerHTML = categorias.map(cat => {
      const gasto = gastosPorCategoria[cat] || 0;
      const metaPerc = metasMap[cat] || 0;
      const metaValor = faturamento * (metaPerc / 100);

      const dentroMeta = gasto <= metaValor;

      return `
        <tr>
          <td>${cat}</td>
          <td>${utils.moeda(gasto)}</td>
          <td>${metaPerc}%</td>
          <td>${utils.moeda(metaValor)}</td>
          <td>${utils.moeda(metaValor - gasto)}</td>
          <td class="${dentroMeta ? "ok" : "err"}">
            ${dentroMeta ? "OK" : "Acima"}
          </td>
        </tr>
      `;
    }).join("");
  },

  renderAlertas(gastos, metas, faturamento, saldo) {
    const el = document.getElementById("alertList");

    let html = "";

    if (saldo < 0) {
      html += `<div class="alert-item">Saldo negativo</div>`;
    }

    Object.keys(gastos).forEach(cat => {
      const gasto = gastos[cat];
      const meta = metas[cat] || 0;

      if (meta > 0) {
        const limite = faturamento * (meta / 100);
        if (gasto > limite) {
          html += `<div class="alert-item">${cat} acima da meta</div>`;
        }
      }
    });

    el.innerHTML = html || `<div class="alert-item ok">Tudo sob controle</div>`;
  },

  renderBarChart(gastos, metas, faturamento) {
    const ctx = document.getElementById("barChart");

    if (this.barChart) this.barChart.destroy();

    const categorias = utils.getCategorias();

    this.barChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: categorias,
        datasets: [
          {
            label: "Gastos",
            data: categorias.map(c => gastos[c] || 0)
          },
          {
            label: "Meta",
            data: categorias.map(c => (faturamento * ((metas[c] || 0) / 100)))
          }
        ]
      }
    });
  },

  renderPieChart(gastos) {
    const ctx = document.getElementById("pieChart");

    if (this.pieChart) this.pieChart.destroy();

    const categorias = Object.keys(gastos);

    this.pieChart = new Chart(ctx, {
      type: "pie",
      data: {
        labels: categorias,
        datasets: [{
          data: categorias.map(c => gastos[c])
        }]
      }
    });
  },

  renderLineChart(gastosAno) {
    const ctx = document.getElementById("lineChart");

    if (this.lineChart) this.lineChart.destroy();

    const meses = [
      "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
      "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"
    ];

    const valores = meses.map(m =>
      utils.totalizar(gastosAno.filter(x => x.mes === m))
    );

    this.lineChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: meses,
        datasets: [{
          label: "Gastos",
          data: valores
        }]
      }
    });
  },

  renderRankingChart(gastosAno) {
    const ctx = document.getElementById("rankingChart");

    if (this.rankingChart) this.rankingChart.destroy();

    const mapa = utils.somarPorCategoria(gastosAno);

    const ranking = Object.entries(mapa)
      .sort((a, b) => b[1] - a[1]);

    this.rankingChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: ranking.map(r => r[0]),
        datasets: [{
          data: ranking.map(r => r[1])
        }]
      },
      options: {
        indexAxis: "y"
      }
    });
  }
};
