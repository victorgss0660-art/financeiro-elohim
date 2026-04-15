window.dashboardModule = {
  barChart: null,
  pieChart: null,
  lineChart: null,
  rankingChart: null,

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

  async carregarDashboard() {
    try {
      const { mes, ano } = this.getMesAnoSeguro();

      const [
        faturamentoMes,
        gastosMes,
        metasMes,
        gastosAno,
        contasPagar,
        contasReceber
      ] = await Promise.all([
        this.buscarFaturamentoMes(mes, ano),
        this.buscarGastosMes(mes, ano),
        this.buscarMetasMes(mes, ano),
        this.buscarGastosAno(ano),
        this.buscarContasPagar(),
        this.buscarContasReceber()
      ]);

      const analise = this.processarDados({
        faturamentoMes,
        gastosMes,
        metasMes,
        gastosAno,
        contasPagar,
        contasReceber,
        mes,
        ano
      });

      this.renderCards(analise);
      this.renderResumoTabela(analise);
      this.renderTopListas(analise);
      this.renderAlertas(analise);
      this.renderBarChart(analise);
      this.renderPieChart(analise);
      this.renderLineChart(analise);
      this.renderRankingChart(analise);
    } catch (error) {
      console.error("Erro ao carregar dashboard:", error);
      if (window.utils?.setAppMsg) {
        utils.setAppMsg("Erro ao carregar dashboard: " + error.message, "err");
      }
    }
  },

  getMesAnoSeguro() {
    if (window.utils?.getMesAno) {
      return utils.getMesAno();
    }

    const mes = document.getElementById("mesSelect")?.value || "Janeiro";
    const ano = Number(document.getElementById("anoSelect")?.value || new Date().getFullYear());
    return { mes, ano };
  },

  mesParaNumero(nomeMes) {
    const mapa = {
      janeiro: 1,
      fevereiro: 2,
      março: 3,
      marco: 3,
      abril: 4,
      maio: 5,
      junho: 6,
      julho: 7,
      agosto: 8,
      setembro: 9,
      outubro: 10,
      novembro: 11,
      dezembro: 12
    };

    return mapa[String(nomeMes || "").trim().toLowerCase()] || 1;
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

    return meses[(Number(numero) || 1) - 1] || "Janeiro";
  },

  normalizarTexto(valor) {
    return String(valor || "").trim().toUpperCase();
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

  formatarMoeda(valor) {
    if (window.utils?.moeda) return utils.moeda(valor);
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(Number(valor || 0));
  },

  arredondar(valor, casas = 2) {
    if (window.utils?.arredondar) return utils.arredondar(valor, casas);
    return Number(Number(valor || 0).toFixed(casas));
  },

  async buscarFaturamentoMes(mes, ano) {
    const data = await api.select("meses", { ano });

    const alvo = (data || []).find(item => {
      const mesItem = String(item.mes || item.nome_mes || "").trim().toLowerCase();
      return mesItem === String(mes).trim().toLowerCase();
    });

    return this.normalizarNumero(
      alvo?.faturamento ??
      alvo?.valor ??
      alvo?.receita ??
      0
    );
  },

  async buscarGastosMes(mes, ano) {
    const data = await api.select("gastos", { ano });

    return (data || []).filter(item => {
      const mesItem = String(item.mes || "").trim().toLowerCase();
      return mesItem === String(mes).trim().toLowerCase();
    });
  },

  async buscarMetasMes(mes, ano) {
    const data = await api.select("metas", { ano });

    return (data || []).filter(item => {
      const mesItem = String(item.mes || "").trim().toLowerCase();
      return mesItem === String(mes).trim().toLowerCase();
    });
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
    gastosMes,
    metasMes,
    gastosAno,
    contasPagar,
    contasReceber,
    mes,
    ano
  }) {
    const categorias = {};
    this.categoriasPadrao.forEach(cat => {
      categorias[cat] = {
        categoria: cat,
        gasto: 0,
        percentualMeta: 0,
        metaValor: 0,
        diferenca: 0,
        situacao: "Dentro da meta"
      };
    });

    (gastosMes || []).forEach(item => {
      const categoria = this.normalizarTexto(item.categoria || "DESP");
      if (!categorias[categoria]) {
        categorias[categoria] = {
          categoria,
          gasto: 0,
          percentualMeta: 0,
          metaValor: 0,
          diferenca: 0,
          situacao: "Sem meta"
        };
      }

      categorias[categoria].gasto += this.normalizarNumero(item.valor || 0);
    });

    (metasMes || []).forEach(item => {
      const categoria = this.normalizarTexto(item.categoria || "");
      if (!categoria) return;

      if (!categorias[categoria]) {
        categorias[categoria] = {
          categoria,
          gasto: 0,
          percentualMeta: 0,
          metaValor: 0,
          diferenca: 0,
          situacao: "Sem meta"
        };
      }

      categorias[categoria].percentualMeta = this.normalizarNumero(
        item.percentual_meta ??
        item.percentual ??
        item.meta ??
        item.valor ??
        0
      );
    });

    Object.values(categorias).forEach(item => {
      item.metaValor = faturamentoMes * (item.percentualMeta / 100);
      item.diferenca = item.metaValor - item.gasto;

      if (item.percentualMeta <= 0) {
        item.situacao = item.gasto > 0 ? "Sem meta cadastrada" : "Sem movimentação";
      } else if (item.gasto > item.metaValor) {
        item.situacao = "Acima da meta";
      } else {
        item.situacao = "Dentro da meta";
      }
    });

    const totalGastosMes = Object.values(categorias).reduce((acc, item) => acc + item.gasto, 0);
    const saldoMes = faturamentoMes - totalGastosMes;
    const metaAtingida = faturamentoMes > 0 ? (saldoMes / faturamentoMes) * 100 : 0;

    const gastosPorMes = {};
    for (let i = 1; i <= 12; i++) {
      gastosPorMes[this.numeroParaMes(i)] = 0;
    }

    (gastosAno || []).forEach(item => {
      const nomeMes = String(item.mes || "").trim();
      if (!nomeMes) return;
      if (!(nomeMes in gastosPorMes)) return;
      gastosPorMes[nomeMes] += this.normalizarNumero(item.valor || 0);
    });

    const rankingAnualCategorias = {};
    (gastosAno || []).forEach(item => {
      const categoria = this.normalizarTexto(item.categoria || "DESP");
      rankingAnualCategorias[categoria] = (rankingAnualCategorias[categoria] || 0) + this.normalizarNumero(item.valor || 0);
    });

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const contasPagarPendentes = (contasPagar || []).filter(item => {
      return String(item.status || "").toLowerCase() !== "pago";
    });

    const contasReceberPendentes = (contasReceber || []).filter(item => {
      return !["recebido", "pago", "baixado"].includes(String(item.status || "").toLowerCase());
    });

    const contasVencidas = contasPagarPendentes.filter(item => {
      if (!item.vencimento) return false;
      const data = new Date(String(item.vencimento) + "T00:00:00");
      return data < hoje;
    });

    const vencemHoje = contasPagarPendentes.filter(item => {
      if (!item.vencimento) return false;
      const data = new Date(String(item.vencimento) + "T00:00:00");
      return data.getTime() === hoje.getTime();
    });

    const proximos7Dias = contasPagarPendentes.filter(item => {
      if (!item.vencimento) return false;
      const data = new Date(String(item.vencimento) + "T00:00:00");
      const diff = Math.ceil((data - hoje) / 86400000);
      return diff >= 1 && diff <= 7;
    });

    const topPagar = [...contasPagarPendentes]
      .sort((a, b) => this.normalizarNumero(b.valor) - this.normalizarNumero(a.valor))
      .slice(0, 5);

    const topReceber = [...contasReceberPendentes]
      .sort((a, b) => this.normalizarNumero(b.valor) - this.normalizarNumero(a.valor))
      .slice(0, 5);

    const alertas = [];

    if (contasVencidas.length) {
      alertas.push({
        tipo: "critico",
        titulo: `${contasVencidas.length} conta(s) vencida(s)`,
        descricao: `Valor total vencido: ${this.formatarMoeda(contasVencidas.reduce((a, b) => a + this.normalizarNumero(b.valor), 0))}`
      });
    }

    if (vencemHoje.length) {
      alertas.push({
        tipo: "atencao",
        titulo: `${vencemHoje.length} conta(s) vencem hoje`,
        descricao: `Valor total: ${this.formatarMoeda(vencemHoje.reduce((a, b) => a + this.normalizarNumero(b.valor), 0))}`
      });
    }

    if (saldoMes < 0) {
      alertas.push({
        tipo: "critico",
        titulo: "Saldo do mês negativo",
        descricao: `Saldo atual: ${this.formatarMoeda(saldoMes)}`
      });
    }

    const categoriasAcimaMeta = Object.values(categorias).filter(item => item.situacao === "Acima da meta");
    if (categoriasAcimaMeta.length) {
      alertas.push({
        tipo: "atencao",
        titulo: `${categoriasAcimaMeta.length} categoria(s) acima da meta`,
        descricao: categoriasAcimaMeta.map(i => i.categoria).join(", ")
      });
    }

    if (!alertas.length) {
      alertas.push({
        tipo: "ok",
        titulo: "Tudo sob controle",
        descricao: "Nenhum alerta crítico para o período selecionado."
      });
    }

    return {
      mes,
      ano,
      faturamentoMes,
      totalGastosMes,
      saldoMes,
      metaAtingida,
      categorias: Object.values(categorias),
      gastosPorMes,
      rankingAnualCategorias,
      contasVencidas,
      vencemHoje,
      proximos7Dias,
      topPagar,
      topReceber,
      alertas
    };
  },

  renderCards(analise) {
    this.setText("fat", this.formatarMoeda(analise.faturamentoMes));
    this.setText("gas", this.formatarMoeda(analise.totalGastosMes));
    this.setText("saldo", this.formatarMoeda(analise.saldoMes));
    this.setText("metaAtingida", `${this.arredondar(analise.metaAtingida, 2)}%`);

    this.setText("cardVencidas", String(analise.contasVencidas.length));
    this.setText("cardHoje", String(analise.vencemHoje.length));
    this.setText("card7dias", String(analise.proximos7Dias.length));

    const variacao = analise.faturamentoMes > 0
      ? ((analise.saldoMes / analise.faturamentoMes) * 100)
      : 0;

    this.setText("varFat", `${this.arredondar(variacao, 2)}%`);
  },

  renderResumoTabela(analise) {
    const tbody = document.getElementById("tabelaResumo");
    if (!tbody) return;

    const linhas = analise.categorias
      .filter(item => item.gasto > 0 || item.percentualMeta > 0)
      .sort((a, b) => b.gasto - a.gasto);

    if (!linhas.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="muted">Nenhum dado carregado.</td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = linhas.map(item => `
      <tr>
        <td>${item.categoria}</td>
        <td>${this.formatarMoeda(item.gasto)}</td>
        <td>${this.arredondar(item.percentualMeta, 2)}%</td>
        <td>${this.formatarMoeda(item.metaValor)}</td>
        <td class="${item.diferenca >= 0 ? "ok" : "err"}">${this.formatarMoeda(item.diferenca)}</td>
        <td class="${item.situacao === "Acima da meta" ? "err" : "ok"}">${item.situacao}</td>
      </tr>
    `).join("");
  },

  renderTopListas(analise) {
    this.renderListaTop("topPagar", analise.topPagar, "fornecedor", "vencimento");
    this.renderListaTop("topReceber", analise.topReceber, "cliente", "vencimento");
  },

  renderListaTop(elementId, lista, campoNome, campoData) {
    const el = document.getElementById(elementId);
    if (!el) return;

    if (!lista.length) {
      el.innerHTML = `<div class="muted">Nenhum dado disponível.</div>`;
      return;
    }

    el.innerHTML = lista.map(item => `
      <div class="alert-item">
        <strong>${item[campoNome] || "-"}</strong><br>
        ${item.documento || "-"} · ${item.categoria || "-"}<br>
        ${this.formatarMoeda(item.valor || 0)} · ${item[campoData] || "-"}
      </div>
    `).join("");
  },

  renderAlertas(analise) {
    const el = document.getElementById("alertList");
    if (!el) return;

    el.innerHTML = analise.alertas.map(alerta => `
      <div class="alert-item ${alerta.tipo}">
        <strong>${alerta.titulo}</strong><br>
        ${alerta.descricao}
      </div>
    `).join("");
  },

  renderBarChart(analise) {
    const canvas = document.getElementById("barChart");
    if (!canvas || typeof Chart === "undefined") return;

    const linhas = analise.categorias
      .filter(item => item.gasto > 0 || item.metaValor > 0);

    const labels = linhas.map(item => item.categoria);
    const gastos = linhas.map(item => this.arredondar(item.gasto, 2));
    const metas = linhas.map(item => this.arredondar(item.metaValor, 2));

    if (this.barChart) this.barChart.destroy();

    this.barChart = new Chart(canvas, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Gasto",
            data: gastos
          },
          {
            label: "Meta",
            data: metas
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });
  },

  renderPieChart(analise) {
    const canvas = document.getElementById("pieChart");
    if (!canvas || typeof Chart === "undefined") return;

    const linhas = analise.categorias.filter(item => item.gasto > 0);
    const labels = linhas.map(item => item.categoria);
    const valores = linhas.map(item => this.arredondar(item.gasto, 2));

    if (this.pieChart) this.pieChart.destroy();

    this.pieChart = new Chart(canvas, {
      type: "doughnut",
      data: {
        labels,
        datasets: [
          {
            data: valores
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });
  },

  renderLineChart(analise) {
    const canvas = document.getElementById("lineChart");
    if (!canvas || typeof Chart === "undefined") return;

    const ordemMeses = [
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

    const labels = ordemMeses;
    const valores = ordemMeses.map(mes => this.arredondar(analise.gastosPorMes[mes] || 0, 2));

    if (this.lineChart) this.lineChart.destroy();

    this.lineChart = new Chart(canvas, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Gastos mensais",
            data: valores,
            tension: 0.35
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });
  },

  renderRankingChart(analise) {
    const canvas = document.getElementById("rankingChart");
    if (!canvas || typeof Chart === "undefined") return;

    const ranking = Object.entries(analise.rankingAnualCategorias)
      .sort((a, b) => b[1] - a[1]);

    const labels = ranking.map(item => item[0]);
    const valores = ranking.map(item => this.arredondar(item[1], 2));

    if (this.rankingChart) this.rankingChart.destroy();

    this.rankingChart = new Chart(canvas, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Gastos no ano",
            data: valores
          }
        ]
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false
      }
    });
  },

  setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }
};
