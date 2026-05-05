window.contasPagarModule = {
  dados: [],
  filtrados: [],
  selecionados: new Set(),
  editandoId: null,

  inputs: {
    nfe: false,
    boleto: false
  },

  get(id) {
    return document.getElementById(id);
  },

  valor(id) {
    return this.get(id)?.value || "";
  },

  numero(valor) {
    if (typeof valor === "number") return valor;
    if (!valor) return 0;

    let txt = String(valor).trim();
    txt = txt.replace(/R\$/g, "").replace(/\s/g, "");

    if (txt.includes(",") && txt.includes(".")) {
      txt = txt.replace(/\./g, "").replace(",", ".");
    } else if (txt.includes(",")) {
      txt = txt.replace(",", ".");
    }

    const n = parseFloat(txt);
    return isNaN(n) ? 0 : n;
  },

  moeda(valor) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(this.numero(valor));
  },

  dataBR(data) {
    if (!data) return "-";
    const d = new Date(String(data) + "T00:00:00");
    if (isNaN(d.getTime())) return data;
    return d.toLocaleDateString("pt-BR");
  },

  async carregar() {
    try {
      const dados = await api.restGet(
        "contas_pagar",
        "select=*&status=neq.pago&order=vencimento.asc"
      );

      this.dados = Array.isArray(dados) ? dados : [];
      this.filtrados = [...this.dados];
      this.renderizar();
    } catch (erro) {
      console.error("Erro ao carregar contas a pagar:", erro);
      alert("Erro ao carregar contas a pagar.");
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
      btnNfe.classList.toggle("ativo", this.inputs.nfe);
      btnNfe.classList.toggle("active", this.inputs.nfe);

      const txt = btnNfe.querySelector(".toggle-text");
      if (txt) txt.textContent = this.inputs.nfe ? "NFE recebida" : "Não recebida";
    }

    if (btnBoleto) {
      btnBoleto.classList.toggle("ativo", this.inputs.boleto);
      btnBoleto.classList.toggle("active", this.inputs.boleto);

      const txt = btnBoleto.querySelector(".toggle-text");
      if (txt) txt.textContent = this.inputs.boleto ? "Boleto recebido" : "Não recebido";
    }
  },

  resetToggles() {
    this.inputs = {
      nfe: false,
      boleto: false
    };

    this.atualizarToggleUI();
  },

  async salvar() {
    try {
      const payload = {
        fornecedor: this.valor("cpFornecedor").trim(),
        documento: this.valor("cpDocumento").trim(),
        valor: this.numero(this.valor("cpValor")),
        vencimento: this.valor("cpVencimento"),
        categoria: this.valor("cpCategoria").trim().toUpperCase(),
        descricao: this.valor("cpDescricao").trim(),
        tem_nfe: this.inputs.nfe,
        tem_boleto: this.inputs.boleto,
        status: "pendente"
      };

      if (!payload.fornecedor || !payload.valor || !payload.vencimento) {
        alert("Preencha fornecedor, valor e vencimento.");
        return;
      }

      if (this.editandoId) {
        await api.update("contas_pagar", this.editandoId, payload);
        this.editandoId = null;
        alert("Conta atualizada com sucesso.");
      } else {
        await api.insert("contas_pagar", payload);
        alert("Conta lançada com sucesso.");
      }

      this.limparFormulario();
      await this.carregar();
    } catch (erro) {
      console.error("Erro ao salvar conta:", erro);
      alert("Erro ao salvar conta.");
    }
  },

  limparFormulario() {
    [
      "cpFornecedor",
      "cpDocumento",
      "cpValor",
      "cpVencimento",
      "cpCategoria",
      "cpDescricao"
    ].forEach(id => {
      const el = this.get(id);
      if (el) el.value = "";
    });

    this.editandoId = null;
    this.resetToggles();

    const btnSalvar = document.querySelector("#tab-contas-pagar .actions-row button");
    if (btnSalvar) btnSalvar.textContent = "Salvar conta";
  },

  editar(id) {
    const item = this.dados.find(c => Number(c.id) === Number(id));
    if (!item) return;

    this.editandoId = Number(item.id);

    this.get("cpFornecedor").value = item.fornecedor || "";
    this.get("cpDocumento").value = item.documento || "";
    this.get("cpValor").value = item.valor || "";
    this.get("cpVencimento").value = item.vencimento || "";
    this.get("cpCategoria").value = item.categoria || "";
    this.get("cpDescricao").value = item.descricao || "";

    this.inputs.nfe = !!item.tem_nfe;
    this.inputs.boleto = !!item.tem_boleto;
    this.atualizarToggleUI();

    const btnSalvar = document.querySelector("#tab-contas-pagar .actions-row button");
    if (btnSalvar) btnSalvar.textContent = "Atualizar conta";

    window.scrollTo({ top: 0, behavior: "smooth" });
  },

  aplicarFiltros() {
    const busca = this.valor("cpBusca").toLowerCase();
    const fornecedor = this.valor("cpFiltroFornecedor").toLowerCase();
    const categoria = this.valor("cpFiltroCategoria").toLowerCase();
    const inicio = this.valor("cpVencimentoInicio");
    const fim = this.valor("cpVencimentoFim");

    this.filtrados = this.dados.filter(item => {
      const texto = [
        item.fornecedor,
        item.documento,
        item.categoria,
        item.descricao
      ].join(" ").toLowerCase();

      if (busca && !texto.includes(busca)) return false;
      if (fornecedor && !String(item.fornecedor || "").toLowerCase().includes(fornecedor)) return false;
      if (categoria && !String(item.categoria || "").toLowerCase().includes(categoria)) return false;
      if (inicio && item.vencimento < inicio) return false;
      if (fim && item.vencimento > fim) return false;

      return true;
    });

    this.renderizar();
  },

  limparFiltros() {
    [
      "cpBusca",
      "cpFiltroFornecedor",
      "cpFiltroCategoria",
      "cpVencimentoInicio",
      "cpVencimentoFim"
    ].forEach(id => {
      const el = this.get(id);
      if (el) el.value = "";
    });

    this.filtrados = [...this.dados];
    this.renderizar();
  },

  selecionarTodos() {
    this.filtrados.forEach(item => {
      this.selecionados.add(Number(item.id));
    });

    this.renderizar();
  },

  limparSelecao() {
    this.selecionados.clear();
    this.renderizar();
  },

  toggleSelecionado(id, checked) {
    id = Number(id);

    if (checked) {
      this.selecionados.add(id);
    } else {
      this.selecionados.delete(id);
    }

    this.renderizar();
  },

  toggleSelecionadoLinha(id, event) {
    const tag = event.target.tagName.toLowerCase();

    if (tag === "button" || tag === "input") return;

    id = Number(id);

    if (this.selecionados.has(id)) {
      this.selecionados.delete(id);
    } else {
      this.selecionados.add(id);
    }

    this.renderizar();
  },

  async pagar(id) {
    try {
      const confirmar = confirm("Confirmar pagamento desta conta?");
      if (!confirmar) return;

      await api.update("contas_pagar", id, {
        status: "pago",
        data_pagamento: new Date().toISOString().slice(0, 10)
      });

      this.selecionados.delete(Number(id));

      await this.carregar();

      if (window.contasPagasModule?.carregar) {
        contasPagasModule.carregar();
      }
    } catch (erro) {
      console.error("Erro ao pagar conta:", erro);
      alert("Erro ao pagar conta.");
    }
  },

  async pagarSelecionadas() {
    try {
      if (!this.selecionados.size) {
        alert("Selecione pelo menos uma conta.");
        return;
      }

      const confirmar = confirm(
        `Confirmar pagamento de ${this.selecionados.size} conta(s)?`
      );

      if (!confirmar) return;

      const hoje = new Date().toISOString().slice(0, 10);

      for (const id of this.selecionados) {
        await api.update("contas_pagar", id, {
          status: "pago",
          data_pagamento: hoje
        });
      }

      this.selecionados.clear();

      await this.carregar();

      if (window.contasPagasModule?.carregar) {
        contasPagasModule.carregar();
      }

      alert("Contas pagas com sucesso.");
    } catch (erro) {
      console.error("Erro ao pagar selecionadas:", erro);
      alert("Erro ao pagar contas selecionadas.");
    }
  },

  async toggleNfe(id) {
    try {
      const item = this.dados.find(c => Number(c.id) === Number(id));
      if (!item) return;

      await api.update("contas_pagar", id, {
        tem_nfe: !item.tem_nfe
      });

      await this.carregar();
    } catch (erro) {
      console.error("Erro ao alterar NFE:", erro);
      alert("Erro ao alterar NFE.");
    }
  },

  async toggleBoleto(id) {
    try {
      const item = this.dados.find(c => Number(c.id) === Number(id));
      if (!item) return;

      await api.update("contas_pagar", id, {
        tem_boleto: !item.tem_boleto
      });

      await this.carregar();
    } catch (erro) {
      console.error("Erro ao alterar boleto:", erro);
      alert("Erro ao alterar boleto.");
    }
  },

  async excluir(id) {
    try {
      const confirmar = confirm("Excluir esta conta?");
      if (!confirmar) return;

      await api.request(`contas_pagar?id=eq.${id}`, "", "DELETE");

      this.selecionados.delete(Number(id));

      await this.carregar();
    } catch (erro) {
      console.error("Erro ao excluir conta:", erro);
      alert("Erro ao excluir conta.");
    }
  },

  async duplicar(id) {
    try {
      const item = this.dados.find(c => Number(c.id) === Number(id));
      if (!item) return;

      const payload = {
        fornecedor: item.fornecedor,
        documento: item.documento,
        valor: item.valor,
        vencimento: item.vencimento,
        categoria: item.categoria,
        descricao: item.descricao,
        tem_nfe: item.tem_nfe,
        tem_boleto: item.tem_boleto,
        status: "pendente"
      };

      await api.insert("contas_pagar", payload);
      await this.carregar();

      alert("Conta duplicada com sucesso.");
    } catch (erro) {
      console.error("Erro ao duplicar conta:", erro);
      alert("Erro ao duplicar conta.");
    }
  },

  renderizar() {
    const tbody = this.get("tabelaContasPagar");
    if (!tbody) return;

    const lista = this.filtrados || [];

    if (!lista.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" class="muted">Nenhuma conta encontrada.</td>
        </tr>
      `;

      this.resumo();
      return;
    }

    tbody.innerHTML = lista.map(item => {
      const id = Number(item.id);
      const marcado = this.selecionados.has(id);

      return `
        <tr
          class="${marcado ? "linha-vermelha" : ""}"
          onclick="contasPagarModule.toggleSelecionadoLinha(${id}, event)"
        >
          <td>
            <input
              type="checkbox"
              ${marcado ? "checked" : ""}
              onclick="event.stopPropagation()"
              onchange="contasPagarModule.toggleSelecionado(${id}, this.checked)"
            >
          </td>

          <td><strong>${item.fornecedor || "-"}</strong></td>
          <td>${item.documento || "-"}</td>
          <td><strong>${this.moeda(item.valor)}</strong></td>
          <td>${this.dataBR(item.vencimento)}</td>
          <td>${item.categoria || "-"}</td>
          <td>${item.descricao || "-"}</td>

          <td>
            <button
              class="doc-status ${item.tem_nfe ? "ok" : "pendente"}"
              onclick="event.stopPropagation(); contasPagarModule.toggleNfe(${id})"
            >
              ${item.tem_nfe ? "NFE OK" : "NFE"}
            </button>

            <button
              class="doc-status ${item.tem_boleto ? "ok" : "pendente"}"
              onclick="event.stopPropagation(); contasPagarModule.toggleBoleto(${id})"
            >
              ${item.tem_boleto ? "Boleto OK" : "Boleto"}
            </button>
          </td>

          <td>
            <button class="btn-editar" onclick="event.stopPropagation(); contasPagarModule.editar(${id})">Editar</button>
            <button class="btn-duplicar" onclick="event.stopPropagation(); contasPagarModule.duplicar(${id})">Duplicar</button>
            <button class="btn-pagar" onclick="event.stopPropagation(); contasPagarModule.pagar(${id})">Pagar</button>
            <button class="btn-excluir" onclick="event.stopPropagation(); contasPagarModule.excluir(${id})">Excluir</button>
          </td>
        </tr>
      `;
    }).join("");

    this.resumo();
  },

  resumo() {
    const total = this.filtrados.reduce((acc, item) => acc + this.numero(item.valor), 0);

    const selecionadas = this.filtrados.filter(item =>
      this.selecionados.has(Number(item.id))
    );

    const totalSelecionado = selecionadas.reduce(
      (acc, item) => acc + this.numero(item.valor),
      0
    );

    if (this.get("cpQtd")) this.get("cpQtd").textContent = this.filtrados.length;
    if (this.get("cpTotal")) this.get("cpTotal").textContent = this.moeda(total);
    if (this.get("cpSelecionadas")) this.get("cpSelecionadas").textContent = selecionadas.length;
    if (this.get("cpTotalSelecionado")) this.get("cpTotalSelecionado").textContent = this.moeda(totalSelecionado);
  }
};
