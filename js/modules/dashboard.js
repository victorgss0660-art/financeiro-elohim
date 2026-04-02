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

    document.getElementById("fat").textContent = utils.moeda(faturamento);
    document.getElementById("gas").textContent = utils.moeda(totalGastos);
    document.getElementById("saldo").textContent = utils.moeda(faturamento - totalGastos);
    document.getElementById("metaAtingida").textContent = `${atingida}%`;
  },

  montarTabelaResumo(categorias, metasPct, faturamento) {
    const tbody = document.getElementById("tabelaResumo");
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

  desenharGraficos(categorias, metasPct, faturamento) {
    const barCanvas = document.getElementById("barChart");
    const pieCanvas = document.getElementById("pieChart");

    if (!barCanvas || !pieCanvas) return;

    const keys = Object.keys(categorias);
    const labels = keys.map(k => this.nomeCategoria(k));
    const valores = keys.map(k => utils.num(categorias[k] || 0));
    const metas = keys.map(k => this.calcularMetaValor(metasPct[k] || 0, faturamento));

    if (this.barChart) this.barChart.destroy();
    if (this.pieChart) this.pieChart.destroy();

    this.barChart = new Chart(barCanvas, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Gasto real",
            data: valores,
            borderRadius: 12,
            borderSkipped: false,
            barThickness: 18
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
        maintainAspectRatio: false,
        responsive: true,
        indexAxis: "y"
      }
    });

    this.pieChart = new Chart(pieCanvas, {
      type: "doughnut",
      data: {
        labels,
        datasets: [{
          data: valores,
          backgroundColor: [
            "#ff3d3d",
            "#2563eb",
            "#22c55e",
            "#ff8a00",
            "#a855f7",
            "#06b6d4",
            "#ff4ecd",
            "#b7e000",
            "#f59e0b",
            "#64748b",
            "#e11d48",
            "#14b8a6"
          ]
        }]
      },
      options: {
        maintainAspectRatio: false,
        responsive: true,
        cutout: "72%"
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
      this.desenharGraficos(categorias, metasPct, faturamento);

    } catch (e) {
      utils.setAppMsg("Erro ao carregar dashboard: " + e.message, "err");
    }
  }
};
