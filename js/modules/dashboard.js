window.dashboardModule = {
  barChart: null,
  pieChart: null,
  lineChart: null,
  rankingChart: null,
  fullscreenChart: null,

  mesesOrdem: [
    "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
    "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"
  ],

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

      this.cacheMeses = mesesAno;

      const faturamentoValor = faturamento?.valor || 0;
      const totalGastos = utils.totalizar(gastosMes, "valor");
      const saldo = faturamentoValor - totalGastos;

      this.preencherCards({
        faturamento: faturamentoValor,
        gastos: totalGastos,
        saldo
      });

      this.renderComparativo(mes, ano, faturamentoValor, totalGastos);

      const metasMap = this.montarMapaMetas(metasAno);
      const gastosPorCategoria = utils.somarPorCategoria(gastosMes, "categoria", "valor");

      this.renderBarChart(gastosPorCategoria, metasMap, faturamentoValor);
      this.renderPieChart(gastosPorCategoria);
      this.renderLineChart(gastosAno);
      this.renderRankingChart(gastosAno);

      this.renderAlertas(gastosPorCategoria, metasMap, faturamentoValor, saldo);
      this.renderVencimentos(contasPagar);
      this.renderTopContas(contasPagar, contasReceber);

    } catch (e) {
      utils.setAppMsg("Erro no dashboard: " + e.message, "err");
    }
  },

  async buscarContasPagar() {
    return await api.restGet("contas_pagar", "select=*");
  },

  async buscarContasReceber() {
    return await api.restGet("contas_receber", "select=*");
  },

  renderVencimentos(contas) {
    const hoje = new Date();
    const hojeStr = hoje.toISOString().split("T")[0];

    const vencidas = contas.filter(c => c.vencimento < hojeStr);
    const hojeVenc = contas.filter(c => c.vencimento === hojeStr);

    const dias7 = new Date();
    dias7.setDate(hoje.getDate() + 7);
    const limite = dias7.toISOString().split("T")[0];

    const proximas = contas.filter(c =>
      c.vencimento > hojeStr && c.vencimento <= limite
    );

    document.getElementById("cardVencidas").innerText = vencidas.length;
    document.getElementById("cardHoje").innerText = hojeVenc.length;
    document.getElementById("card7dias").innerText = proximas.length;
  },

  renderTopContas(pagar, receber) {
    const topPagar = pagar
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 5);

    const topReceber = receber
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 5);

    document.getElementById("topPagar").innerHTML =
      topPagar.map(c => `<div>${c.fornecedor} - ${utils.moeda(c.valor)}</div>`).join("");

    document.getElementById("topReceber").innerHTML =
      topReceber.map(c => `<div>${c.cliente} - ${utils.moeda(c.valor)}</div>`).join("");
  },

  renderComparativo(mes, ano, fatAtual, gastosAtual) {
    const index = this.mesesOrdem.indexOf(mes);

    if (index <= 0) return;

    const mesAnterior = this.mesesOrdem[index - 1];

    const anterior = this.cacheMeses.find(m => m.mes === mesAnterior);

    const fatAnt = anterior ? this.extrairValorMes(anterior) : 0;

    const variacaoFat = fatAnt > 0 ? ((fatAtual - fatAnt) / fatAnt) * 100 : 0;

    document.getElementById("varFat").innerText =
      `${utils.arredondar(variacaoFat,1)}%`;
  },

  preencherCards({ faturamento, gastos, saldo }) {
    document.getElementById("fat").textContent = utils.moeda(faturamento);
    document.getElementById("gas").textContent = utils.moeda(gastos);
    document.getElementById("saldo").textContent = utils.moeda(saldo);
  },

  montarMapaMetas(metas) {
    const mapa = {};
    metas.forEach(m => mapa[m.categoria] = m.percentual_meta);
    return mapa;
  }
};
