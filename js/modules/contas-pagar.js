const contasPagarModule = {

  dados: [],
  filtrados: [],
  selecionados: new Set(),

  inputs: { nfe: false, boleto: false },
  editandoId: null,

  get(id) { return document.getElementById(id); },

  valor(id) { return this.get(id)?.value || ""; },

  numero(v) {
    if (!v) return 0;
    v = String(v).replace(/[^\d,.-]/g, "").replace(",", ".");
    return parseFloat(v) || 0;
  },

  moeda(v) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(this.numero(v));
  },

  dataBR(d) {
    if (!d) return "-";
    return new Date(d + "T00:00:00").toLocaleDateString("pt-BR");
  },

  async carregar() {
    try {
      const dados = await api.restGet(
        "contas_pagar",
        "select=*&status=neq.pago&order=vencimento.asc"
      );

      this.dados = dados || [];
      this.filtrados = [...this.dados];
      this.render();
    } catch (e) {
      console.error(e);
      alert("Erro ao carregar contas");
    }
  },

  toggleInput(tipo) {
    this.inputs[tipo] = !this.inputs[tipo];
    this.atualizarToggleUI();
  },

  atualizarToggleUI() {

    const btnNfe = this.get("btnNfe");
    const btnBoleto = this.get("btnBoleto");

    if (btnNfe) {
      btnNfe.classList.toggle("active", this.inputs.nfe);
      btnNfe.querySelector(".toggle-text").innerText =
        this.inputs.nfe ? "NFE recebida" : "Não recebida";
    }

    if (btnBoleto) {
      btnBoleto.classList.toggle("active", this.inputs.boleto);
      btnBoleto.querySelector(".toggle-text").innerText =
        this.inputs.boleto ? "Boleto recebido" : "Não recebido";
    }
  },

  async salvar() {

    const payload = {
      fornecedor: this.valor("cpFornecedor"),
      documento: this.valor("cpDocumento"),
      valor: this.numero(this.valor("cpValor")),
      vencimento: this.valor("cpVencimento"),
      categoria: this.valor("cpCategoria").toUpperCase(),
      descricao: this.valor("cpDescricao"),
      tem_nfe: this.inputs.nfe,
      tem_boleto: this.inputs.boleto,
      status: "pendente"
    };

    if (!payload.fornecedor || !payload.valor || !payload.vencimento) {
      alert("Preencha fornecedor, valor e vencimento");
      return;
    }

    try {

      if (this.editandoId) {
        await api.update("contas_pagar", this.editandoId, payload);
        this.editandoId = null;
      } else {
        await api.insert("contas_pagar", payload);
      }

      this.limparFormulario();
      await this.carregar();

    } catch (e) {
      console.error(e);
      alert("Erro ao salvar");
    }
  },

  limparFormulario() {

    ["cpFornecedor","cpDocumento","cpValor","cpVencimento","cpCategoria","cpDescricao"]
      .forEach(id => this.get(id).value = "");

    this.inputs = { nfe: false, boleto: false };
    this.editandoId = null;

    this.atualizarToggleUI();
  },

  editar(id) {

    const c = this.dados.find(x => Number(x.id) === Number(id));
    if (!c) return;

    this.get("cpFornecedor").value = c.fornecedor;
    this.get("cpDocumento").value = c.documento;
    this.get("cpValor").value = c.valor;
    this.get("cpVencimento").value = c.vencimento;
    this.get("cpCategoria").value = c.categoria;
    this.get("cpDescricao").value = c.descricao;

    this.inputs.nfe = c.tem_nfe;
    this.inputs.boleto = c.tem_boleto;

    this.editandoId = c.id;

    this.atualizarToggleUI();

    window.scrollTo({ top: 0, behavior: "smooth" });
  },

  async excluir(id) {
    if (!confirm("Excluir conta?")) return;

    await api.request(`contas_pagar?id=eq.${id}`, "", "DELETE");
    await this.carregar();
  },

  async pagar(id) {

    await api.update("contas_pagar", id, {
      status: "pago",
      data_pagamento: new Date().toISOString().slice(0,10)
    });

    await this.carregar();
    contasPagasModule?.carregar();
  },

  async pagarSelecionadas() {

    for (const id of this.selecionados) {
      await this.pagar(id);
    }

    this.selecionados.clear();
  },

  aplicarFiltros() {

    const busca = this.valor("cpBusca").toLowerCase();

    this.filtrados = this.dados.filter(c =>
      !busca ||
      c.fornecedor.toLowerCase().includes(busca) ||
      c.documento.toLowerCase().includes(busca) ||
      c.categoria.toLowerCase().includes(busca)
    );

    this.render();
  },

  selecionar(id) {
    this.selecionados.has(id)
      ? this.selecionados.delete(id)
      : this.selecionados.add(id);

    this.render();
  },

  selecionarTodos() {
    this.filtrados.forEach(c => this.selecionados.add(c.id));
    this.render();
  },

  limparSelecao() {
    this.selecionados.clear();
    this.render();
  },

  render() {

    const tbody = this.get("tabelaContasPagar");

    if (!this.filtrados.length) {
      tbody.innerHTML = `<tr><td colspan="9">Nenhuma conta</td></tr>`;
      this.resumo();
      return;
    }

    tbody.innerHTML = this.filtrados.map(c => `
      <tr>
        <td>
          <input type="checkbox"
            ${this.selecionados.has(c.id) ? "checked" : ""}
            onclick="contasPagarModule.selecionar(${c.id})"
          />
        </td>
        <td>${c.fornecedor}</td>
        <td>${c.documento}</td>
        <td>${this.moeda(c.valor)}</td>
        <td>${this.dataBR(c.vencimento)}</td>
        <td>${c.categoria}</td>
        <td>${c.descricao || "-"}</td>
        <td>${c.tem_nfe ? "NFE" : "-"} / ${c.tem_boleto ? "Boleto" : "-"}</td>
        <td>
          <button onclick="contasPagarModule.editar(${c.id})">Editar</button>
          <button onclick="contasPagarModule.pagar(${c.id})">Pagar</button>
          <button onclick="contasPagarModule.excluir(${c.id})">Excluir</button>
        </td>
      </tr>
    `).join("");

    this.resumo();
  },

  resumo() {

    const total = this.dados.reduce((s,c)=>s+c.valor,0);

    const totalSel = this.dados
      .filter(c => this.selecionados.has(c.id))
      .reduce((s,c)=>s+c.valor,0);

    this.get("cpQtd").innerText = this.dados.length;
    this.get("cpTotal").innerText = this.moeda(total);
    this.get("cpSelecionadas").innerText = this.selecionados.size;
    this.get("cpTotalSelecionado").innerText = this.moeda(totalSel);
  }

};

window.contasPagarModule = contasPagarModule;
