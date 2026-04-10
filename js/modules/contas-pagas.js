window.contasPagasModule = {
  lista: [],

  async carregarContasPagas() {
    try {
      const data = await api.restGet(
        "contas_pagar",
        "select=*&status=eq.pago&order=data_pagamento.desc"
      );

      this.lista = Array.isArray(data) ? data : [];
      this.preencherFiltros();
      this.render();
    } catch (e) {
      utils.setAppMsg("Erro ao carregar contas pagas", "err");
    }
  },

  getFiltros() {
    return {
      busca: document.getElementById("filtroBuscaPagas")?.value.toLowerCase() || "",
      fornecedor: document.getElementById("filtroFornecedorPagas")?.value || "",
      categoria: document.getElementById("filtroCategoriaPagas")?.value || "",
      inicio: document.getElementById("filtroDataInicioPagas")?.value || "",
      fim: document.getElementById("filtroDataFimPagas")?.value || ""
    };
  },

  limparFiltros() {
    [
      "filtroBuscaPagas",
      "filtroFornecedorPagas",
      "filtroCategoriaPagas",
      "filtroDataInicioPagas",
      "filtroDataFimPagas"
    ].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });

    this.render();
  },

  preencherFiltros() {
    const fornecedores = [...new Set(this.lista.map(i => i.fornecedor))];
    const categorias = [...new Set(this.lista.map(i => i.categoria))];

    document.getElementById("filtroFornecedorPagas").innerHTML =
      `<option value="">Fornecedor</option>` +
      fornecedores.map(f => `<option>${f}</option>`).join("");

    document.getElementById("filtroCategoriaPagas").innerHTML =
      `<option value="">Categoria</option>` +
      categorias.map(c => `<option>${c}</option>`).join("");
  },

  aplicarFiltros() {
    const f = this.getFiltros();

    return this.lista.filter(i => {
      const texto = `${i.fornecedor} ${i.descricao} ${i.documento}`.toLowerCase();

      if (f.busca && !texto.includes(f.busca)) return false;
      if (f.fornecedor && i.fornecedor !== f.fornecedor) return false;
      if (f.categoria && i.categoria !== f.categoria) return false;

      if (f.inicio && i.data_pagamento < f.inicio) return false;
      if (f.fim && i.data_pagamento > f.fim) return false;

      return true;
    });
  },

  atualizarTotais(lista) {
    const total = lista.reduce((acc, i) => acc + Number(i.valor || 0), 0);

    document.getElementById("cpPagasQtd").textContent = lista.length;
    document.getElementById("cpPagasTotal").textContent = utils.moeda(total);
  },

  render() {
    const tbody = document.getElementById("tabelaContasPagas");
    if (!tbody) return;

    const dados = this.aplicarFiltros();
    this.atualizarTotais(dados);

    if (!dados.length) {
      tbody.innerHTML = `<tr><td colspan="9" class="muted">Nenhuma conta paga.</td></tr>`;
      return;
    }

    tbody.innerHTML = dados.map(i => `
      <tr>
        <td>${i.fornecedor}</td>
        <td>${i.descricao}</td>
        <td>${i.categoria}</td>
        <td>${i.documento}</td>
        <td>${utils.moeda(i.valor)}</td>
        <td>${i.data_pagamento || "-"}</td>
        <td>${utils.moeda(i.multa || 0)}</td>
        <td>${utils.moeda(i.desconto || 0)}</td>
        <td>${utils.moeda((i.valor || 0) + (i.multa || 0) - (i.desconto || 0))}</td>
      </tr>
    `).join("");
  },

  exportarPlanilha() {
    const dados = this.lista.map(i => ({
      fornecedor: i.fornecedor,
      descricao: i.descricao,
      valor: i.valor,
      pago_em: i.data_pagamento
    }));

    const ws = XLSX.utils.json_to_sheet(dados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pagas");

    XLSX.writeFile(wb, "contas_pagas.xlsx");
  }
};
