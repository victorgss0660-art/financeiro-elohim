window.contasRecebidasModule = {

  async carregarContasRecebidas() {
    const { mes, ano } = utils.getMesAno();

    const data = await api.restGet(
      "contas_receber",
      `select=*&mes=eq.${mes}&ano=eq.${ano}&status=eq.recebido`
    );

    const tbody = document.getElementById("tabelaContasRecebidas");

    if (!data.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="muted">Nenhuma conta recebida.</td></tr>`;
      return;
    }

    tbody.innerHTML = data.map(i => `
      <tr>
        <td>${i.cliente}</td>
        <td>${i.descricao}</td>
        <td>${i.documento}</td>
        <td>${i.categoria}</td>
        <td>${utils.moeda(i.valor)}</td>
        <td>${i.data_recebimento}</td>
        <td>${utils.moeda(i.valor)}</td>
      </tr>
    `).join("");
  }

};
