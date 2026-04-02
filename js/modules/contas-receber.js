window.contasReceberModule = {

  async salvarContaReceber() {
    try {
      const { mes, ano } = utils.getMesAno();

      await api.restInsert("contas_receber", [{
        cliente: document.getElementById("crrCliente").value,
        descricao: document.getElementById("crrDescricao").value,
        categoria: document.getElementById("crrCategoria").value,
        documento: document.getElementById("crrDocumento").value,
        valor: Number(document.getElementById("crrValor").value || 0),
        vencimento: document.getElementById("crrVencimento").value,
        observacoes: document.getElementById("crrObs").value,
        status: "pendente",
        mes,
        ano
      }]);

      utils.setAppMsg("Conta a receber salva", "ok");

      this.limpar();
      await this.carregarContasReceber();

    } catch (e) {
      utils.setAppMsg(e.message, "err");
    }
  },

  limpar() {
    ["crrCliente","crrDescricao","crrCategoria","crrDocumento","crrValor","crrVencimento","crrObs"]
      .forEach(id => document.getElementById(id).value = "");
  },

  async carregarContasReceber() {
    const { mes, ano } = utils.getMesAno();

    const data = await api.restGet(
      "contas_receber",
      `select=*&mes=eq.${mes}&ano=eq.${ano}&status=neq.recebido&order=vencimento.asc`
    );

    const tbody = document.getElementById("tabelaContasReceber");

    if (!data.length) {
      tbody.innerHTML = `<tr><td colspan="8" class="muted">Nenhuma conta.</td></tr>`;
      return;
    }

    tbody.innerHTML = data.map(i => `
      <tr>
        <td>${i.cliente}</td>
        <td>${i.descricao}</td>
        <td>${i.documento}</td>
        <td>${i.categoria}</td>
        <td>${utils.moeda(i.valor)}</td>
        <td>${i.vencimento}</td>
        <td>${i.status}</td>
        <td>
          <button onclick="contasReceberModule.receber(${i.id})">Receber</button>
        </td>
      </tr>
    `).join("");
  },

  async receber(id) {
    await api.restPatch("contas_receber", `id=eq.${id}`, {
      status: "recebido",
      data_recebimento: utils.hojeISO()
    });

    await this.carregarContasReceber();
    if(window.contasRecebidasModule) await contasRecebidasModule.carregarContasRecebidas();
  }

};
