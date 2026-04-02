window.contasReceberModule = {
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

      await api.restInsert("contas_receber", [payload]);
      utils.setAppMsg("Conta a receber salva com sucesso.", "ok");

      this.limpar();
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

  async carregarContasReceber() {
    try {
      const { mes, ano } = utils.getMesAno();

      const data = await api.restGet(
        "contas_receber",
        `select=*&mes=eq.${encodeURIComponent(mes)}&ano=eq.${encodeURIComponent(ano)}&status=neq.recebido&order=vencimento.asc`
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
              <button class="small-btn small-green" onclick="contasReceberModule.receber(${item.id})">Receber</button>
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
