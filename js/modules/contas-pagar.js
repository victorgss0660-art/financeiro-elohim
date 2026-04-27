window.contasPagarModule = {
  dados: [],
  filtrados: [],

  async carregar() {
    await this.listar();
  },

  async init() {
    await this.listar();
  },

  numero(v) {
    if (typeof v === "number") return Number.isFinite(v) ? v : 0;
    if (v == null) return 0;

    let txt = String(v).trim();
    if (!txt) return 0;

    txt = txt.replace(/R\$/gi, "").replace(/\s/g, "");

    if (txt.includes(",") && txt.includes(".")) {
      txt = txt.replace(/\./g, "").replace(",", ".");
    } else if (txt.includes(",")) {
      txt = txt.replace(",", ".");
    }

    const n = Number(txt);
    return Number.isFinite(n) ? n : 0;
  },

  moeda(v) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(Number(v || 0));
  },

  getMesAno() {
    if (window.utils?.getMesAno) return utils.getMesAno();

    return {
      mes: document.getElementById("mesSelect")?.value || "Janeiro",
      ano: String(document.getElementById("anoSelect")?.value || new Date().getFullYear())
    };
  },

  getValor(id) {
    return document.getElementById(id)?.value || "";
  },

  getChecked(id) {
    return Boolean(document.getElementById(id)?.checked);
  },

  setValor(id, valor) {
    const el = document.getElementById(id);
    if (el) el.value = valor ?? "";
  },

  limparFormulario() {
    [
      "cpFornecedor",
      "cpCategoria",
      "cpValor",
      "cpDocumento",
      "cpDescricao",
      "cpVencimento",
      "cpObservacoes",
      "cpPedido",
      "cpNfe",
      "cpFat"
    ].forEach(id => this.setValor(id, ""));

    const boleto = document.getElementById("cpBoleto");
    if (boleto) boleto.checked = false;
  },

  montarPayload() {
    const { mes, ano } = this.getMesAno();

    const fornecedor =
      this.getValor("cpFornecedor") ||
      this.getValor("pagarFornecedor") ||
      this.getValor("fornecedor");

    const categoria =
      this.getValor("cpCategoria") ||
      this.getValor("pagarCategoria") ||
      this.getValor("categoria");

    const valor =
      this.getValor("cpValor") ||
      this.getValor("pagarValor") ||
      this.getValor("valor");

    const documento =
      this.getValor("cpDocumento") ||
      this.getValor("pagarDocumento") ||
      this.getValor("documento") ||
      this.getValor("cpNfe");

    const descricao =
      this.getValor("cpDescricao") ||
      this.getValor("pagarDescricao") ||
      this.getValor("descricao");

    const vencimento =
      this.getValor("cpVencimento") ||
      this.getValor("pagarVencimento") ||
      this.getValor("vencimento");

    const observacoes =
      this.getValor("cpObservacoes") ||
      this.getValor("pagarObservacoes") ||
      this.getValor("observacoes");

    const boleto =
      this.getChecked("cpBoleto") ||
      this.getChecked("pagarBoleto") ||
      this.getChecked("boleto");

    return {
      mes,
      ano: String(ano),
      fornecedor: fornecedor.trim(),
      categoria: categoria.trim(),
      documento: documento.trim(),
      descricao: descricao.trim(),
      vencimento: vencimento || null,
      valor: this.numero(valor),
      boleto_recebido: boleto,
      observacoes: observacoes.trim(),
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
        alert("Informe um valor válido.");
        return;
      }

      await api.insert("contas_pagar", payload);

      alert("Conta a pagar salva com sucesso.");
      this.limparFormulario();
      await this.listar();
    } catch (error) {
      console.error("Erro ao salvar conta a pagar:", error);
      alert("Erro ao salvar conta a pagar: " + error.message);
    }
  },

  async listar() {
    try {
      const { mes, ano } = this.getMesAno();

      let dados = [];

      try {
        dados = await api.select("contas_pagar", {
          mes,
          ano: String(ano)
        });
      } catch (e) {
        dados = await api.restGet(
          "contas_pagar",
          `select=*&ano=eq.${encodeURIComponent(String(ano))}&mes=eq.${encodeURIComponent(mes)}&order=vencimento.asc`
        );
      }

      this.dados = Array.isArray(dados) ? dados : [];
      this.filtrados = [...this.dados];

      this.renderizar();
      this.atualizarResumo();
      this.preencherFiltros();
    } catch (error) {
      console.error("Erro ao listar contas a pagar:", error);

      if (window.utils?.setAppMsg) {
        utils.setAppMsg("Erro ao carregar contas a pagar: " + error.message, "err");
      }
    }
  },

  preencherFiltros() {
    this.preencherSelectFiltro("filtroFornecedorPagar", "fornecedor");
    this.preencherSelectFiltro("filtroCategoriaPagar", "categoria");
    this.preencherSelectFiltro("cpFiltroFornecedor", "fornecedor");
    this.preencherSelectFiltro("cpFiltroCategoria", "categoria");
  },

  preencherSelectFiltro(id, campo) {
    const select = document.getElementById(id);
    if (!select) return;

    const atual = select.value;

    const valores = [...new Set(
      this.dados
        .map(item => item[campo])
        .filter(Boolean)
        .map(v => String(v).trim())
    )].sort();

    select.innerHTML = `<option value="">Todos</option>` +
      valores.map(v => `<option value="${v}">${v}</option>`).join("");

    select.value = atual;
  },

  aplicarFiltros() {
    const busca =
      this.getValor("buscaContasPagar") ||
      this.getValor("cpBusca") ||
      this.getValor("filtroBuscaPagar");

    const fornecedor =
      this.getValor("filtroFornecedorPagar") ||
      this.getValor("cpFiltroFornecedor");

    const categoria =
      this.getValor("filtroCategoriaPagar") ||
      this.getValor("cpFiltroCategoria");

    const texto = String(busca || "").toLowerCase().trim();

    this.filtrados = this.dados.filter(item => {
      const bateBusca =
        !texto ||
        String(item.fornecedor || "").toLowerCase().includes(texto) ||
        String(item.documento || "").toLowerCase().includes(texto) ||
        String(item.descricao || "").toLowerCase().includes(texto) ||
        String(item.categoria || "").toLowerCase().includes(texto);

      const bateFornecedor =
        !fornecedor || String(item.fornecedor || "") === fornecedor;

      const bateCategoria =
        !categoria || String(item.categoria || "") === categoria;

      return bateBusca && bateFornecedor && bateCategoria;
    });

    this.renderizar();
    this.atualizarResumo();
  },

  renderizar() {
    const tbody =
      document.getElementById("tabelaContasPagar") ||
      document.getElementById("contasPagarTabela") ||
      document.getElementById("cpTabela") ||
      document.querySelector("#tab-contas-pagar tbody");

    if (!tbody) return;

    if (!this.filtrados.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10" class="muted">Nenhuma conta a pagar encontrada.</td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = this.filtrados.map(item => `
      <tr>
        <td>${item.fornecedor || "-"}</td>
        <td>${item.documento || item.nfe || item.numero_nf || "-"}</td>
        <td>${item.categoria || "-"}</td>
        <td>${item.descricao || "-"}</td>
        <td>${this.moeda(item.valor || 0)}</td>
        <td>${item.vencimento || "-"}</td>
        <td>${item.boleto_recebido ? "Sim" : "Não"}</td>
        <td>${item.status || "pendente"}</td>
        <td>${item.observacoes || "-"}</td>
        <td>
          <button class="secondary-btn" onclick="contasPagarModule.marcarPago(${item.id})">
            Pagar
          </button>
          <button class="secondary-btn" onclick="contasPagarModule.excluir(${item.id})">
            Excluir
          </button>
        </td>
      </tr>
    `).join("");
  },

  atualizarResumo() {
    const qtd = this.filtrados.length;
    const total = this.filtrados.reduce((acc, item) => acc + this.numero(item.valor), 0);

    const qtdEl =
      document.getElementById("qtdContasPagar") ||
      document.getElementById("cpQtd");

    const totalEl =
      document.getElementById("totalContasPagar") ||
      document.getElementById("cpTotal");

    if (qtdEl) qtdEl.textContent = qtd;
    if (totalEl) totalEl.textContent = this.moeda(total);
  },

  async marcarPago(id) {
    try {
      const item = this.dados.find(i => Number(i.id) === Number(id));
      if (!item) return;

      const hoje = new Date().toISOString().slice(0, 10);

      await api.update("contas_pagar", id, {
        status: "pago",
        data_pagamento: hoje
      });

      try {
        await api.insert("contas_pagas", {
          mes: item.mes,
          ano: String(item.ano),
          fornecedor: item.fornecedor,
          categoria: item.categoria,
          documento: item.documento,
          descricao: item.descricao,
          valor: item.valor,
          vencimento: item.vencimento,
          data_pagamento: hoje,
          boleto_recebido: item.boleto_recebido,
          observacoes: item.observacoes,
          status: "pago"
        });
      } catch (e) {
        console.warn("Conta marcada como paga, mas não duplicou em contas_pagas:", e);
      }

      await this.listar();
    } catch (error) {
      console.error("Erro ao marcar como pago:", error);
      alert("Erro ao marcar como pago: " + error.message);
    }
  },

  async excluir(id) {
    if (!confirm("Deseja excluir esta conta a pagar?")) return;

    try {
      if (typeof api.delete === "function") {
        await api.delete("contas_pagar", id);
      } else if (typeof api.remove === "function") {
        await api.remove("contas_pagar", id);
      } else {
        await api.restDelete?.("contas_pagar", id);
      }

      await this.listar();
    } catch (error) {
      console.error("Erro ao excluir conta:", error);
      alert("Erro ao excluir conta: " + error.message);
    }
  },

  exportar() {
    const linhas = [
      [
        "fornecedor",
        "documento",
        "categoria",
        "descricao",
        "valor",
        "vencimento",
        "boleto_recebido",
        "status",
        "observacoes",
        "mes",
        "ano"
      ],
      ...this.filtrados.map(item => [
        item.fornecedor || "",
        item.documento || "",
        item.categoria || "",
        item.descricao || "",
        item.valor || 0,
        item.vencimento || "",
        item.boleto_recebido ? "Sim" : "Não",
        item.status || "",
        item.observacoes || "",
        item.mes || "",
        item.ano || ""
      ])
    ];

    const csv = linhas
      .map(linha => linha.map(campo => `"${String(campo).replace(/"/g, '""')}"`).join(";"))
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;"
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = "contas-a-pagar.csv";
    a.click();

    URL.revokeObjectURL(url);
  },

  async importarArquivo(input) {
    const file = input?.files?.[0];
    if (!file) return;

    alert("Importação por Excel/CSV será tratada pelo módulo de importação. Use a aba Importar Despesas.");
  }
};

window.salvarContaPagar = () => contasPagarModule.salvar();
window.listarContasPagar = () => contasPagarModule.listar();
window.filtrarContasPagar = () => contasPagarModule.aplicarFiltros();
window.exportarContasPagar = () => contasPagarModule.exportar();
