window.contasRecebidasModule = {
  async carregarContasRecebidas() {
    try {
      const { mes, ano } = utils.getMesAno();

      const data = await api.restGet(
        "contas_receber",
        `select=*&mes=eq.${encodeURIComponent(mes)}&ano=eq.${encodeURIComponent(ano)}&status=eq.recebido&order=data_recebimento.desc`
      );

      const tbody = document.getElementById("tabelaContasRecebidas");

      if (!data.length) {
        tbody.innerHTML = `
          <tr>
            <td colspan="7" class="muted">Nenhuma conta recebida.</td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = data.map(item => `
        <tr>
          <td>${item.cliente || "-"}</td>
          <td>${item.descricao || "-"}</td>
          <td>${item.documento || "-"}</td>
          <td>${item.categoria || "-"}</td>
          <td>${utils.moeda(item.valor || 0)}</td>
          <td>${item.data_recebimento || "-"}</td>
          <td>${utils.moeda(item.valor || 0)}</td>
        </tr>
      `).join("");
    } catch (e) {
      utils.setAppMsg("Erro ao carregar contas recebidas: " + e.message, "err");
    }
  }
};
