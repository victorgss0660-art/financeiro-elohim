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
      const metaAtingida = faturamentoValor > 0 ? (totalGastos / faturamentoValor) * 100 : 0;

      this.preencherCards({
        faturamento: faturamentoValor,
        gastos: totalGastos,
        saldo,
        metaAtingida
      });

      const metasMap = this.montarMapaMetas(metasAno);
      const gastosPorCategoria = utils.somarPorCategoria(gastosMes, "categoria", "valor");

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

  async buscarFaturamentoMes(mes, ano) {
    try {
      const data = await api.restGet(
        "faturamento",
        `select=*&mes=eq.${encodeURIComponent(mes)}&ano=eq.${ano}&limit=1`
      );

      return data?.[0] || { valor: 0 };
    } catch (e) {
      return { valor: 0 };
    }
  },

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

  async buscarMetasAno(ano) {
    try {
      const data = await api.restGet(
        "metas_financeiras",
        `select=*&ano=eq.${ano}`
      );

      return (data || []).map(item => ({
        ...item,
        categoria: utils.categoriaCanonica(item.categoria),
        percentual_meta: utils.numero(item.percentual_meta)
      }));
    } catch (e) {
      return [];
    }
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
    (metas || []).forEach(item => {
      mapa[utils.categoriaCanonica(item.categoria)] = utils.numero(item.percentual_meta);
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

  renderTabelaResumo(gastosPorCategoria, metasMap, faturamento) {
    const tbody = document.getElementById("tabelaResumo");
    if (!tbody) return;

    const categorias = utils.getCategorias();

    const linhas = categorias.map(categoria => {
      const gasto = utils.numero(gastosPorCategoria[categoria] || 0);
      const metaPercentual = utils.numero(metasMap[categoria] || 0);
      const metaValor = faturamento > 0 ? (faturamento * metaPercentual) / 100 : 0;
      const diferenca = metaValor - gasto;

      let situacao = "Sem meta";
      let situacaoClasse = "muted";

      if (metaPercentual > 0) {
        if (gasto <= metaValor) {
          situacao = "Dentro da meta";
          situacaoClasse = "ok";
        } else {
          situacao = "Acima da meta";
          situacaoClasse = "err";
        }
      }

      return `
        <tr>
          <td>${categoria}</td>
          <td>${utils.moeda(gasto)}</td>
          <td>${utils.arredondar(metaPercentual, 2)}%</td>
          <td>${utils.moeda(metaValor)}</td>
          <td>${utils.moeda(diferenca)}</td>
          <td class="${situacaoClasse}">${situacao}</td>
        </tr>
      `;
    });

    tbody.innerHTML = linhas.join("");
  },

  renderAlertas(gastosPorCategoria, metasMap, faturamento, saldo) {
    const alertList = document.getElementById("alertList");
    if (!alertList) return;

    const alertas = [];

    if (saldo < 0) {
      alertas.push({
        tipo: "err",
        titulo: "Saldo negativo",
        texto: `O mês está com saldo de ${utils.moeda(saldo)}.`
      });
    }

    Object.keys(gastosPorCategoria).forEach(categoria => {
      const gasto = utils.numero(gastosPorCategoria[categoria] || 0);
      const metaPercentual = utils.numero(metasMap[categoria] || 0);

      if (faturamento > 0 && metaPercentual > 0) {
        const metaValor = (faturamento * metaPercentual) / 100;
        if (gasto > metaValor) {
          alertas.push({
            tipo: "err",
            titulo: `${categoria} acima da meta`,
            texto: `Gasto de ${utils.moeda(gasto)} para uma meta de ${utils.moeda(metaValor)}.`
          });
        }
      }
    });

    if (!alertas.length) {
      alertList.innerHTML = `
        <div class="alert-item ok">
          <strong>Sem alertas críticos.</strong><br>
          O desempenho financeiro está dentro do esperado.
        </div>
      `;
      return;
    }

    alertList.innerHTML = alertas.map(alerta => `
      <div class="alert-item ${alerta.tipo === "ok" ? "ok" : ""}">
        <strong>${alerta.titulo}</strong><br>
        ${alerta.texto}
      </div>
    `).join("");
  },

  renderBarChart(gastosPorCategoria, metasMap, faturamento) {
    const canvas = document.getElementById("barChart");
    if (!canvas) return;

    const categorias = utils.getCategorias();
    const gastos = categorias.map(cat => utils.numero(gastosPorCategoria[cat] || 0));
    const metas = categorias.map(cat => {
      const percentual = utils.numero(metasMap[cat] || 0);
      return faturamento > 0 ? (faturamento * percentual) / 100 : 0;
    });

    if (this.barChart) this.barChart.destroy();

    this.barChart = new Chart(canvas, {
      type: "bar",
      data: {
        labels: categorias,
        datasets: [
          {
            label: "Gasto real",
            data: gastos,
            borderWidth: 1
          },
          {
            label: "Meta",
            data: metas,
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });
  },

  renderPieChart(gastosPorCategoria) {
    const canvas = document.getElementById("pieChart");
    if (!canvas) return;

    const categorias = Object.keys(gastosPorCategoria).filter(cat => utils.numero(gastosPorCategoria[cat]) > 0);
    const valores = categorias.map(cat => utils.numero(gastosPorCategoria[cat]));

    if (this.pieChart) this.pieChart.destroy();

    this.pieChart = new Chart(canvas, {
      type: "pie",
      data: {
        labels: categorias,
        datasets: [
          {
            data: valores,
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });
  },

  renderLineChart(gastosAno) {
    const canvas = document.getElementById("lineChart");
    if (!canvas) return;

    const meses = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];

    const totaisPorMes = meses.map(mes => {
      const lista = gastosAno.filter(item => item.mes === mes);
      return utils.totalizar(lista, "valor");
    });

    if (this.lineChart) this.lineChart.destroy();

    this.lineChart = new Chart(canvas, {
      type: "line",
      data: {
        labels: meses,
        datasets: [
          {
            label: "Gastos mensais",
            data: totaisPorMes,
            borderWidth: 3,
            tension: 0.35,
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });
  },

  renderRankingChart(gastosAno) {
    const canvas = document.getElementById("rankingChart");
    if (!canvas) return;

    const mapa = utils.somarPorCategoria(gastosAno, "categoria", "valor");

    const ranking = Object.entries(mapa)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    const labels = ranking.map(item => item[0]);
    const valores = ranking.map(item => item[1]);

    if (this.rankingChart) this.rankingChart.destroy();

    this.rankingChart = new Chart(canvas, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Gasto anual",
            data: valores,
            borderWidth: 1
          }
        ]
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false
      }
    });
  }
};
