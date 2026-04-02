window.contasPagarModule = {

  async salvarContaPagar() {
    const { mes, ano } = utils.getMesAno();

    await api.restInsert("contas_pagar", [{
      fornecedor: cpFornecedor.value,
      descricao: cpDescricao.value,
      categoria: cpCategoria.value,
      documento: cpDocumento.value,
      valor: Number(cpValor.value),
      vencimento: cpVencimento.value,
      status: "pendente",
      mes,
      ano
    }]);

    utils.setAppMsg("Conta salva", "ok");
    await this.carregarContasPagar();
  },

  async carregarContasPagar() {
    const { mes, ano } = utils.getMesAno();

    const data = await api.restGet("contas_pagar",
      `select=*&mes=eq.${mes}&ano=eq.${ano}&status=eq.pendente`
    );

    const tbody = tabelaContasPagar;

    tbody.innerHTML = data.map(i => `
      <tr>
        <td>${i.fornecedor}</td>
        <td>${i.descricao}</td>
        <td>${i.categoria}</td>
        <td>${i.documento}</td>
        <td>${utils.moeda(i.valor)}</td>
        <td>${i.vencimento}</td>
        <td>${i.status}</td>
        <td>
          <button onclick="contasPagarModule.pagar(${i.id})">Pagar</button>
        </td>
      </tr>
    `).join("");
  },

  async pagar(id) {
    await api.restPatch("contas_pagar", `id=eq.${id}`, {
      status: "pago",
      data_pagamento: utils.hojeISO()
    });

    await this.carregarContasPagar();
    await contasPagasModule.carregarContasPagas();
  }

};
