window.contasPagarModule = {
  async salvarContaPagar() {
    try {
      const { mes, ano } = utils.getMesAno();

      const payload = {
        fornecedor: document.getElementById("cpFornecedor").value.trim(),
        descricao: document.getElementById("cpDescricao").value.trim(),
        categoria: document.getElementById("cpCategoria").value.trim(),
        documento: document.getElementById("cpDocumento").value.trim(),
        valor: Number(document.getElementById("cpValor").value || 0),
        vencimento: document.getElementById("cpVencimento").value,
        observacoes: document.getElementById("cpObservacoes").value.trim(),
        status: "pendente",
        mes,
        ano
      };

      if (!payload.fornecedor || !payload.descricao || !payload.valor || !payload.vencimento) {
        utils.setAppMsg("Preencha fornecedor, descrição, valor e vencimento.", "err");
        return;
      }

      await api.restInsert("contas_pagar", [payload]);
      utils.setAppMsg("Conta a pagar salva com sucesso.", "ok");

      this.limparFormulario();
      await this.carregarContasPagar();
      if (window.planejamentoModule?.carregarPlanejamento) {
        await window.planejamentoModule.carregarPlanejamento();
      }
    } catch (e) {
      utils.setAppMsg("Erro ao salvar conta a pagar: " + e.message, "err");
    }
  },

  limparFormulario() {
    [
      "cpFornecedor",
      "cpDescricao",
      "cpCategoria",
      "cpDocumento",
      "cpValor",
      "cpVencimento",
      "cpObservacoes"
    ].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
  },

  async carregarContasPagar() {
    try {
      const { mes, ano } = utils.getMesAno();

      const data = await api.restGet(
        "contas_pagar",
        `select=*&mes=eq.${encodeURIComponent(mes)}&ano=eq.${encodeURIComponent(ano)}&status=eq.pendente&order=vencimento.asc`
      );

      const tbody = document.getElementById("tabelaContasPagar");

      if (!data.length) {
        tbody.innerHTML = `
          <tr>
            <td colspan="8" class="muted">Nenhuma conta a pagar pendente.</td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = data.map(item => {
        const hoje = utils.hojeISO();
        const vencido = item.vencimento && item.vencimento < hoje;
        const statusExibicao = vencido ? "vencido" : "pendente";

        return `
          <tr>
            <td>${item.fornecedor || "-"}</td>
            <td>${item.descricao || "-"}</td>
            <td>${item.categoria || "-"}</td>
            <td>${item.documento || "-"}</td>
            <td>${utils.moeda(item.valor || 0)}</td>
            <td>${item.vencimento || "-"}</td>
            <td>${statusExibicao}</td>
            <td>
              <button class="small-btn small-green" onclick="contasPagarModule.pagar(${item.id})">Pagar</button>
            </td>
          </tr>
        `;
      }).join("");
    } catch (e) {
      utils.setAppMsg("Erro ao carregar contas a pagar: " + e.message, "err");
    }
  },

  async pagar(id) {
    try {
      await api.restPatch("contas_pagar", `id=eq.${id}`, {
        status: "pago",
        data_pagamento: utils.hojeISO()
      });

      utils.setAppMsg("Conta marcada como paga.", "ok");

      await this.carregarContasPagar();
      if (window.contasPagasModule?.carregarContasPagas) {
        await window.contasPagasModule.carregarContasPagas();
      }
      if (window.planejamentoModule?.carregarPlanejamento) {
        await window.planejamentoModule.carregarPlanejamento();
      }
    } catch (e) {
      utils.setAppMsg("Erro ao pagar conta: " + e.message, "err");
    }
  }
};
