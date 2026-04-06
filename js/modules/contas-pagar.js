window.contasPagarModule = {
  contaEditandoId: null,
  pagandoId: null,

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

      if (this.contaEditandoId) {
        await api.restPatch(
          "contas_pagar",
          `id=eq.${this.contaEditandoId}`,
          payload
        );
        utils.setAppMsg("Conta atualizada com sucesso.", "ok");
      } else {
        await api.restInsert("contas_pagar", [payload]);
        utils.setAppMsg("Conta a pagar salva com sucesso.", "ok");
      }

      this.cancelarEdicao();
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

  preencherFormulario(item) {
    document.getElementById("cpFornecedor").value = item.fornecedor || "";
    document.getElementById("cpDescricao").value = item.descricao || "";
    document.getElementById("cpCategoria").value = item.categoria || "";
    document.getElementById("cpDocumento").value = item.documento || "";
    document.getElementById("cpValor").value = item.valor || "";
    document.getElementById("cpVencimento").value = item.vencimento || "";
    document.getElementById("cpObservacoes").value = item.observacoes || "";
  },

  editar(item) {
    this.contaEditandoId = item.id;
    this.preencherFormulario(item);
    utils.setAppMsg("Modo edição ativado.", "info");
    window.scrollTo({ top: 0, behavior: "smooth" });
  },

  cancelarEdicao() {
    this.contaEditandoId = null;
    this.limparFormulario();
  },

  async excluir(id) {
    try {
      await api.restDelete("contas_pagar", `id=eq.${id}`);
      utils.setAppMsg("Conta excluída com sucesso.", "ok");

      if (this.contaEditandoId === id) {
        this.cancelarEdicao();
      }

      await this.carregarContasPagar();

      if (window.planejamentoModule?.carregarPlanejamento) {
        await window.planejamentoModule.carregarPlanejamento();
      }
    } catch (e) {
      utils.setAppMsg("Erro ao excluir conta: " + e.message, "err");
    }
  },

  async duplicar(item) {
    try {
      const { mes, ano } = utils.getMesAno();

      const payload = {
        fornecedor: item.fornecedor || "",
        descricao: item.descricao || "",
        categoria: item.categoria || "",
        documento: item.documento || "",
        valor: Number(item.valor || 0),
        vencimento: item.vencimento || "",
        observacoes: item.observacoes || "",
        status: "pendente",
        mes,
        ano
      };

      await api.restInsert("contas_pagar", [payload]);
      utils.setAppMsg("Conta duplicada com sucesso.", "ok");

      await this.carregarContasPagar();

      if (window.planejamentoModule?.carregarPlanejamento) {
        await window.planejamentoModule.carregarPlanejamento();
      }
    } catch (e) {
      utils.setAppMsg("Erro ao duplicar conta: " + e.message, "err");
    }
  },

  abrirPopupPagamento(id) {
    this.pagandoId = id;

    const popup = document.getElementById("popupPagamento");
    const pgData = document.getElementById("pgData");
    const pgMulta = document.getElementById("pgMulta");
    const pgDesconto = document.getElementById("pgDesconto");

    if (pgData) pgData.value = utils.hojeISO();
    if (pgMulta) pgMulta.value = "";
    if (pgDesconto) pgDesconto.value = "";

    if (popup) popup.classList.remove("hidden");
  },

  fecharPopup() {
    const popup = document.getElementById("popupPagamento");
    if (popup) popup.classList.add("hidden");
    this.pagandoId = null;
  },

  async confirmarPagamento() {
    try {
      if (!this.pagandoId) {
        utils.setAppMsg("Nenhuma conta selecionada para pagamento.", "err");
        return;
      }

      const data = document.getElementById("pgData")?.value || utils.hojeISO();
      const multa = Number(document.getElementById("pgMulta")?.value || 0);
      const desconto = Number(document.getElementById("pgDesconto")?.value || 0);

      await api.restPatch("contas_pagar", `id=eq.${this.pagandoId}`, {
        status: "pago",
        data_pagamento: data,
        multa: multa,
        desconto: desconto
      });

      this.fecharPopup();
      utils.setAppMsg("Conta paga com sucesso.", "ok");

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
  },

  async carregarContasPagar() {
    try {
      const data = await api.restGet(
        "contas_pagar",
        `select=*&status=eq.pendente&order=vencimento.asc`
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
        const itemJson = encodeURIComponent(JSON.stringify(item));

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
              <div style="display:flex; gap:6px; flex-wrap:wrap;">
                <button class="small-btn small-blue" onclick="contasPagarModule.editar(JSON.parse(decodeURIComponent('${itemJson}')))">Editar</button>
                <button class="small-btn small-yellow" onclick="contasPagarModule.duplicar(JSON.parse(decodeURIComponent('${itemJson}')))">Duplicar</button>
                <button class="small-btn small-green" onclick="contasPagarModule.abrirPopupPagamento(${item.id})">Pagar</button>
                <button class="small-btn small-red" onclick="contasPagarModule.excluir(${item.id})">Excluir</button>
              </div>
            </td>
          </tr>
        `;
      }).join("");
    } catch (e) {
      utils.setAppMsg("Erro ao carregar contas a pagar: " + e.message, "err");
    }
  }
};
