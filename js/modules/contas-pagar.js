window.contasPagarModule = {
  lista: [],
  pagandoId: null,
  contaEditandoId: null,

  filtros: {
    busca: "",
    fornecedor: "",
    categoria: "",
    status: "",
    docs: "",
    dataInicio: "",
    dataFim: ""
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
        numero_nfe: document.getElementById("cpNumeroNfe")?.value.trim() || "",
        numero_boleto: document.getElementById("cpNumeroBoleto")?.value.trim() || "",
        tem_nfe: !!document.getElementById("cpTemNfe")?.checked,
        tem_boleto: !!document.getElementById("cpTemBoleto")?.checked,
        status: "pendente",
        mes,
        ano
      };

      if (!payload.fornecedor || !payload.descricao || !payload.valor || !payload.vencimento) {
        utils.setAppMsg("Preencha fornecedor, descrição, valor e vencimento.", "err");
        return;
      }

      if (this.contaEditandoId) {
        await api.restPatch("contas_pagar", `id=eq.${this.contaEditandoId}`, payload);
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
      "cpObservacoes",
      "cpNumeroNfe",
      "cpNumeroBoleto"
    ].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });

    const cpTemNfe = document.getElementById("cpTemNfe");
    const cpTemBoleto = document.getElementById("cpTemBoleto");

    if (cpTemNfe) cpTemNfe.checked = false;
    if (cpTemBoleto) cpTemBoleto.checked = false;
  },

  preencherFormulario(item) {
    document.getElementById("cpFornecedor").value = item.fornecedor || "";
    document.getElementById("cpDescricao").value = item.descricao || "";
    document.getElementById("cpCategoria").value = item.categoria || "";
    document.getElementById("cpDocumento").value = item.documento || "";
    document.getElementById("cpValor").value = item.valor || "";
    document.getElementById("cpVencimento").value = item.vencimento || "";
    document.getElementById("cpObservacoes").value = item.observacoes || "";

    const cpNumeroNfe = document.getElementById("cpNumeroNfe");
    const cpNumeroBoleto = document.getElementById("cpNumeroBoleto");
    const cpTemNfe = document.getElementById("cpTemNfe");
    const cpTemBoleto = document.getElementById("cpTemBoleto");

    if (cpNumeroNfe) cpNumeroNfe.value = item.numero_nfe || "";
    if (cpNumeroBoleto) cpNumeroBoleto.value = item.numero_boleto || "";
    if (cpTemNfe) cpTemNfe.checked = !!item.tem_nfe;
    if (cpTemBoleto) cpTemBoleto.checked = !!item.tem_boleto;
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
        numero_nfe: item.numero_nfe || "",
        numero_boleto: item.numero_boleto || "",
        tem_nfe: !!item.tem_nfe,
        tem_boleto: !!item.tem_boleto,
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

  atualizarTotais(dados) {
    const qtd = document.getElementById("cpTotalQuantidade");
    const total = document.getElementById("cpTotalValor");
    const vencidas = document.getElementById("cpTotalVencidas");
    const valorVencido = document.getElementById("cpTotalValorVencido");

    const hoje = new Date(new Date().toDateString());

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

  obterSelecionadas() {
    const selecionadas = [];
    document.querySelectorAll(".cp-select-item:checked").forEach(cb => {
      selecionadas.push({
        id: Number(cb.dataset.id),
        valor: Number(cb.dataset.valor || 0)
      });
    });
    return selecionadas;
  },

  aplicarFiltros() {
    return this.lista.filter(item => {
      const busca = this.filtros.busca;

      const textoBase = [
        item.fornecedor || "",
        item.descricao || "",
        item.documento || "",
        item.numero_nfe || "",
        item.numero_boleto || ""
      ].join(" ").toLowerCase();

      const buscaMatch = !busca || textoBase.includes(busca);

      const fornecedorMatch =
        !this.filtros.fornecedor || item.fornecedor === this.filtros.fornecedor;

      const categoriaMatch =
        !this.filtros.categoria || item.categoria === this.filtros.categoria;

      let status = "aberto";
      if (
        item.vencimento &&
        new Date(item.vencimento + "T00:00:00") < new Date(new Date().toDateString())
      ) {
        status = "vencido";
      }

      const statusMatch =
        !this.filtros.status || status === this.filtros.status;

      let docsMatch = true;
      if (this.filtros.docs === "faltando_nfe") docsMatch = !item.tem_nfe;
      if (this.filtros.docs === "faltando_boleto") docsMatch = !item.tem_boleto;
      if (this.filtros.docs === "faltando_ambos") docsMatch = !item.tem_nfe && !item.tem_boleto;
      if (this.filtros.docs === "completos") docsMatch = !!item.tem_nfe && !!item.tem_boleto;

      let dataInicioMatch = true;
      if (this.filtros.dataInicio) {
        dataInicioMatch = !!item.vencimento && item.vencimento >= this.filtros.dataInicio;
      }

      let dataFimMatch = true;
      if (this.filtros.dataFim) {
        dataFimMatch = !!item.vencimento && item.vencimento <= this.filtros.dataFim;
      }

      return (
        buscaMatch &&
        fornecedorMatch &&
        categoriaMatch &&
        statusMatch &&
        docsMatch &&
        dataInicioMatch &&
        dataFimMatch
      );
    });
  },

  registrarEventosSelecao() {
    const todos = document.getElementById("cpSelecionarTodos");

    if (todos && !todos.dataset.binded) {
      todos.addEventListener("change", (e) => {
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
      const hoje = new Date(new Date().toDateString());
      const vencimento = item.vencimento ? new Date(item.vencimento + "T00:00:00") : null;
      const vencido = vencimento && vencimento < hoje;
      const itemJson = encodeURIComponent(JSON.stringify(item));

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
          <td class="${vencido ? "err" : "ok"}">
            ${vencido ? "Vencido" : "Em aberto"}
          </td>
          <td>
            <div class="doc-status">
              <span class="doc-dot ${item.tem_nfe ? "ok" : "pending"}"></span>
              <span>NF-e</span>
              <span class="doc-dot ${item.tem_boleto ? "ok" : "pending"}"></span>
              <span>Boleto</span>
            </div>

            <div class="doc-actions">
              <button
                class="doc-btn nfe ${item.tem_nfe ? "active" : ""}"
                onclick="contasPagarModule.marcarNfe(${item.id}, ${!item.tem_nfe})"
              >
                ${item.tem_nfe ? "NF OK" : "NF"}
              </button>

              <button
                class="doc-btn boleto ${item.tem_boleto ? "active" : ""}"
                onclick="contasPagarModule.marcarBoleto(${item.id}, ${!item.tem_boleto})"
              >
                ${item.tem_boleto ? "Boleto OK" : "Boleto"}
              </button>
            </div>
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

    this.registrarEventosSelecao();
    this.atualizarSelecionados();
  },

  registrarEventosFiltros() {
    const busca = document.getElementById("filtroBusca");
    const fornecedor = document.getElementById("filtroFornecedor");
    const categoria = document.getElementById("filtroCategoria");
    const status = document.getElementById("filtroStatus");
    const docs = document.getElementById("filtroDocs");
    const dataInicio = document.getElementById("filtroDataInicio");
    const dataFim = document.getElementById("filtroDataFim");

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

    if (docs && !docs.dataset.binded) {
      docs.addEventListener("change", (e) => {
        this.filtros.docs = e.target.value;
        this.render();
      });
      docs.dataset.binded = "1";
    }

    if (dataInicio && !dataInicio.dataset.binded) {
      dataInicio.addEventListener("change", (e) => {
        this.filtros.dataInicio = e.target.value;
        this.render();
      });
      dataInicio.dataset.binded = "1";
    }

    if (dataFim && !dataFim.dataset.binded) {
      dataFim.addEventListener("change", (e) => {
        this.filtros.dataFim = e.target.value;
        this.render();
      });
      dataFim.dataset.binded = "1";
    }
  },

  async marcarNfe(id, valor) {
    try {
      await api.restPatch("contas_pagar", `id=eq.${id}`, { tem_nfe: valor });
      await this.carregarContasPagar();
    } catch (e) {
      utils.setAppMsg("Erro ao atualizar NF-e: " + e.message, "err");
    }
  },

  async marcarBoleto(id, valor) {
    try {
      await api.restPatch("contas_pagar", `id=eq.${id}`, { tem_boleto: valor });
      await this.carregarContasPagar();
    } catch (e) {
      utils.setAppMsg("Erro ao atualizar boleto: " + e.message, "err");
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

  abrirPopupPagamentoLote() {
    const selecionadas = this.obterSelecionadas();

    if (!selecionadas.length) {
      utils.setAppMsg("Selecione pelo menos uma conta.", "err");
      return;
    }

    const qtd = selecionadas.length;
    const total = selecionadas.reduce((acc, item) => acc + Number(item.valor || 0), 0);

    const popup = document.getElementById("popupPagamentoLote");
    const pgLoteQtd = document.getElementById("pgLoteQtd");
    const pgLoteTotal = document.getElementById("pgLoteTotal");
    const pgLoteData = document.getElementById("pgLoteData");
    const pgLoteMulta = document.getElementById("pgLoteMulta");
    const pgLoteDesconto = document.getElementById("pgLoteDesconto");

    if (pgLoteQtd) pgLoteQtd.value = String(qtd);
    if (pgLoteTotal) pgLoteTotal.value = utils.moeda(total);
    if (pgLoteData) pgLoteData.value = utils.hojeISO();
    if (pgLoteMulta) pgLoteMulta.value = "";
    if (pgLoteDesconto) pgLoteDesconto.value = "";

    if (popup) popup.classList.remove("hidden");
  },

  fecharPopupLote() {
    const popup = document.getElementById("popupPagamentoLote");
    if (popup) popup.classList.add("hidden");
  },

  async confirmarPagamentoLote() {
    const selecionadas = this.obterSelecionadas();

    if (!selecionadas.length) {
      utils.setAppMsg("Selecione pelo menos uma conta.", "err");
      return;
    }

    try {
      const data_pagamento = document.getElementById("pgLoteData")?.value || utils.hojeISO();
      const multaTotal = Number(document.getElementById("pgLoteMulta")?.value || 0);
      const descontoTotal = Number(document.getElementById("pgLoteDesconto")?.value || 0);

      const somaBase = selecionadas.reduce((acc, item) => acc + Number(item.valor || 0), 0);

      for (const item of selecionadas) {
        const proporcao = somaBase > 0 ? Number(item.valor || 0) / somaBase : 0;
        const multa = Number((multaTotal * proporcao).toFixed(2));
        const desconto = Number((descontoTotal * proporcao).toFixed(2));

        await api.restPatch("contas_pagar", `id=eq.${item.id}`, {
          status: "pago",
          data_pagamento,
          multa,
          desconto
        });
      }

      utils.setAppMsg("Contas selecionadas pagas com sucesso!", "ok");

      this.fecharPopupLote();
      await this.carregarContasPagar();

      const selecionarTodos = document.getElementById("cpSelecionarTodos");
      if (selecionarTodos) selecionarTodos.checked = false;

      if (window.contasPagasModule?.carregarContasPagas) {
        await window.contasPagasModule.carregarContasPagas();
      }

      if (window.planejamentoModule?.carregarPlanejamento) {
        await window.planejamentoModule.carregarPlanejamento();
      }
    } catch (e) {
      utils.setAppMsg("Erro ao pagar contas selecionadas: " + e.message, "err");
    }
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
