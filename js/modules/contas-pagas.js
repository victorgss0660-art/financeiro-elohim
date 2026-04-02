window.contasPagasModule = {
  async carregarContasPagas() {
    try {
      const { mes, ano } = utils.getMesAno();

      const data = await api.restGet(
        "contas_pagar",
        `select=*&mes=eq.${encodeURIComponent(mes)}&ano=eq.${encodeURIComponent(ano)}&status=eq.pago&order=data_pagamento.desc`
      );

      const tbody = document.getElementById("tabelaContasPagas");

      if (!data.length) {
        tbody.innerHTML = `
          <tr>
            <td colspan="7" class="muted">Nenhuma conta paga.</td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = data.map(item => `
        <tr>
          <td>${item.fornecedor || "-"}</td>
          <td>${item.descricao || "-"}</td>
          <td>${item.categoria || "-"}</td>
          <td>${item.documento || "-"}</td>
          <td>${utils.moeda(item.valor || 0)}</td>
          <td>${item.data_pagamento || "-"}</td>
          <td>${utils.moeda(item.valor || 0)}</td>
        </tr>
      `).join("");
    } catch (e) {
      utils.setAppMsg("Erro ao carregar contas pagas: " + e.message, "err");
    }
  }
};
