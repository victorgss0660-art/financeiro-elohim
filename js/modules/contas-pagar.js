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
    if (valor === null || valor === undefined || valor === "") return 0;

    let txt = String(valor).trim();
    txt = txt.replace(/R\$/g, "").replace(/\s/g, "");

    const temVirgula = txt.includes(",");
    const temPonto = txt.includes(".");

    if (temVirgula && temPonto) {
      txt = txt.replace(/\./g, "").replace(",", ".");
    } else if (temVirgula && !temPonto) {
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

toggleInput(tipo) {
  if (!this.inputs) {
    this.inputs = { nfe: false, boleto: false };
  }

  this.inputs[tipo] = !this.inputs[tipo];

  const btn = document.getElementById(tipo === "nfe" ? "btnNfe" : "btnBoleto");
  if (!btn) return;

  const texto = btn.querySelector(".toggle-text");

  if (this.inputs[tipo]) {
    btn.classList.add("ativo");
    texto.textContent = tipo === "nfe" ? "NFE recebida" : "Boleto recebido";
  } else {
    btn.classList.remove("ativo");
    texto.textContent = tipo === "nfe" ? "Não recebida" : "Não recebido";
  }
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
      const dados = await api.restGet("contas_pagar", "select=*&order=vencimento.asc");

      this.dados = Array.isArray(dados)
        ? dados.filter(item => String(item.status || "pendente").toLowerCase() !== "pago")
        : [];

      this.filtrados = [...this.dados];
      this.renderizar();
    } catch (error) {
      console.error(error);
      alert("Erro ao carregar contas a pagar.");
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

  resumo() {
    const soma = this.filtrados.reduce((acc, item) => acc + this.numero(item.valor), 0);

    const selecionadas = this.filtrados.filter(item =>
      this.selecionados.has(Number(item.id))
    );

    const somaSel = selecionadas.reduce((acc, item) => acc + this.numero(item.valor), 0);

    if (this.get("cpQtd")) this.get("cpQtd").textContent = this.filtrados.length;
    if (this.get("cpTotal")) this.get("cpTotal").textContent = this.moeda(soma);
    if (this.get("cpSelecionadas")) this.get("cpSelecionadas").textContent = selecionadas.length;
    if (this.get("cpTotalSelecionado")) this.get("cpTotalSelecionado").textContent = this.moeda(somaSel);
  },

  aplicarFiltros() {
    const busca = this.valor("cpBusca").toLowerCase();
    const fornecedor = this.valor("cpFiltroFornecedor").toLowerCase();
    const categoria = this.valor("cpFiltroCategoria").toLowerCase();
    const dtIni = this.valor("cpVencimentoInicio");
    const dtFim = this.valor("cpVencimentoFim");

    this.filtrados = this.dados.filter(item => {
      const texto = `
        ${item.fornecedor || ""}
        ${item.documento || ""}
        ${item.categoria || ""}
        ${item.descricao || ""}
      `.toLowerCase();

      if (busca && !texto.includes(busca)) return false;
      if (fornecedor && !(item.fornecedor || "").toLowerCase().includes(fornecedor)) return false;
      if (categoria && !(item.categoria || "").toLowerCase().includes(categoria)) return false;
      if (dtIni && item.vencimento < dtIni) return false;
      if (dtFim && item.vencimento > dtFim) return false;

      return true;
    });

    this.renderizar();
  },

  limparFiltros() {
    ["cpBusca", "cpFiltroFornecedor", "cpFiltroCategoria", "cpVencimentoInicio", "cpVencimentoFim"]
      .forEach(id => this.set(id, ""));

    this.filtrados = [...this.dados];
    this.renderizar();
  },

  limparFormulario() {
    ["cpFornecedor", "cpDocumento", "cpCategoria", "cpVencimento", "cpValor", "cpNfe", "cpDescricao"]
      .forEach(id => this.set(id, ""));

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
      tem_nfe: this.valor("cpNfe") !== "",
      tem_boleto: this.valor("cpBoleto") === "true",
      status: "pendente"
    };
  },

  async salvar() {
    try {
      const payload = this.montarPayload();

      if (!payload.fornecedor) {
        alert("Informe fornecedor.");
        return;
      }

      if (!payload.valor || payload.valor <= 0) {
        alert("Informe valor.");
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
      alert("Erro ao salvar.");
    }
  },

  editar(id) {
    const item = this.dados.find(x => Number(x.id) === Number(id));
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

    window.scrollTo({ top: 0, behavior: "smooth" });
  },

  async duplicar(id) {
    try {
      const item = this.dados.find(x => Number(x.id) === Number(id));
      if (!item) return;

      await api.insert("contas_pagar", {
        fornecedor: item.fornecedor,
        documento: (item.documento || "") + "-COPIA",
        categoria: item.categoria,
        vencimento: item.vencimento,
        valor: this.numero(item.valor),
        descricao: item.descricao,
        tem_nfe: item.tem_nfe,
        tem_boleto: item.tem_boleto,
        status: "pendente"
      });

      await this.listar();
    } catch (error) {
      console.error(error);
      alert("Erro ao duplicar.");
    }
  },

  async excluir(id) {
    if (!confirm("Excluir conta?")) return;

    try {
      await api.delete("contas_pagar", id);
      this.selecionados.delete(Number(id));
      await this.listar();
    } catch (error) {
      console.error(error);
      alert("Erro ao excluir.");
    }
  },

  async toggleNfe(id) {
    try {
      const item = this.dados.find(x => Number(x.id) === Number(id));
      if (!item) return;

      await api.update("contas_pagar", id, { tem_nfe: !item.tem_nfe });
      await this.listar();
    } catch (error) {
      alert("Erro NFE.");
    }
  },

  async toggleBoleto(id) {
    try {
      const item = this.dados.find(x => Number(x.id) === Number(id));
      if (!item) return;

      await api.update("contas_pagar", id, { tem_boleto: !item.tem_boleto });
      await this.listar();
    } catch (error) {
      alert("Erro boleto.");
    }
  },

  async pagar(id) {
    try {
      const hoje = new Date().toISOString().slice(0, 10);

      const dataPagamento = prompt("Data pagamento:", hoje);
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
        contasPagasModule.carregar();
      }
    } catch (error) {
      console.error(error);
      alert("Erro ao pagar.");
    }
  },

  toggleSelecionado(id, marcado) {
    if (marcado) this.selecionados.add(Number(id));
    else this.selecionados.delete(Number(id));

    this.renderizar();
  },

  selecionarTodos() {
    this.filtrados.forEach(item => this.selecionados.add(Number(item.id)));
    this.renderizar();
  },

  limparSelecao() {
    this.selecionados.clear();
    this.renderizar();
  },

  async pagarSelecionadas() {
    const ids = [...this.selecionados];

    if (!ids.length) {
      alert("Nenhuma selecionada.");
      return;
    }

    const contas = this.filtrados.filter(item => ids.includes(Number(item.id)));
    const totalOriginal = contas.reduce((acc, item) => acc + this.numero(item.valor), 0);
    const hoje = new Date().toISOString().slice(0, 10);

    const dataPagamento = prompt(
      `Data do pagamento para ${contas.length} conta(s):\nTotal original: ${this.moeda(totalOriginal)}`,
      hoje
    );

    if (!dataPagamento) return;

    const multa = prompt("Multa/Juros total:", "0");
    if (multa === null) return;

    const desconto = prompt("Desconto total:", "0");
    if (desconto === null) return;

    const valorMulta = this.numero(multa);
    const valorDesconto = this.numero(desconto);

    if (!confirm(
      `Confirmar pagamento?\n\nQuantidade: ${contas.length}\nTotal: ${this.moeda(totalOriginal)}\nMulta/Juros: ${this.moeda(valorMulta)}\nDesconto: ${this.moeda(valorDesconto)}`
    )) return;

    for (const item of contas) {
      await api.update("contas_pagar", item.id, {
        status: "pago",
        data_pagamento: dataPagamento,
        multa: valorMulta / contas.length,
        desconto: valorDesconto / contas.length
      });
    }

    this.selecionados.clear();
    await this.listar();

    if (window.contasPagasModule?.carregar) {
      contasPagasModule.carregar();
    }
  }
};

window.listarContasPagar = () => contasPagarModule.listar();
