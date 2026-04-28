window.contasPagarModule = {
  dados: [],
  filtrados: [],
  selecionados: new Set(),
  editandoId: null,

  get(id) {
    return document.getElementById(id);
  },

  valor(id) {
    return this.get(id)?.value || "";
  },

  set(id, valor) {
    const el = this.get(id);
    if (el) el.value = valor ?? "";
  },

  numero(valor) {
    if (typeof valor === "number") return valor;
    if (!valor) return 0;

    let txt = String(valor)
      .replace(/R\$/g, "")
      .replace(/\./g, "")
      .replace(",", ".")
      .trim();

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

    const d = new Date(data + "T00:00:00");
    if (isNaN(d.getTime())) return data;

    return d.toLocaleDateString("pt-BR");
  },

  async carregar() {
    await this.listar();
  },

  async listar() {
    try {
      const dados = await api.restGet(
        "contas_pagar",
        "select=*&order=vencimento.asc"
      );

      this.dados = Array.isArray(dados)
        ? dados.filter(
            (item) =>
              String(item.status || "pendente").toLowerCase() !== "pago"
          )
        : [];

      this.filtrados = [...this.dados];

      this.renderizar();
      this.resumo();

    } catch (error) {
      console.error(error);
      alert("Erro ao carregar contas a pagar.");
    }
  },

  renderizar() {
    const tbody = this.get("tabelaContasPagar");
    if (!tbody) return;

    const lista = this.filtrados;

    if (!lista.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9">Nenhuma conta encontrada.</td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = lista.map((item) => {
      const id = Number(item.id);
      const marcado = this.selecionados.has(id);

      return `
        <tr class="${marcado ? "linha-vermelha" : ""}">
          <td>
            <input
              type="checkbox"
              ${marcado ? "checked" : ""}
              onchange="contasPagarModule.toggleSelecionado(${id}, this.checked)"
            >
          </td>

          <td>${item.fornecedor || "-"}</td>
          <td>${item.documento || "-"}</td>
          <td>${this.moeda(item.valor)}</td>
          <td>${this.dataBR(item.vencimento)}</td>
          <td>${item.categoria || "-"}</td>
          <td>${item.descricao || "-"}</td>

<td>
  <button
    class="${item.tem_nfe ? "ok" : ""}"
    onclick="contasPagarModule.toggleNfe(${id})"
  >
    ${item.tem_nfe ? "NFE OK" : "NFE"}
  </button>

  <button
    class="${item.tem_boleto ? "ok" : ""}"
    onclick="contasPagarModule.toggleBoleto(${id})"
  >
    ${item.tem_boleto ? "Boleto OK" : "Boleto"}
  </button>
</td>
            <button onclick="contasPagarModule.editar(${id})">Editar</button>
            <button onclick="contasPagarModule.duplicar(${id})">Duplicar</button>
            <button onclick="contasPagarModule.pagar(${id})">Pagar</button>
            <button onclick="contasPagarModule.excluir(${id})">Excluir</button>
          </td>
        </tr>
      `;
    }).join("");
  },

  resumo() {
    const qtd = this.get("cpQtd");
    const total = this.get("cpTotal");
    const qtdSel = this.get("cpSelecionadas");
    const totalSel = this.get("cpTotalSelecionado");

    const soma = this.filtrados.reduce(
      (acc, item) => acc + this.numero(item.valor),
      0
    );

    const selecionadas = this.filtrados.filter((item) =>
      this.selecionados.has(Number(item.id))
    );

    const somaSel = selecionadas.reduce(
      (acc, item) => acc + this.numero(item.valor),
      0
    );

    if (qtd) qtd.textContent = this.filtrados.length;
    if (total) total.textContent = this.moeda(soma);
    if (qtdSel) qtdSel.textContent = selecionadas.length;
    if (totalSel) totalSel.textContent = this.moeda(somaSel);
  },

  aplicarFiltros() {
    const busca = this.valor("cpBusca").toLowerCase();
    const fornecedor = this.valor("cpFiltroFornecedor").toLowerCase();
    const categoria = this.valor("cpFiltroCategoria").toLowerCase();
    const dtIni = this.valor("cpVencimentoInicio");
    const dtFim = this.valor("cpVencimentoFim");

    this.filtrados = this.dados.filter((item) => {
      const texto = `
        ${item.fornecedor || ""}
        ${item.documento || ""}
        ${item.categoria || ""}
        ${item.descricao || ""}
      `.toLowerCase();

      if (busca && !texto.includes(busca)) return false;
      if (
        fornecedor &&
        !(item.fornecedor || "").toLowerCase().includes(fornecedor)
      ) return false;

      if (
        categoria &&
        !(item.categoria || "").toLowerCase().includes(categoria)
      ) return false;

      if (dtIni && item.vencimento < dtIni) return false;
      if (dtFim && item.vencimento > dtFim) return false;

      return true;
    });

    this.renderizar();
    this.resumo();
  },

  limparFiltros() {
    [
      "cpBusca",
      "cpFiltroFornecedor",
      "cpFiltroCategoria",
      "cpVencimentoInicio",
      "cpVencimentoFim"
    ].forEach((id) => this.set(id, ""));

    this.filtrados = [...this.dados];

    this.renderizar();
    this.resumo();
  },

  limparFormulario() {
    [
      "cpFornecedor",
      "cpDocumento",
      "cpCategoria",
      "cpVencimento",
      "cpValor",
      "cpNfe",
      "cpDescricao"
    ].forEach((id) => this.set(id, ""));

    this.set("cpBoleto", "false");

    this.editandoId = null;
  },

  montarPayload() {
    return {
      fornecedor: this.valor("cpFornecedor").trim(),
      documento: this.valor("cpDocumento").trim(),
      categoria: this.valor("cpCategoria").trim(),
      vencimento: this.valor("cpVencimento") || null,
      valor: this.numero(this.valor("cpValor")),
      descricao: this.valor("cpDescricao").trim(),
      tem_nfe: this.valor("cpNfe").trim() !== "",
      tem_boleto: this.valor("cpBoleto") === "true",
      status: "pendente"
    };
  },

  async salvar() {
    try {
      const payload = this.montarPayload();

      if (!payload.fornecedor) {
        alert("Informe o fornecedor.");
        return;
      }

      if (!payload.valor || payload.valor <= 0) {
        alert("Informe o valor.");
        return;
      }

      if (this.editandoId) {
        await api.update("contas_pagar", this.editandoId, payload);
      } else {
        await api.insert("contas_pagar", payload);
      }

      this.limparFormulario();
      await this.listar();

    } catch (error) {
      console.error(error);
      alert("Erro ao salvar conta.");
    }
  },

  editar(id) {
    const item = this.dados.find(
      (x) => Number(x.id) === Number(id)
    );

    if (!item) return;

    this.editandoId = id;

    this.set("cpFornecedor", item.fornecedor);
    this.set("cpDocumento", item.documento);
    this.set("cpCategoria", item.categoria);
    this.set("cpVencimento", item.vencimento);
    this.set("cpValor", item.valor);
    this.set("cpDescricao", item.descricao);
    this.set("cpNfe", item.tem_nfe ? "OK" : "");
    this.set("cpBoleto", item.tem_boleto ? "true" : "false");

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  },

  async duplicar(id) {
    try {
      const item = this.dados.find(
        (x) => Number(x.id) === Number(id)
      );

      if (!item) return;

      const novo = {
        fornecedor: item.fornecedor,
        documento: (item.documento || "") + "-COPIA",
        categoria: item.categoria,
        vencimento: item.vencimento,
        valor: item.valor,
        descricao: item.descricao,
        tem_nfe: item.tem_nfe,
        tem_boleto: item.tem_boleto,
        status: "pendente"
      };

      await api.insert("contas_pagar", novo);
      await this.listar();

    } catch (error) {
      alert("Erro ao duplicar.");
    }
  },

  async excluir(id) {
    if (!confirm("Deseja excluir esta conta?")) return;

    try {
      await api.delete("contas_pagar", id);

      this.selecionados.delete(Number(id));

      await this.listar();

    } catch (error) {
      alert("Erro ao excluir.");
    }
  },

  async toggleNfe(id) {
    try {
      const item = this.dados.find(
        (x) => Number(x.id) === Number(id)
      );

      if (!item) return;

      await api.update("contas_pagar", id, {
        tem_nfe: !item.tem_nfe
      });

      await this.listar();

    } catch (error) {
      alert("Erro ao atualizar NFE.");
    }
  },

  async toggleBoleto(id) {
    try {
      const item = this.dados.find(
        (x) => Number(x.id) === Number(id)
      );

      if (!item) return;

      await api.update("contas_pagar", id, {
        tem_boleto: !item.tem_boleto
      });

      await this.listar();

    } catch (error) {
      alert("Erro ao atualizar boleto.");
    }
  },

  async pagar(id) {
    try {
      const item = this.dados.find(
        (x) => Number(x.id) === Number(id)
      );

      if (!item) return;

      const hoje = new Date()
        .toISOString()
        .slice(0, 10);

      const dataPagamento = prompt(
        "Data do pagamento:",
        hoje
      );

      if (!dataPagamento) return;

      const multa = prompt("Multa/Juros:", "0");
      if (multa === null) return;

      const desconto = prompt("Desconto:", "0");
      if (desconto === null) return;

      await api.update("contas_pagar", id, {
        status: "pago",
        data_pagamento: dataPagamento,
        multa: this.numero(multa),
        desconto: this.numero(desconto)
      });

      this.selecionados.delete(Number(id));

      await this.listar();

      if (window.contasPagasModule?.carregar) {
        await contasPagasModule.carregar();
      }

    } catch (error) {
      alert("Erro ao pagar.");
    }
  },

  toggleSelecionado(id, marcado) {
    if (marcado) {
      this.selecionados.add(Number(id));
    } else {
      this.selecionados.delete(Number(id));
    }

    this.renderizar();
    this.resumo();
  },

  selecionarTodos() {
    this.filtrados.forEach((item) =>
      this.selecionados.add(Number(item.id))
    );

    this.renderizar();
    this.resumo();
  },

  limparSelecao() {
    this.selecionados.clear();

    this.renderizar();
    this.resumo();
  },

  async pagarSelecionadas() {
    if (!this.selecionados.size) {
      alert("Nenhuma conta selecionada.");
      return;
    }

    const ids = [...this.selecionados];

    for (const id of ids) {
      await this.pagar(id);
    }

    this.selecionados.clear();

    await this.listar();
  }
};

window.listarContasPagar = () =>
  contasPagarModule.listar();
