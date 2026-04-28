window.contasPagarModule = {
  dados: [],
  filtrados: [],
  selecionados: new Set(),
  editandoId: null,

  async carregar() {
    await this.listar();
  },

  getMesAno() {
    return {
      mes:
        document.getElementById("mesSelect")?.value ||
        new Date().toLocaleString("pt-BR", { month: "long" }),
      ano:
        document.getElementById("anoSelect")?.value ||
        String(new Date().getFullYear())
    };
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
    if (isNaN(d)) return data;

    return d.toLocaleDateString("pt-BR");
  },

  getValor(id) {
    return document.getElementById(id)?.value || "";
  },

  setValor(id, valor) {
    const el = document.getElementById(id);
    if (el) el.value = valor ?? "";
  },

  limparFormulario() {
    this.editandoId = null;

    [
      "cpFornecedor",
      "cpDocumento",
      "cpCategoria",
      "cpVencimento",
      "cpValor",
      "cpNfe",
      "cpDescricao"
    ].forEach((id) => this.setValor(id, ""));

    this.setValor("cpBoleto", "false");
  },

  montarPayload() {
    const { mes, ano } = this.getMesAno();

    return {
      mes,
      ano,
      fornecedor: this.getValor("cpFornecedor").trim(),
      documento: this.getValor("cpDocumento").trim(),
      categoria: this.getValor("cpCategoria").trim(),
      vencimento: this.getValor("cpVencimento") || null,
      valor: this.numero(this.getValor("cpValor")),
      tem_nfe: this.getValor("cpNfe").trim() !== "",
      tem_boleto: this.getValor("cpBoleto") === "true",
      descricao: this.getValor("cpDescricao").trim(),
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

      alert("Conta salva com sucesso.");
    } catch (error) {
      console.error(error);
      alert("Erro ao salvar conta a pagar: " + error.message);
    }
  },

  async listar() {
    try {
      const dados = await api.restGet(
        "contas_pagar",
        "select=*&order=vencimento.asc"
      );

      this.dados = (dados || []).filter(
        (item) => String(item.status || "").toLowerCase() !== "pago"
      );

      this.filtrados = [...this.dados];

      this.renderizar();
      this.atualizarResumo();
    } catch (error) {
      console.error(error);
      alert("Erro ao carregar contas.");
    }
  },

  aplicarFiltros() {
    const busca = this.getValor("cpBusca").toLowerCase();
    const fornecedor = this.getValor("cpFiltroFornecedor").toLowerCase();
    const categoria = this.getValor("cpFiltroCategoria").toLowerCase();
    const dtIni = this.getValor("cpVencimentoInicio");
    const dtFim = this.getValor("cpVencimentoFim");

    this.filtrados = this.dados.filter((item) => {
      const texto = `
        ${item.fornecedor || ""}
        ${item.documento || ""}
        ${item.categoria || ""}
        ${item.descricao || ""}
      `.toLowerCase();

      let ok = true;

      if (busca && !texto.includes(busca)) ok = false;
      if (
        fornecedor &&
        !(item.fornecedor || "").toLowerCase().includes(fornecedor)
      )
        ok = false;

      if (
        categoria &&
        !(item.categoria || "").toLowerCase().includes(categoria)
      )
        ok = false;

      if (dtIni && item.vencimento < dtIni) ok = false;
      if (dtFim && item.vencimento > dtFim) ok = false;

      return ok;
    });

    this.renderizar();
    this.atualizarResumo();
  },

  limparFiltros() {
    [
      "cpBusca",
      "cpFiltroFornecedor",
      "cpFiltroCategoria",
      "cpVencimentoInicio",
      "cpVencimentoFim"
    ].forEach((id) => this.setValor(id, ""));

    this.filtrados = [...this.dados];
    this.renderizar();
    this.atualizarResumo();
  },

  renderizar() {
    const tbody = document.getElementById("tabelaContasPagar");
    if (!tbody) return;

    if (!this.filtrados.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9">Nenhuma conta encontrada.</td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = this.filtrados
      .map((item) => {
        const id = Number(item.id);
        const marcado = this.selecionados.has(id);

        return `
        <tr class="${marcado ? "linha-vermelha" : ""}">
          <td>
            <input type="checkbox"
              ${marcado ? "checked" : ""}
              onchange="contasPagarModule.toggleSelecionado(${id}, this.checked)">
          </td>

          <td>${item.fornecedor || "-"}</td>
          <td>${item.documento || "-"}</td>
          <td>${this.moeda(item.valor)}</td>
          <td>${this.dataBR(item.vencimento)}</td>
          <td>${item.categoria || "-"}</td>
          <td>${item.descricao || "-"}</td>

          <td>
            <button class="doc-btn ${
              item.tem_nfe ? "ok" : "warn"
            }" onclick="contasPagarModule.marcarNfe(${id})">
              ${item.tem_nfe ? "NFE OK" : "NFE"}
            </button>

            <button class="doc-btn ${
              item.tem_boleto ? "ok" : "warn"
            }" onclick="contasPagarModule.marcarBoleto(${id})">
              ${item.tem_boleto ? "Boleto OK" : "Boleto"}
            </button>
          </td>

          <td>
            <button onclick="contasPagarModule.editar(${id})">Editar</button>
            <button onclick="contasPagarModule.duplicar(${id})">Duplicar</button>
            <button onclick="contasPagarModule.marcarPago(${id})">Pagar</button>
            <button onclick="contasPagarModule.excluir(${id})">Excluir</button>
          </td>
        </tr>
      `;
      })
      .join("");
  },

  atualizarResumo() {
    const total = this.filtrados.reduce(
      (acc, item) => acc + this.numero(item.valor),
      0
    );

    const selecionadas = this.filtrados.filter((item) =>
      this.selecionados.has(Number(item.id))
    );

    const totalSel = selecionadas.reduce(
      (acc, item) => acc + this.numero(item.valor),
      0
    );

    const qtd = document.getElementById("cpQtd");
    const totalEl = document.getElementById("cpTotal");
    const qtdSel = document.getElementById("cpSelecionadas");
    const totalSelEl = document.getElementById("cpTotalSelecionado");

    if (qtd) qtd.textContent = this.filtrados.length;
    if (totalEl) totalEl.textContent = this.moeda(total);
    if (qtdSel) qtdSel.textContent = selecionadas.length;
    if (totalSelEl) totalSelEl.textContent = this.moeda(totalSel);
  },

  toggleSelecionado(id, checked) {
    if (checked) this.selecionados.add(Number(id));
    else this.selecionados.delete(Number(id));

    this.renderizar();
    this.atualizarResumo();
  },

  editar(id) {
    const item = this.dados.find((x) => Number(x.id) === Number(id));
    if (!item) return;

    this.editandoId = id;

    this.setValor("cpFornecedor", item.fornecedor);
    this.setValor("cpDocumento", item.documento);
    this.setValor("cpCategoria", item.categoria);
    this.setValor("cpVencimento", item.vencimento);
    this.setValor("cpValor", item.valor);
    this.setValor("cpNfe", item.tem_nfe ? "OK" : "");
    this.setValor("cpBoleto", item.tem_boleto ? "true" : "false");
    this.setValor("cpDescricao", item.descricao);

    window.scrollTo({ top: 0, behavior: "smooth" });
  },

  async duplicar(id) {
    try {
      const item = this.dados.find((x) => Number(x.id) === Number(id));
      if (!item) return;

      const novo = { ...item };
      delete novo.id;
      delete novo.created_at;
      delete novo.updated_at;

      novo.documento = (novo.documento || "") + "-COPIA";
      novo.status = "pendente";

      await api.insert("contas_pagar", novo);
      await this.listar();
    } catch (error) {
      alert("Erro ao duplicar.");
    }
  },

  async marcarNfe(id) {
    try {
      const item = this.dados.find((x) => Number(x.id) === Number(id));

      await api.update("contas_pagar", id, {
        tem_nfe: !item.tem_nfe
      });

      await this.listar();
    } catch (error) {
      alert("Erro ao atualizar NFE.");
    }
  },

  async marcarBoleto(id) {
    try {
      const item = this.dados.find((x) => Number(x.id) === Number(id));

      await api.update("contas_pagar", id, {
        tem_boleto: !item.tem_boleto
      });

      await this.listar();
    } catch (error) {
      alert("Erro ao atualizar boleto.");
    }
  },

async marcarPago(id) {
  try {
    const item = this.dados.find((x) => Number(x.id) === Number(id));
    if (!item) return;

    const hoje = new Date().toISOString().slice(0, 10);

    const dataPagamento = prompt(
      `Data do pagamento:\n\nFornecedor: ${item.fornecedor}\nValor original: ${this.moeda(item.valor)}`,
      hoje
    );

    if (dataPagamento === null) return;

    const jurosMulta = prompt("Informe multa/juros, se houver:", "0");
    if (jurosMulta === null) return;

    const desconto = prompt("Informe desconto, se houver:", "0");
    if (desconto === null) return;

    const valorOriginal = this.numero(item.valor);
    const valorJuros = this.numero(jurosMulta);
    const valorDesconto = this.numero(desconto);
    const valorPago = valorOriginal + valorJuros - valorDesconto;

    const confirmar = confirm(
      `Confirmar pagamento?\n\n` +
      `Fornecedor: ${item.fornecedor || "-"}\n` +
      `Documento: ${item.documento || "-"}\n` +
      `Data pagamento: ${dataPagamento}\n\n` +
      `Valor original: ${this.moeda(valorOriginal)}\n` +
      `Multa/Juros: ${this.moeda(valorJuros)}\n` +
      `Desconto: ${this.moeda(valorDesconto)}\n` +
      `Valor pago: ${this.moeda(valorPago)}`
    );

    if (!confirmar) return;

    await api.update("contas_pagar", id, {
      status: "pago",
      data_pagamento: dataPagamento,
      juros_multa: valorJuros,
      desconto: valorDesconto,
      valor_pago: valorPago
    });

    this.selecionados.delete(Number(id));

    await this.listar();

    if (window.contasPagasModule?.carregar) {
      await contasPagasModule.carregar();
    }

    alert("Conta paga com sucesso.");
  } catch (error) {
    console.error("Erro ao pagar conta:", error);
    alert("Erro ao pagar conta: " + error.message);
  }
}

  async pagarSelecionadas() {
    if (!this.selecionados.size) {
      alert("Nenhuma conta selecionada.");
      return;
    }

    const ok = confirm(
      `Deseja pagar ${this.selecionados.size} conta(s)?`
    );

    if (!ok) return;

    const ids = [...this.selecionados];

    for (const id of ids) {
      await this.marcarPago(id);
    }

    this.selecionados.clear();
    await this.listar();
  },

  async excluir(id) {
    const ok = confirm("Deseja excluir esta conta?");
    if (!ok) return;

    try {
      await api.delete("contas_pagar", id);

      this.selecionados.delete(Number(id));
      await this.listar();
    } catch (error) {
      alert("Erro ao excluir.");
    }
  }
};

window.listarContasPagar = () => contasPagarModule.listar();
