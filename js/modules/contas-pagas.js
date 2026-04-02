window.contasPagasModule = {

  async carregarContasPagas() {
    const { mes, ano } = utils.getMesAno();

    const data = await api.restGet("contas_pagar",
      `select=*&mes=eq.${mes}&ano=eq.${ano}&status=eq.pago`
    );

    const tbody = tabelaContasPagas;

    tbody.innerHTML = data.map(i => `
      <tr>
        <td>${i.fornecedor}</td>
        <td>${i.descricao}</td>
        <td>${i.categoria}</td>
        <td>${i.documento}</td>
        <td>${utils.moeda(i.valor)}</td>
        <td>${i.data_pagamento}</td>
        <td>${utils.moeda(i.valor)}</td>
      </tr>
    `).join("");
  }

};
