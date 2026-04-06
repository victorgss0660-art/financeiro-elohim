window.contasPagarModule = {
  lista: [],
  pagandoId: null,

  filtros: {
    busca: "",
    fornecedor: "",
    categoria: "",
    status: ""
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
  },

  preencherFiltros() {
    const fornecedores = [...new Set(this.lista.map(i => i.fornecedor).filter(Boolean))];
    const categorias = [...new Set(this.lista.map(i => i.categoria).filter(Boolean))];

    const selFornecedor = document.getElementById("filtroFornecedor");
    const selCategoria = document.getElementById("filtroCategoria");

    if (selFornecedor) {
      selFornecedor.innerHTML =
        `<option value="">Fornecedor</option>` +
        fornecedores.map(f => `<option value="${f}">${f}</option>`).join("");
    }

    if (selCategoria) {
      selCategoria.innerHTML =
        `<option value="">Categoria</option>` +
        categorias.map(c => `<option value="${c}">${c}</option>`).join("");
    }
  },

  aplicarFiltros() {
    let dados = [...this.lista];

    return dados.filter(item => {
      const busca = this.filtros.busca;

      const buscaMatch =
        !busca ||
        (item.fornecedor || "").toLowerCase().includes(busca) ||
        (item.descricao || "").toLowerCase().includes(busca);

      const fornecedorMatch =
        !this.filtros.fornecedor ||
        item.fornecedor === this.filtros.fornecedor;

      const categoriaMatch =
        !this.filtros.categoria ||
        item.categoria === this.filtros.categoria;

      let status = "aberto";
      if (new Date(item.vencimento) < new Date()) {
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
      const vencido = new Date(item.vencimento) < new Date();

      return `
        <tr>
          <td>${item.fornecedor || "-"}</td>
          <td>${item.descricao || "-"}</td>
          <td>${item.categoria || "-"}</td>
          <td>${item.documento || "-"}</td>
          <td>${utils.moeda(item.valor)}</td>
          <td>${item.vencimento || "-"}</td>
          <td class="${vencido ? "err" : "ok"}">
            ${vencido ? "Vencido" : "Em aberto"}
          </td>
          <td>
            <button class="small-btn small-green"
              onclick="contasPagarModule.abrirPopupPagamento(${item.id})">
              Pagar
            </button>
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

    if (busca) {
      busca.addEventListener("input", (e) => {
        this.filtros.busca = e.target.value.toLowerCase();
        this.render();
      });
    }

    if (fornecedor) {
      fornecedor.addEventListener("change", (e) => {
        this.filtros.fornecedor = e.target.value;
        this.render();
      });
    }

    if (categoria) {
      categoria.addEventListener("change", (e) => {
        this.filtros.categoria = e.target.value;
        this.render();
      });
    }

    if (status) {
      status.addEventListener("change", (e) => {
        this.filtros.status = e.target.value;
        this.render();
      });
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
      const data_pagamento = document.getElementById("pgData").value;
      const multa = Number(document.getElementById("pgMulta").value || 0);
      const desconto = Number(document.getElementById("pgDesconto").value || 0);

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

    } catch (e) {
      utils.setAppMsg("Erro ao pagar conta: " + e.message, "err");
    }
  }
};
