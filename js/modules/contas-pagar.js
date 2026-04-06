window.contasPagarModule = {
  lista: [],
  pagandoId: null,
  contaEditandoId: null,

  filtros: {
    busca: "",
    fornecedor: "",
    categoria: "",
    status: ""
  },

  async salvarContaPagar() {
    try {
      const { mes, ano } = utils.getMesAno();

      const payload = {
        fornecedor: document.getElementById("cpFornecedor").value.trim(),
        descricao: document.getElementById("cpDescricao").value.trim(),
        categoria: document.getElementById("cpCategoria").value.trim(),
        documento: document.getElementById("cpDocumento").value.trim(),
        valor: Number(document.getElementById("cpValor").value || 0),
        vencimento: document.getElementById("cpVencimento").value,
        observacoes: document.getElementById("cpObservacoes").value.trim(),
        status: "pendente",
        mes,
        ano
      };

      if (!payload.fornecedor || !payload.descricao || !payload.valor || !payload.vencimento) {
        utils.setAppMsg("Preencha fornecedor, descrição, valor e vencimento.", "err");
        return;
      }

      if (this.contaEditandoId) {
        await api.restPatch(
          "contas_pagar",
          `id=eq.${this.contaEditandoId}`,
          payload
        );
        utils.setAppMsg("Conta atualizada com sucesso.", "ok");
      } else {
        await api.restInsert("contas_pagar", [payload]);
        utils.setAppMsg("Conta salva com sucesso.", "ok");
      }

      this.cancelarEdicao();
      await this.carregarContasPagar();

      if (window.planejamentoModule?.carregarPlanejamento) {
        await window.planejamentoModule.carregarPlanejamento();
      }
    } catch (e) {
      utils.setAppMsg("Erro ao salvar conta: " + e.message, "err");
    }
  },

  limparFormulario() {
    [
      "cpFornecedor",
      "cpDescricao",
      "cpCategoria",
      "cpDocumento",
      "cpValor",
      "cpVencimento",
      "cpObservacoes"
    ].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
  },

  preencherFormulario(item) {
    document.getElementById("cpFornecedor").value = item.fornecedor || "";
    document.getElementById("cpDescricao").value = item.descricao || "";
    document.getElementById("cpCategoria").value = item.categoria || "";
    document.getElementById("cpDocumento").value = item.documento || "";
    document.getElementById("cpValor").value = item.valor || "";
    document.getElementById("cpVencimento").value = item.vencimento || "";
    document.getElementById("cpObservacoes").value = item.observacoes || "";
  },

  editar(item) {
    this.contaEditandoId = item.id;
    this.preencherFormulario(item);
    utils.setAppMsg("Modo edição ativado.", "info");
    window.scrollTo({ top: 0, behavior: "smooth" });
  },

  cancelarEdicao() {
    this.contaEditandoId = null;
    this.limparFormulario();
  },

  async excluir(id) {
    try {
      await api.restDelete("contas_pagar", `id=eq.${id}`);
      utils.setAppMsg("Conta excluída com sucesso.", "ok");

      if (this.contaEditandoId === id) {
        this.cancelarEdicao();
      }

      await this.carregarContasPagar();

      if (window.planejamentoModule?.carregarPlanejamento) {
        await window.planejamentoModule.carregarPlanejamento();
      }
    } catch (e) {
      utils.setAppMsg("Erro ao excluir conta: " + e.message, "err");
    }
  },

  async duplicar(item) {
    try {
      const { mes, ano } = utils.getMesAno();

      const payload = {
        fornecedor: item.fornecedor || "",
        descricao: item.descricao || "",
        categoria: item.categoria || "",
        documento: item.documento || "",
        valor: Number(item.valor || 0),
        vencimento: item.vencimento || "",
        observacoes: item.observacoes || "",
        status: "pendente",
        mes,
        ano
      };

      await api.restInsert("contas_pagar", [payload]);
      utils.setAppMsg("Conta duplicada com sucesso.", "ok");

      await this.carregarContasPagar();

      if (window.planejamentoModule?.carregarPlanejamento) {
        await window.planejamentoModule.carregarPlanejamento();
      }
    } catch (e) {
      utils.setAppMsg("Erro ao duplicar conta: " + e.message, "err");
    }
  },

  preencherFiltros() {
    const fornecedores = [...new Set(this.lista.map(i => i.fornecedor).filter(Boolean))];
    const categorias = [...new Set(this.lista.map(i => i.categoria).filter(Boolean))];

    const selFornecedor = document.getElementById("filtroFornecedor");
    const selCategoria = document.getElementById("filtroCategoria");

    if (selFornecedor) {
      const atual = this.filtros.fornecedor;
      selFornecedor.innerHTML =
        `<option value="">Fornecedor</option>` +
        fornecedores.map(f => `<option value="${f}">${f}</option>`).join("");
      selFornecedor.value = atual;
    }

    if (selCategoria) {
      const atual = this.filtros.categoria;
      selCategoria.innerHTML =
        `<option value="">Categoria</option>` +
        categorias.map(c => `<option value="${c}">${c}</option>`).join("");
      selCategoria.value = atual;
    }
  },

  aplicarFiltros() {
    return this.lista.filter(item => {
      const busca = this.filtros.busca;

      const textoBase = [
        item.fornecedor || "",
        item.descricao || "",
        item.documento || ""
      ].join(" ").toLowerCase();

      const buscaMatch = !busca || textoBase.includes(busca);

      const fornecedorMatch =
        !this.filtros.fornecedor ||
        item.fornecedor === this.filtros.fornecedor;

      const categoriaMatch =
        !this.filtros.categoria ||
        item.categoria === this.filtros.categoria;

      let status = "aberto";
      if (item.vencimento && new Date(item.vencimento + "T00:00:00") < new Date(new Date().toDateString())) {
        status = "vencido";
      }

      const statusMatch =
        !this.filtros.status ||
        status === this.filtros.status;

      return buscaMatch && fornecedorMatch && categoriaMatch && statusMatch;
    });
  },

  render() {
    const tbody = document.getElementById("tabelaContasPagar");
    if (!tbody) return;

    const dados = this.aplicarFiltros();

    if (!dados.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="muted">Nenhuma conta encontrada.</td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = dados.map(item => {
      const hoje = new Date(new Date().toDateString());
      const vencimento = item.vencimento ? new Date(item.vencimento + "T00:00:00") : null;
      const vencido = vencimento && vencimento < hoje;
      const itemJson = encodeURIComponent(JSON.stringify(item));

      return `
        <tr>
          <td>${item.fornecedor || "-"}</td>
          <td>${item.descricao || "-"}</td>
          <td>${item.categoria || "-"}</td>
          <td>
  <div class="doc-tags">
    ${
      item.documento && item.documento.toLowerCase().includes("nf")
        ? `<span class="doc-tag doc-ok">NF-e</span>`
        : `<span class="doc-tag doc-missing">NF-e</span>`
    }

    ${
      item.documento && item.documento.toLowerCase().includes("boleto")
        ? `<span class="doc-tag doc-ok">Boleto</span>`
        : `<span class="doc-tag doc-missing">Boleto</span>`
    }
  </div>
</td>
          <td>${utils.moeda(item.valor || 0)}</td>
          <td>${item.vencimento || "-"}</td>
          <td class="${vencido ? "err" : "ok"}">
            ${vencido ? "Vencido" : "Em aberto"}
          </td>
          <td>
            <div style="display:flex; gap:6px; flex-wrap:wrap;">
              <button class="small-btn small-blue" onclick="contasPagarModule.editar(JSON.parse(decodeURIComponent('${itemJson}')))">Editar</button>
              <button class="small-btn small-yellow" onclick="contasPagarModule.duplicar(JSON.parse(decodeURIComponent('${itemJson}')))">Duplicar</button>
              <button class="small-btn small-green" onclick="contasPagarModule.abrirPopupPagamento(${item.id})">Pagar</button>
              <button class="small-btn small-red" onclick="contasPagarModule.excluir(${item.id})">Excluir</button>
            </div>
          </td>
        </tr>
      `;
    }).join("");
  },

  registrarEventosFiltros() {
    const busca = document.getElementById("filtroBusca");
    const fornecedor = document.getElementById("filtroFornecedor");
    const categoria = document.getElementById("filtroCategoria");
    const status = document.getElementById("filtroStatus");

    if (busca && !busca.dataset.binded) {
      busca.addEventListener("input", (e) => {
        this.filtros.busca = e.target.value.toLowerCase();
        this.render();
      });
      busca.dataset.binded = "1";
    }

    if (fornecedor && !fornecedor.dataset.binded) {
      fornecedor.addEventListener("change", (e) => {
        this.filtros.fornecedor = e.target.value;
        this.render();
      });
      fornecedor.dataset.binded = "1";
    }

    if (categoria && !categoria.dataset.binded) {
      categoria.addEventListener("change", (e) => {
        this.filtros.categoria = e.target.value;
        this.render();
      });
      categoria.dataset.binded = "1";
    }

    if (status && !status.dataset.binded) {
      status.addEventListener("change", (e) => {
        this.filtros.status = e.target.value;
        this.render();
      });
      status.dataset.binded = "1";
    }
  },

  abrirPopupPagamento(id) {
    this.pagandoId = id;

    const popup = document.getElementById("popupPagamento");
    const pgData = document.getElementById("pgData");
    const pgMulta = document.getElementById("pgMulta");
    const pgDesconto = document.getElementById("pgDesconto");

    if (pgData) pgData.value = utils.hojeISO();
    if (pgMulta) pgMulta.value = "";
    if (pgDesconto) pgDesconto.value = "";

    if (popup) popup.classList.remove("hidden");
  },

  fecharPopup() {
    const popup = document.getElementById("popupPagamento");
    if (popup) popup.classList.add("hidden");
    this.pagandoId = null;
  },

  async confirmarPagamento() {
    if (!this.pagandoId) return;

    try {
      const data_pagamento = document.getElementById("pgData")?.value || utils.hojeISO();
      const multa = Number(document.getElementById("pgMulta")?.value || 0);
      const desconto = Number(document.getElementById("pgDesconto")?.value || 0);

      await api.restPatch("contas_pagar", `id=eq.${this.pagandoId}`, {
        status: "pago",
        data_pagamento,
        multa,
        desconto
      });

      utils.setAppMsg("Conta paga com sucesso!", "ok");

      this.fecharPopup();
      await this.carregarContasPagar();

      if (window.contasPagasModule?.carregarContasPagas) {
        await window.contasPagasModule.carregarContasPagas();
      }

      if (window.planejamentoModule?.carregarPlanejamento) {
        await window.planejamentoModule.carregarPlanejamento();
      }
    } catch (e) {
      utils.setAppMsg("Erro ao pagar conta: " + e.message, "err");
    }
  },

  async carregarContasPagar() {
    try {
      const data = await api.restGet(
        "contas_pagar",
        `select=*&status=eq.pendente&order=vencimento.asc`
      );

      this.lista = data || [];
      this.preencherFiltros();
      this.render();
    } catch (e) {
      utils.setAppMsg("Erro ao carregar contas a pagar: " + e.message, "err");
    }
  }
};
