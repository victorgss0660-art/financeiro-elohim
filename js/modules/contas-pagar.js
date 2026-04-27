window.contasPagarModule = {
  dados: [],
  filtrados: [],
  selecionados: new Set(),
  editandoId: null,

  async carregar() {
    await this.listar();
  },

  async init() {
    await this.listar();
  },

  getMesAno() {
    if (window.utils?.getMesAno) return utils.getMesAno();

    return {
      mes: document.getElementById("mesSelect")?.value || "Janeiro",
      ano: String(document.getElementById("anoSelect")?.value || new Date().getFullYear())
    };
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

  dataBR(data) {
    if (!data) return "-";
    const d = new Date(String(data) + "T00:00:00");
    if (Number.isNaN(d.getTime())) return data;
    return d.toLocaleDateString("pt-BR");
  },

  getValor(id) {
    return document.getElementById(id)?.value || "";
  },

  setValor(id, valor) {
    const el = document.getElementById(id);
    if (el) el.value = valor ?? "";
  },

  getChecked(id) {
    return Boolean(document.getElementById(id)?.checked);
  },

  setChecked(id, valor) {
    const el = document.getElementById(id);
    if (el) el.checked = Boolean(valor);
  },

  limparFormulario() {
    this.editandoId = null;

    [
      "cpFornecedor",
      "cpDocumento",
      "cpCategoria",
      "cpDescricao",
      "cpValor",
      "cpVencimento",
      "cpObservacoes",
      "cpPedido",
      "cpNfe",
      "cpFat",
      "pagarFornecedor",
      "pagarDocumento",
      "pagarCategoria",
      "pagarDescricao",
      "pagarValor",
      "pagarVencimento",
      "pagarObservacoes"
    ].forEach(id => this.setValor(id, ""));

    ["cpBoleto", "pagarBoleto", "boleto"].forEach(id => this.setChecked(id, false));

    const btn = document.getElementById("btnSalvarContaPagar");
    if (btn) btn.textContent = "Salvar conta";
  },

  montarPayload() {
    const { mes, ano } = this.getMesAno();

    const fornecedor =
      this.getValor("cpFornecedor") ||
      this.getValor("pagarFornecedor") ||
      this.getValor("fornecedor");

    const documento =
      this.getValor("cpDocumento") ||
      this.getValor("pagarDocumento") ||
      this.getValor("documento") ||
      this.getValor("cpNfe");

    const categoria =
      this.getValor("cpCategoria") ||
      this.getValor("pagarCategoria") ||
      this.getValor("categoria");

    const descricao =
      this.getValor("cpDescricao") ||
      this.getValor("pagarDescricao") ||
      this.getValor("descricao");

    const valor =
      this.getValor("cpValor") ||
      this.getValor("pagarValor") ||
      this.getValor("valor");

    const vencimento =
      this.getValor("cpVencimento") ||
      this.getValor("pagarVencimento") ||
      this.getValor("vencimento");

    const observacoes =
      this.getValor("cpObservacoes") ||
      this.getValor("pagarObservacoes") ||
      this.getValor("observacoes");

    const pedido =
      this.getValor("cpPedido") ||
      this.getValor("pedido") ||
      "";

    const nfe =
      this.getValor("cpNfe") ||
      this.getValor("nfe") ||
      documento ||
      "";

    const fat =
      this.getValor("cpFat") ||
      this.getValor("fat") ||
      "";

    const boleto =
      this.getChecked("cpBoleto") ||
      this.getChecked("pagarBoleto") ||
      this.getChecked("boleto");

    return {
      mes,
      ano: String(ano),
      fornecedor: fornecedor.trim(),
      documento: documento.trim(),
      categoria: categoria.trim(),
      descricao: descricao.trim(),
      valor: this.numero(valor),
      vencimento: vencimento || null,
      observacoes: observacoes.trim(),
      pedido: pedido.trim(),
      nfe: nfe.trim(),
      fat: fat.trim(),
      boleto_recebido: boleto,
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

      if (this.editandoId) {
        await api.update("contas_pagar", this.editandoId, payload);
        alert("Conta atualizada com sucesso.");
      } else {
        await api.insert("contas_pagar", payload);
        alert("Conta salva com sucesso.");
      }

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

      this.preencherFiltros();
      this.renderizar();
      this.atualizarResumo();
    } catch (error) {
      console.error("Erro ao listar contas a pagar:", error);
      alert("Erro ao carregar contas a pagar: " + error.message);
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

    select.innerHTML =
      `<option value="">Todos</option>` +
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
        String(item.categoria || "").toLowerCase().includes(texto) ||
        String(item.nfe || "").toLowerCase().includes(texto) ||
        String(item.fat || "").toLowerCase().includes(texto) ||
        String(item.pedido || "").toLowerCase().includes(texto);

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

  const lista = Array.isArray(this.filtrados) ? this.filtrados : [];

  if (lista.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7">Nenhuma conta encontrada.</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = lista.map(item => {
    const id = Number(item.id || 0);

    const fornecedor = item.fornecedor || "-";
    const documento = item.documento || "-";
    const valor = this.moeda(item.valor || 0);
    const categoria = item.categoria || "-";
    const vencimento = this.dataBR(item.vencimento);
    const boletoOk = Boolean(item.boleto_recebido);
    const nfeOk = Boolean(item.nfe || item.documento);

    return `
      <tr>
        <td><strong>${fornecedor}</strong></td>
        <td>${documento}</td>
        <td><strong>${valor}</strong></td>
        <td>${categoria}</td>
        <td>${vencimento}</td>

        <td>
          <button class="doc-btn ${nfeOk ? "ok" : "warn"}"
            onclick="contasPagarModule.marcarNfe(${id})">
            NFE
          </button>

          <button class="doc-btn ${boletoOk ? "ok" : "warn"}"
            onclick="contasPagarModule.marcarBoleto(${id})">
            Boleto
          </button>
        </td>

        <td>
          <button class="secondary-btn mini action-btn-blue"
            onclick="contasPagarModule.editar(${id})">Editar</button>

          <button class="secondary-btn mini"
            onclick="contasPagarModule.duplicar(${id})">Duplicar</button>

          <button class="secondary-btn mini action-btn-green"
            onclick="contasPagarModule.marcarPago(${id})">Pagar</button>

          <button class="secondary-btn mini action-btn-red"
            onclick="contasPagarModule.excluir(${id})">Excluir</button>
        </td>
      </tr>
    `;
  }).join("");
}

  toggleSelecionado(id, marcado) {
    id = Number(id);

    if (marcado) {
      this.selecionados.add(id);
    } else {
      this.selecionados.delete(id);
    }

    this.renderizar();
    this.atualizarResumo();
  },

  selecionar(id) {
    id = Number(id);

    if (this.selecionados.has(id)) {
      this.selecionados.delete(id);
    } else {
      this.selecionados.add(id);
    }

    this.renderizar();
    this.atualizarResumo();
  },

  selecionarTodos() {
    this.filtrados.forEach(item => this.selecionados.add(Number(item.id)));
    this.renderizar();
    this.atualizarResumo();
  },

  limparSelecao() {
    this.selecionados.clear();
    this.renderizar();
    this.atualizarResumo();
  },

  editar(id) {
    const item = this.dados.find(i => Number(i.id) === Number(id));
    if (!item) return;

    this.editandoId = Number(id);

    this.setValor("cpFornecedor", item.fornecedor || "");
    this.setValor("cpDocumento", item.documento || "");
    this.setValor("cpCategoria", item.categoria || "");
    this.setValor("cpDescricao", item.descricao || "");
    this.setValor("cpValor", item.valor || "");
    this.setValor("cpVencimento", item.vencimento || "");
    this.setValor("cpObservacoes", item.observacoes || "");
    this.setValor("cpPedido", item.pedido || "");
    this.setValor("cpNfe", item.nfe || "");
    this.setValor("cpFat", item.fat || "");
    this.setChecked("cpBoleto", item.boleto_recebido);

    this.setValor("pagarFornecedor", item.fornecedor || "");
    this.setValor("pagarDocumento", item.documento || "");
    this.setValor("pagarCategoria", item.categoria || "");
    this.setValor("pagarDescricao", item.descricao || "");
    this.setValor("pagarValor", item.valor || "");
    this.setValor("pagarVencimento", item.vencimento || "");
    this.setValor("pagarObservacoes", item.observacoes || "");
    this.setChecked("pagarBoleto", item.boleto_recebido);

    const btn = document.getElementById("btnSalvarContaPagar");
    if (btn) btn.textContent = "Atualizar conta";

    window.scrollTo({ top: 0, behavior: "smooth" });
  },

  async duplicar(id) {
    try {
      const item = this.dados.find(i => Number(i.id) === Number(id));
      if (!item) return;

      const copia = { ...item };
      delete copia.id;
      delete copia.created_at;
      delete copia.updated_at;

      copia.status = "pendente";
      copia.documento = copia.documento ? `${copia.documento}-CÓPIA` : "CÓPIA";

      await api.insert("contas_pagar", copia);

      alert("Conta duplicada com sucesso.");
      await this.listar();
    } catch (error) {
      console.error("Erro ao duplicar:", error);
      alert("Erro ao duplicar: " + error.message);
    }
  },

  async marcarNfe(id) {
    try {
      const item = this.dados.find(i => Number(i.id) === Number(id));
      if (!item) return;

      const nfeAtual = item.nfe || item.documento || "";
      const novaNfe = prompt("Informe o número da NFE:", nfeAtual);

      if (novaNfe === null) return;

      await api.update("contas_pagar", id, {
        nfe: novaNfe.trim(),
        documento: item.documento || novaNfe.trim()
      });

      await this.listar();
    } catch (error) {
      console.error("Erro ao marcar NFE:", error);
      alert("Erro ao marcar NFE: " + error.message);
    }
  },

  async marcarBoleto(id) {
    try {
      const item = this.dados.find(i => Number(i.id) === Number(id));
      if (!item) return;

      await api.update("contas_pagar", id, {
        boleto_recebido: !Boolean(item.boleto_recebido)
      });

      await this.listar();
    } catch (error) {
      console.error("Erro ao marcar boleto:", error);
      alert("Erro ao marcar boleto: " + error.message);
    }
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
          pedido: item.pedido,
          nfe: item.nfe,
          fat: item.fat,
          observacoes: item.observacoes,
          status: "pago"
        });
      } catch (e) {
        console.warn("Marcada como paga, mas não copiou para contas_pagas:", e);
      }

      await this.listar();
    } catch (error) {
      console.error("Erro ao marcar como pago:", error);
      alert("Erro ao marcar como pago: " + error.message);
    }
  },

  async pagarSelecionadas() {
    if (!this.selecionados.size) {
      alert("Nenhuma conta selecionada.");
      return;
    }

    if (!confirm(`Deseja marcar ${this.selecionados.size} conta(s) como paga(s)?`)) return;

    const ids = Array.from(this.selecionados);

    for (const id of ids) {
      await this.marcarPago(id);
    }

    this.selecionados.clear();
    await this.listar();
  },

  async excluir(id) {
    if (!confirm("Deseja excluir esta conta a pagar?")) return;

    try {
      if (typeof api.delete === "function") {
        await api.delete("contas_pagar", id);
      } else if (typeof api.remove === "function") {
        await api.remove("contas_pagar", id);
      } else if (typeof api.restDelete === "function") {
        await api.restDelete("contas_pagar", id);
      } else {
        throw new Error("Nenhuma função de exclusão encontrada no api.");
      }

      this.selecionados.delete(Number(id));
      await this.listar();
    } catch (error) {
      console.error("Erro ao excluir:", error);
      alert("Erro ao excluir: " + error.message);
    }
  },

  async excluirSelecionados() {
    if (!this.selecionados.size) {
      alert("Nenhuma conta selecionada.");
      return;
    }

    if (!confirm(`Excluir ${this.selecionados.size} conta(s) selecionada(s)?`)) return;

    const ids = Array.from(this.selecionados);

    for (const id of ids) {
      try {
        if (typeof api.delete === "function") {
          await api.delete("contas_pagar", id);
        } else if (typeof api.remove === "function") {
          await api.remove("contas_pagar", id);
        } else if (typeof api.restDelete === "function") {
          await api.restDelete("contas_pagar", id);
        }
      } catch (e) {
        console.warn("Erro ao excluir item:", id, e);
      }
    }

    this.selecionados.clear();
    await this.listar();
  },

  atualizarResumo() {
    const qtd = this.filtrados.length;
    const total = this.filtrados.reduce((acc, item) => acc + this.numero(item.valor), 0);
    const selecionados = this.filtrados.filter(i => this.selecionados.has(Number(i.id)));
    const totalSelecionado = selecionados.reduce((acc, item) => acc + this.numero(item.valor), 0);

    const qtdEl =
      document.getElementById("qtdContasPagar") ||
      document.getElementById("cpQtd");

    const totalEl =
      document.getElementById("totalContasPagar") ||
      document.getElementById("cpTotal");

    const selecionadosEl =
      document.getElementById("qtdSelecionadasPagar") ||
      document.getElementById("cpSelecionadas");

    const totalSelecionadoEl =
      document.getElementById("totalSelecionadoPagar") ||
      document.getElementById("cpTotalSelecionado");

    if (qtdEl) qtdEl.textContent = qtd;
    if (totalEl) totalEl.textContent = this.moeda(total);
    if (selecionadosEl) selecionadosEl.textContent = selecionados.length;
    if (totalSelecionadoEl) totalSelecionadoEl.textContent = this.moeda(totalSelecionado);
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
        "nfe",
        "pedido",
        "fat",
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
        item.nfe || "",
        item.pedido || "",
        item.fat || "",
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

    alert("Use a aba Importar Despesas para importar planilhas.");
  }
};

window.salvarContaPagar = () => contasPagarModule.salvar();
window.listarContasPagar = () => contasPagarModule.listar();
window.filtrarContasPagar = () => contasPagarModule.aplicarFiltros();
window.exportarContasPagar = () => contasPagarModule.exportar();
window.selecionarTodasContasPagar = () => contasPagarModule.selecionarTodos();
window.limparSelecaoContasPagar = () => contasPagarModule.limparSelecao();
window.excluirSelecionadasContasPagar = () => contasPagarModule.excluirSelecionados();
window.pagarSelecionadasContasPagar = () => contasPagarModule.pagarSelecionadas();
