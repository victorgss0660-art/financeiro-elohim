window.contasPagarModule = {
  lista: [],
  pagandoId: null,
  contaEditandoId: null,

  async carregarContasPagar() {
    try {
      const data = await api.restGet(
        "contas_pagar",
        "select=*&status=neq.pago&order=vencimento.asc"
      );

      this.lista = Array.isArray(data) ? data : [];
      this.preencherFiltros();
      this.render();
    } catch (e) {
      console.error(e);
      utils.setAppMsg("Erro ao carregar contas a pagar: " + e.message, "err");
    }
  },

  getFiltros() {
    return {
      busca: String(document.getElementById("filtroBusca")?.value || "").toLowerCase().trim(),
      fornecedor: String(document.getElementById("filtroFornecedor")?.value || "").trim(),
      categoria: String(document.getElementById("filtroCategoria")?.value || "").trim(),
      status: String(document.getElementById("filtroStatus")?.value || "").trim(),
      docs: String(document.getElementById("filtroDocs")?.value || "").trim(),
      dataInicio: String(document.getElementById("filtroDataInicio")?.value || "").trim(),
      dataFim: String(document.getElementById("filtroDataFim")?.value || "").trim()
    };
  },

  limparFiltros() {
    [
      "filtroBusca",
      "filtroFornecedor",
      "filtroCategoria",
      "filtroStatus",
      "filtroDocs",
      "filtroDataInicio",
      "filtroDataFim"
    ].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });

    this.render();
  },

  preencherFiltros() {
    const fornecedores = [...new Set(this.lista.map(i => i.fornecedor).filter(Boolean))].sort();
    const categorias = [...new Set(this.lista.map(i => i.categoria).filter(Boolean))].sort();

    const selFornecedor = document.getElementById("filtroFornecedor");
    const selCategoria = document.getElementById("filtroCategoria");

    const fornecedorAtual = selFornecedor?.value || "";
    const categoriaAtual = selCategoria?.value || "";

    if (selFornecedor) {
      selFornecedor.innerHTML =
        `<option value="">Fornecedor</option>` +
        fornecedores.map(f => `<option value="${f}">${f}</option>`).join("");
      selFornecedor.value = fornecedorAtual;
    }

    if (selCategoria) {
      selCategoria.innerHTML =
        `<option value="">Categoria</option>` +
        categorias.map(c => `<option value="${c}">${c}</option>`).join("");
      selCategoria.value = categoriaAtual;
    }
  },

  getStatusVisual(item) {
    if (String(item.status || "").toLowerCase() === "pago") return "pago";

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    if (item.vencimento) {
      const venc = new Date(item.vencimento + "T00:00:00");
      if (venc < hoje) return "vencido";
    }

    return "aberto";
  },

  aplicarFiltros() {
    const filtros = this.getFiltros();

    return this.lista.filter(item => {
      const textoBase = [
        item.fornecedor || "",
        item.descricao || "",
        item.documento || "",
        item.numero_nfe || "",
        item.numero_boleto || ""
      ].join(" ").toLowerCase();

      if (filtros.busca && !textoBase.includes(filtros.busca)) return false;
      if (filtros.fornecedor && String(item.fornecedor || "") !== filtros.fornecedor) return false;
      if (filtros.categoria && String(item.categoria || "") !== filtros.categoria) return false;

      const status = this.getStatusVisual(item);
      if (filtros.status && status !== filtros.status) return false;

      if (filtros.docs === "faltando_nfe" && !!item.tem_nfe) return false;
      if (filtros.docs === "faltando_boleto" && !!item.tem_boleto) return false;
      if (filtros.docs === "faltando_ambos" && (!!item.tem_nfe || !!item.tem_boleto)) return false;
      if (filtros.docs === "completos" && !(!!item.tem_nfe && !!item.tem_boleto)) return false;

      if (filtros.dataInicio && (!item.vencimento || item.vencimento < filtros.dataInicio)) return false;
      if (filtros.dataFim && (!item.vencimento || item.vencimento > filtros.dataFim)) return false;

      return String(item.status || "").toLowerCase() !== "pago";
    });
  },

  atualizarTotais(dados) {
    const qtd = document.getElementById("cpTotalQuantidade");
    const total = document.getElementById("cpTotalValor");
    const vencidas = document.getElementById("cpTotalVencidas");
    const valorVencido = document.getElementById("cpTotalValorVencido");

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const quantidade = dados.length;
    const totalValor = dados.reduce((acc, item) => acc + Number(item.valor || 0), 0);

    const listaVencidas = dados.filter(item => {
      if (!item.vencimento) return false;
      const venc = new Date(item.vencimento + "T00:00:00");
      return venc < hoje;
    });

    const quantidadeVencidas = listaVencidas.length;
    const totalVencido = listaVencidas.reduce((acc, item) => acc + Number(item.valor || 0), 0);

    if (qtd) qtd.textContent = String(quantidade);
    if (total) total.textContent = utils.moeda(totalValor);
    if (vencidas) vencidas.textContent = String(quantidadeVencidas);
    if (valorVencido) valorVencido.textContent = utils.moeda(totalVencido);
  },

  atualizarSelecionados() {
    const checkboxes = document.querySelectorAll(".cp-select-item:checked");

    let total = 0;
    let qtd = 0;

    checkboxes.forEach(cb => {
      total += Number(cb.dataset.valor || 0);
      qtd++;

      const tr = cb.closest("tr");
      if (tr) tr.classList.add("selecionado");
    });

    document.querySelectorAll(".cp-select-item:not(:checked)").forEach(cb => {
      const tr = cb.closest("tr");
      if (tr) tr.classList.remove("selecionado");
    });

    const elQtd = document.getElementById("cpSelecionadasQtd");
    const elValor = document.getElementById("cpSelecionadasValor");

    if (elQtd) elQtd.textContent = String(qtd);
    if (elValor) elValor.textContent = utils.moeda(total);
  },

  registrarEventosSelecao() {
    const todos = document.getElementById("cpSelecionarTodos");

    if (todos && !todos.dataset.binded) {
      todos.addEventListener("change", e => {
        const checked = e.target.checked;

        document.querySelectorAll(".cp-select-item").forEach(cb => {
          cb.checked = checked;
        });

        this.atualizarSelecionados();
      });

      todos.dataset.binded = "1";
    }

    document.querySelectorAll(".cp-select-item").forEach(cb => {
      if (!cb.dataset.binded) {
        cb.addEventListener("change", () => {
          this.atualizarSelecionados();
        });

        cb.dataset.binded = "1";
      }
    });
  },

  render() {
    const tbody = document.getElementById("tabelaContasPagar");
    if (!tbody) return;

    const dados = this.aplicarFiltros();
    this.atualizarTotais(dados);

    if (!dados.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10" class="muted">Nenhuma conta encontrada.</td>
        </tr>
      `;

      const todos = document.getElementById("cpSelecionarTodos");
      if (todos) todos.checked = false;
      this.atualizarSelecionados();
      return;
    }

    tbody.innerHTML = dados.map(item => {
      const status = this.getStatusVisual(item);

      return `
        <tr>
          <td>
            <input
              type="checkbox"
              class="cp-select-item"
              data-id="${item.id}"
              data-valor="${item.valor || 0}"
            >
          </td>
          <td>${item.fornecedor || "-"}</td>
          <td>${item.descricao || "-"}</td>
          <td>${item.categoria || "-"}</td>
          <td>${item.documento || "-"}</td>
          <td>${utils.moeda(item.valor || 0)}</td>
          <td>${item.vencimento || "-"}</td>
          <td class="${status === "vencido" ? "err" : ""}">
            ${status === "vencido" ? "Vencido" : "Em aberto"}
          </td>
          <td>
            ${item.tem_nfe ? "NF OK" : "NF"} /
            ${item.tem_boleto ? "Boleto OK" : "Boleto"}
          </td>
          <td>
            <button class="small-btn small-green" type="button" onclick="contasPagarModule.abrirPopupPagamento(${item.id})">Pagar</button>
            <button class="small-btn small-red" type="button" onclick="contasPagarModule.excluir(${item.id})">Excluir</button>
          </td>
        </tr>
      `;
    }).join("");

    this.registrarEventosSelecao();
    this.atualizarSelecionados();
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
    } catch (e) {
      utils.setAppMsg("Erro ao pagar conta: " + e.message, "err");
    }
  },

  async excluir(id) {
    try {
      await api.restDelete("contas_pagar", `id=eq.${id}`);
      utils.setAppMsg("Conta excluída com sucesso.", "ok");
      await this.carregarContasPagar();
    } catch (e) {
      utils.setAppMsg("Erro ao excluir conta: " + e.message, "err");
    }
  }
};
