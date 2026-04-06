window.contasReceberModule = {
  contaEditandoId: null,

  async salvarContaReceber() {
    try {
      const { mes, ano } = utils.getMesAno();

      const payload = {
        cliente: document.getElementById("crrCliente").value.trim(),
        descricao: document.getElementById("crrDescricao").value.trim(),
        categoria: document.getElementById("crrCategoria").value.trim(),
        documento: document.getElementById("crrDocumento").value.trim(),
        valor: Number(document.getElementById("crrValor").value || 0),
        vencimento: document.getElementById("crrVencimento").value,
        observacoes: document.getElementById("crrObs").value.trim(),
        status: "pendente",
        mes,
        ano
      };

      if (!payload.cliente || !payload.descricao || !payload.valor || !payload.vencimento) {
        utils.setAppMsg("Preencha cliente, descrição, valor e vencimento.", "err");
        return;
      }

      if (this.contaEditandoId) {
        await api.restPatch(
          "contas_receber",
          `id=eq.${this.contaEditandoId}`,
          payload
        );
        utils.setAppMsg("Conta a receber atualizada com sucesso.", "ok");
      } else {
        await api.restInsert("contas_receber", [payload]);
        utils.setAppMsg("Conta a receber salva com sucesso.", "ok");
      }

      this.cancelarEdicao();
      await this.carregarContasReceber();

      if (window.planejamentoModule?.carregarPlanejamento) {
        await window.planejamentoModule.carregarPlanejamento();
      }
    } catch (e) {
      utils.setAppMsg("Erro ao salvar conta a receber: " + e.message, "err");
    }
  },

  limpar() {
    [
      "crrCliente",
      "crrDescricao",
      "crrCategoria",
      "crrDocumento",
      "crrValor",
      "crrVencimento",
      "crrObs"
    ].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
  },

  preencherFormulario(item) {
    document.getElementById("crrCliente").value = item.cliente || "";
    document.getElementById("crrDescricao").value = item.descricao || "";
    document.getElementById("crrCategoria").value = item.categoria || "";
    document.getElementById("crrDocumento").value = item.documento || "";
    document.getElementById("crrValor").value = item.valor || "";
    document.getElementById("crrVencimento").value = item.vencimento || "";
    document.getElementById("crrObs").value = item.observacoes || "";
  },

  editar(item) {
    this.contaEditandoId = item.id;
    this.preencherFormulario(item);
    utils.setAppMsg("Modo edição de conta a receber ativado.", "info");
    window.scrollTo({ top: 0, behavior: "smooth" });
  },

  cancelarEdicao() {
    this.contaEditandoId = null;
    this.limpar();
  },

  async excluir(id) {
    try {
      await api.restDelete("contas_receber", `id=eq.${id}`);
      utils.setAppMsg("Conta a receber excluída com sucesso.", "ok");

      if (this.contaEditandoId === id) {
        this.cancelarEdicao();
      }

      await this.carregarContasReceber();

      if (window.planejamentoModule?.carregarPlanejamento) {
        await window.planejamentoModule.carregarPlanejamento();
      }
    } catch (e) {
      utils.setAppMsg("Erro ao excluir conta a receber: " + e.message, "err");
    }
  },

  async duplicar(item) {
    try {
      const { mes, ano } = utils.getMesAno();

      const payload = {
        cliente: item.cliente || "",
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

      await api.restInsert("contas_receber", [payload]);
      utils.setAppMsg("Conta a receber duplicada com sucesso.", "ok");

      await this.carregarContasReceber();

      if (window.planejamentoModule?.carregarPlanejamento) {
        await window.planejamentoModule.carregarPlanejamento();
      }
    } catch (e) {
      utils.setAppMsg("Erro ao duplicar conta a receber: " + e.message, "err");
    }
  },

  async carregarContasReceber() {
    try {
      const data = await api.restGet(
        "contas_receber",
        `select=*&status=neq.recebido&order=vencimento.asc`
      );

      const tbody = document.getElementById("tabelaContasReceber");

      if (!data.length) {
        tbody.innerHTML = `
          <tr>
            <td colspan="8" class="muted">Nenhuma conta a receber pendente.</td>
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
            <td>${item.cliente || "-"}</td>
            <td>${item.descricao || "-"}</td>
            <td>${item.documento || "-"}</td>
            <td>${item.categoria || "-"}</td>
            <td>${utils.moeda(item.valor || 0)}</td>
            <td>${item.vencimento || "-"}</td>
            <td>${statusExibicao}</td>
            <td>
              <div style="display:flex; gap:6px; flex-wrap:wrap;">
                <button class="small-btn small-blue" onclick="contasReceberModule.editar(JSON.parse(decodeURIComponent('${itemJson}')))">Editar</button>
                <button class="small-btn small-yellow" onclick="contasReceberModule.duplicar(JSON.parse(decodeURIComponent('${itemJson}')))">Duplicar</button>
                <button class="small-btn small-green" onclick="contasReceberModule.receber(${item.id})">Receber</button>
                <button class="small-btn small-red" onclick="contasReceberModule.excluir(${item.id})">Excluir</button>
              </div>
            </td>
          </tr>
        `;
      }).join("");
    } catch (e) {
      utils.setAppMsg("Erro ao carregar contas a receber: " + e.message, "err");
    }
  },

  async receber(id) {
    try {
      await api.restPatch("contas_receber", `id=eq.${id}`, {
        status: "recebido",
        data_recebimento: utils.hojeISO()
      });

      utils.setAppMsg("Conta marcada como recebida.", "ok");

      await this.carregarContasReceber();

      if (window.contasRecebidasModule?.carregarContasRecebidas) {
        await window.contasRecebidasModule.carregarContasRecebidas();
      }

      if (window.planejamentoModule?.carregarPlanejamento) {
        await window.planejamentoModule.carregarPlanejamento();
      }
    } catch (e) {
      utils.setAppMsg("Erro ao receber conta: " + e.message, "err");
    }
  }
};
