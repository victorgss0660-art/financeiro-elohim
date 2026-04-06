window.dashboardModule = {
  nomesCategorias: {
    MC: "Materiais de Consumo",
    MP: "Matéria-Prima",
    TERC: "Terceirizações",
    FRETE: "Fretes",
    DESP: "Despesas Fixas",
    TAR: "Tarifas Bancárias",
    PREST: "Prestações de Serviço",
    FOLHA: "Folha de Pagamento",
    COMIS: "Comissões",
    IMPOS: "Impostos",
    RESC: "Rescisões",
    MANUT: "Manutenções"
  },

  metasPadrao: {
    MC: 20,
    MP: 18,
    TERC: 8,
    FRETE: 5,
    DESP: 6,
    TAR: 1,
    PREST: 4,
    FOLHA: 15,
    COMIS: 2,
    IMPOS: 5,
    RESC: 1,
    MANUT: 4
  },

  barChart: null,
  pieChart: null,
  lineChart: null,
  rankingChart: null,

  nomeCategoria(sigla) {
    return this.nomesCategorias[sigla] || sigla || "-";
  },

  async garantirMes(mes, ano) {
    const data = await api.restGet(
      "meses",
      `select=*&mes=eq.${encodeURIComponent(mes)}&ano=eq.${encodeURIComponent(ano)}&limit=1`
    );

    if (!data.length) {
      await api.restInsert("meses", [{
        mes,
        ano,
        faturamento: 0
      }]);
    }
  },

  async garantirMetas(mes, ano) {
    const data = await api.restGet(
      "metas",
      `select=*&mes=eq.${encodeURIComponent(mes)}&ano=eq.${encodeURIComponent(ano)}`
    );

    if (data.length) return data;

    const payload = Object.keys(this.metasPadrao).map(cat => ({
      mes,
      ano,
      categoria: cat,
      meta: this.metasPadrao[cat]
    }));

    await api.restInsert("metas", payload);
    return payload;
  },

  calcularMetaValor(metaPct, faturamento) {
    return utils.num((Number(metaPct || 0) / 100) * Number(faturamento || 0));
  },

  atualizarCards(totalGastos, faturamento, metasPct) {
    const totalMetaValor = Object.values(metasPct).reduce((acc, pct) => {
      return acc + this.calcularMetaValor(pct, faturamento);
    }, 0);

    const atingida = totalMetaValor > 0
      ? Math.round((totalGastos / totalMetaValor) * 100)
      : 0;

    const fat = document.getElementById("fat");
    const gas = document.getElementById("gas");
    const saldo = document.getElementById("saldo");
    const metaAtingida = document.getElementById("metaAtingida");

    if (fat) fat.textContent = utils.moeda(faturamento);
    if (gas) gas.textContent = utils.moeda(totalGastos);
    if (saldo) saldo.textContent = utils.moeda(faturamento - totalGastos);
    if (metaAtingida) metaAtingida.textContent = `${atingida}%`;
  },

  montarTabelaResumo(categorias, metasPct, faturamento) {
    const tbody = document.getElementById("tabelaResumo");
    if (!tbody) return;

    const keys = Object.keys(categorias);

    if (!keys.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="muted">Nenhum dado carregado.</td></tr>`;
      return;
    }

    tbody.innerHTML = keys.map(cat => {
      const gasto = utils.num(categorias[cat] || 0);
      const pct = utils.num(metasPct[cat] || 0);
      const metaValor = this.calcularMetaValor(pct, faturamento);
      const diferenca = utils.num(gasto - metaValor);
      const dentro = diferenca <= 0;

      return `
        <tr>
          <td>${this.nomeCategoria(cat)}</td>
          <td>${utils.moeda(gasto)}</td>
          <td>${pct.toFixed(2)}%</td>
          <td>${utils.moeda(metaValor)}</td>
          <td class="${dentro ? "ok" : "err"}">${utils.moeda(diferenca)}</td>
          <td class="${dentro ? "ok" : "err"}">${dentro ? "Dentro da meta" : "Acima da meta"}</td>
        </tr>
      `;
    }).join("");
  },

  montarAlertas(categorias, metasPct, faturamento) {
    const alertList = document.getElementById("alertList");
    if (!alertList) return;

    const keys = Object.keys(categorias);

    if (!keys.length) {
      alertList.innerHTML = `<div class="muted">Nenhum alerta disponível.</div>`;
      return;
    }

    const acima = [];

    keys.forEach(cat => {
      const gasto = utils.num(categorias[cat] || 0);
      const metaValor = this.calcularMetaValor(metasPct[cat] || 0, faturamento);
      const diferenca = utils.num(gasto - metaValor);

      if (diferenca > 0) {
        acima.push({ cat, diferenca });
      }
    });

    if (!acima.length) {
      alertList.innerHTML = `
        <div class="alert-item ok">
          <strong>Tudo sob controle.</strong><br>
          Nenhuma categoria acima da meta.
        </div>
      `;
      return;
    }

    alertList.innerHTML = acima.map(item => `
      <div class="alert-item">
        <strong>${this.nomeCategoria(item.cat)}</strong><br>
        Acima da meta em ${utils.moeda(item.diferenca)}
      </div>
    `).join("");
  },

  atualizarStatus() {
    const statusMes = document.getElementById("statusMes");
    const statusAtualizacao = document.getElementById("statusAtualizacao");
    const statusSituacao = document.getElementById("statusSituacao");

    const { mes, ano } = utils.getMesAno();
    const agora = new Date().toLocaleString("pt-BR");

    if (statusMes) statusMes.textContent = `${mes}/${ano}`;
    if (statusAtualizacao) statusAtualizacao.textContent = agora;
    if (statusSituacao) statusSituacao.textContent = "Dados carregados";
  },

  desenharGraficoBarras(categorias, metasPct, faturamento) {
    const canvas = document.getElementById("barChart");
    if (!canvas) return;

    const keys = Object.keys(categorias);
    const labels = keys.map(k => this.nomeCategoria(k));
    const valores = keys.map(k => utils.num(categorias[k] || 0));
    const metas = keys.map(k => this.calcularMetaValor(metasPct[k] || 0, faturamento));

    if (this.barChart) this.barChart.destroy();

    this.barChart = new Chart(canvas, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Gasto real",
            data: valores,
            borderRadius: 10
          },
          {
            type: "line",
            label: "Meta",
            data: metas,
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

  desenharGraficoPizza(categorias) {
    const canvas = document.getElementById("pieChart");
    if (!canvas) return;

    const keys = Object.keys(categorias);
    const labels = keys.map(k => this.nomeCategoria(k));
    const valores = keys.map(k => utils.num(categorias[k] || 0));

    if (this.pieChart) this.pieChart.destroy();

    this.pieChart = new Chart(canvas, {
      type: "doughnut",
      data: {
        labels,
        datasets: [{
          data: valores,
          backgroundColor: [
            "#ff4d57",
            "#3b82f6",
            "#22c55e",
            "#f59e0b",
            "#8b5cf6",
            "#06b6d4",
            "#ec4899",
            "#84cc16",
            "#f97316",
            "#64748b",
            "#14b8a6",
            "#e11d48"
          ]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "65%"
      }
    });
  },

  async desenharGraficoEvolucaoMensal(ano) {
    const canvas = document.getElementById("lineChart");
    if (!canvas) return;

    const mesesData = await api.restGet(
      "meses",
      `select=*&ano=eq.${encodeURIComponent(ano)}`
    );

    const gastosData = await api.restGet(
      "gastos",
      `select=*&ano=eq.${encodeURIComponent(ano)}`
    );

    const ordemMeses = [
      "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
      "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"
    ];

    const mapa = {};
    ordemMeses.forEach(mes => {
      mapa[mes] = { faturamento: 0, gastos: 0 };
    });

    mesesData.forEach(item => {
      if (mapa[item.mes]) {
        mapa[item.mes].faturamento = utils.num(item.faturamento || 0);
      }
    });

    gastosData.forEach(item => {
      if (mapa[item.mes]) {
        mapa[item.mes].gastos += utils.num(item.valor || 0);
      }
    });

    const labels = ordemMeses;
    const faturamento = ordemMeses.map(mes => mapa[mes].faturamento);
    const gastos = ordemMeses.map(mes => mapa[mes].gastos);
    const saldos = ordemMeses.map(mes => utils.num(mapa[mes].faturamento - mapa[mes].gastos));

    if (this.lineChart) this.lineChart.destroy();

    this.lineChart = new Chart(canvas, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Faturamento",
            data: faturamento,
            borderWidth: 3,
            tension: 0.35,
            fill: false
          },
          {
            label: "Gastos",
            data: gastos,
            borderWidth: 3,
            tension: 0.35,
            fill: false
          },
          {
            label: "Saldo",
            data: saldos,
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

  async desenharRankingAnual(ano) {
    const canvas = document.getElementById("rankingChart");
    if (!canvas) return;

    const gastosData = await api.restGet(
      "gastos",
      `select=*&ano=eq.${encodeURIComponent(ano)}`
    );

    const acumulado = {};

    gastosData.forEach(item => {
      const cat = item.categoria || "OUTROS";
      acumulado[cat] = utils.num((acumulado[cat] || 0) + Number(item.valor || 0));
    });

    const ordenado = Object.entries(acumulado)
      .sort((a, b) => b[1] - a[1]);

    const labels = ordenado.map(([cat]) => this.nomeCategoria(cat));
    const valores = ordenado.map(([, valor]) => valor);

    if (this.rankingChart) this.rankingChart.destroy();

    this.rankingChart = new Chart(canvas, {
      type: "bar",
      data: {
        labels,
        datasets: [{
          label: "Ranking anual",
          data: valores,
          borderRadius: 10
        }]
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false
      }
    });
  },

  async carregarDashboard() {
    try {
      const { mes, ano } = utils.getMesAno();

      await this.garantirMes(mes, ano);
      const metasData = await this.garantirMetas(mes, ano);

      const gastosData = await api.restGet(
        "gastos",
        `select=*&mes=eq.${encodeURIComponent(mes)}&ano=eq.${encodeURIComponent(ano)}`
      );

      const mesesData = await api.restGet(
        "meses",
        `select=*&mes=eq.${encodeURIComponent(mes)}&ano=eq.${encodeURIComponent(ano)}&limit=1`
      );

      const categorias = {};
      let totalGastos = 0;

      gastosData.forEach(item => {
        categorias[item.categoria] = utils.num(item.valor || 0);
        totalGastos += utils.num(item.valor || 0);
      });

      const metasPct = {};
      metasData.forEach(item => {
        metasPct[item.categoria] = utils.num(item.meta || 0);
      });

      const faturamento = mesesData?.[0]
        ? utils.num(mesesData[0].faturamento || 0)
        : 0;

      const faturamentoInput = document.getElementById("faturamentoInput");
      if (faturamentoInput) {
        faturamentoInput.value = faturamento || "";
      }

      this.atualizarCards(totalGastos, faturamento, metasPct);
      this.montarTabelaResumo(categorias, metasPct, faturamento);
      this.montarAlertas(categorias, metasPct, faturamento);
      this.atualizarStatus();

      this.desenharGraficoBarras(categorias, metasPct, faturamento);
      this.desenharGraficoPizza(categorias);
      await this.desenharGraficoEvolucaoMensal(ano);
      await this.desenharRankingAnual(ano);
    } catch (e) {
      utils.setAppMsg("Erro ao carregar dashboard: " + e.message, "err");
    }
  }
};
