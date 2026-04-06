window.contasPagasModule = {
  async carregarContasPagas() {
    try {
      const data = await api.restGet(
        "contas_pagar",
        `select=*&status=eq.pago&order=data_pagamento.desc`
      );

      const tbody = document.getElementById("tabelaContasPagas");

      if (!data.length) {
        tbody.innerHTML = `
          <tr>
            <td colspan="9" class="muted">Nenhuma conta paga.</td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = data.map(item => {
        const valor = Number(item.valor || 0);
        const multa = Number(item.multa || 0);
        const desconto = Number(item.desconto || 0);
        const totalPago = valor + multa - desconto;

        return `
          <tr>
            <td>${item.fornecedor || "-"}</td>
            <td>${item.descricao || "-"}</td>
            <td>${item.categoria || "-"}</td>
            <td>${item.documento || "-"}</td>
            <td>${utils.moeda(valor)}</td>
            <td>${item.data_pagamento || "-"}</td>
            <td>${utils.moeda(multa)}</td>
            <td>${utils.moeda(desconto)}</td>
            <td>
              <div style="display:flex; gap:6px; flex-wrap:wrap; align-items:center;">
                <span class="ok" style="font-weight:700;">${utils.moeda(totalPago)}</span>
                <button class="small-btn small-yellow" onclick="contasPagasModule.cancelarPagamento(${item.id})">
                  Cancelar
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join("");
    } catch (e) {
      utils.setAppMsg("Erro ao carregar contas pagas: " + e.message, "err");
    }
  },

  async cancelarPagamento(id) {
    try {
      await api.restPatch("contas_pagar", `id=eq.${id}`, {
        status: "pendente",
        data_pagamento: null,
        multa: 0,
        desconto: 0
      });

      utils.setAppMsg("Pagamento cancelado com sucesso.", "ok");

      await this.carregarContasPagas();

      if (window.contasPagarModule?.carregarContasPagar) {
        await window.contasPagarModule.carregarContasPagar();
      }

      if (window.planejamentoModule?.carregarPlanejamento) {
        await window.planejamentoModule.carregarPlanejamento();
      }
    } catch (e) {
      utils.setAppMsg("Erro ao cancelar pagamento: " + e.message, "err");
    }
  }
};
