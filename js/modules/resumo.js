window.resumoModule = {
  async carregarResumoAnual() {
    try {
      const ano = document.getElementById("anoSelect")?.value;
      const tbody = document.getElementById("tabelaResumoAnual");

      if (!ano || !tbody) return;

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
        mapa[mes] = {
          faturamento: 0,
          gastos: 0
        };
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

      const resumo = ordemMeses.map(mes => {
        const faturamento = utils.num(mapa[mes].faturamento);
        const gastos = utils.num(mapa[mes].gastos);
        const saldo = utils.num(faturamento - gastos);

        return { mes, faturamento, gastos, saldo };
      });

      tbody.innerHTML = resumo.map(item => `
        <tr>
          <td>${item.mes}</td>
          <td>${utils.moeda(item.faturamento)}</td>
          <td>${utils.moeda(item.gastos)}</td>
          <td class="${item.saldo >= 0 ? "ok" : "err"}">${utils.moeda(item.saldo)}</td>
        </tr>
      `).join("");
    } catch (e) {
      utils.setAppMsg("Erro ao carregar resumo anual: " + e.message, "err");
    }
  }
};
