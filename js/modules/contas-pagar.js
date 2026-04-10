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

  normalizarBooleano(valor) {
    if (typeof valor === "boolean") return valor;
    if (typeof valor === "number") return valor === 1;
    if (typeof valor === "string") {
      const v = valor.trim().toLowerCase();
      return ["true", "sim", "yes", "1", "x"].includes(v);
    }
    return false;
  },

  normalizarNumero(valor) {
    if (typeof valor === "number") return valor;
    if (valor == null) return 0;

    const texto = String(valor).trim();
    if (!texto) return 0;

    const semMoeda = texto.replace(/[R$\s]/g, "");
    const temVirgula = semMoeda.includes(",");
    const temPonto = semMoeda.includes(".");

    if (temVirgula && temPonto) {
      return Number(semMoeda.replace(/\./g, "").replace(",", ".")) || 0;
    }

    if (temVirgula) {
      return Number(semMoeda.replace(",", ".")) || 0;
    }

    return Number(semMoeda) || 0;
  },

  normalizarData(valor) {
    if (!valor) return "";

    if (typeof valor === "string") {
      const v = valor.trim();
      if (!v) return "";

      if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;

      if (/^\d{2}\/\d{2}\/\d{4}$/.test(v)) {
        const [dd, mm, yyyy] = v.split("/");
        return `${yyyy}-${mm}-${dd}`;
      }

      const d = new Date(v);
      if (!Number.isNaN(d.getTime())) {
        return d.toISOString().slice(0, 10);
      }

      return "";
    }

    if (typeof valor === "number") {
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      const date = new Date(excelEpoch.getTime() + valor * 86400000);
      return date.toISOString().slice(0, 10);
    }

    if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
      return valor.toISOString().slice(0, 10);
    }

    return "";
  },

  sincronizarFiltrosDoDOM() {
    this.filtros.busca = String(document.getElementById("filtroBusca")?.value || "").toLowerCase().trim();
    this.filtros.fornecedor = String(document.getElementById("filtroFornecedor")?.value || "").trim();
    this.filtros.categoria = String(document.getElementById("filtroCategoria")?.value || "").trim();
    this.filtros.status = String(document.getElementById("filtroStatus")?.value || "").trim();
    this.filtros.docs = String(document.getElementById("filtroDocs")?.value || "").trim();
    this.filtros.dataInicio = String(document.getElementById("filtroDataInicio")?.value || "").trim();
    this.filtros.dataFim = String(document.getElementById("filtroDataFim")?.value || "").trim();
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

    this.sincronizarFiltrosDoDOM();
    this.render();
  },

  async salvarContaPagar() {
    try {
      const payload = {
        fornecedor: document.getElementById("cpFornecedor")?.value.trim() || "",
        descricao: document.getElementById("cpDescricao")?.value.trim() || "",
        categoria: document.getElementById("cpCategoria")?.value.trim() || "",
        documento: document.getElementById("cpDocumento")?.value.trim() || "",
        valor: Number(document.getElementById("cpValor")?.value || 0),
        vencimento: document.getElementById("cpVencimento")?.value || "",
        observacoes: document.getElementById("cpObservacoes")?.value.trim() || "",
        numero_nfe: document.getElementById("cpNumeroNfe")?.value.trim() || "",
        numero_boleto: document.getElementById("cpNumeroBoleto")?.value.trim() || "",
        tem_nfe: !!document.getElementById("cpTemNfe")?.checked,
        tem_boleto: !!document.getElementById("cpTemBoleto")?.checked,
        status: "pendente"
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
    const setVal = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.value = value || "";
    };

    setVal("cpFornecedor", item.fornecedor);
    setVal("cpDescricao", item.descricao);
    setVal("cpCategoria", item.categoria);
    setVal("cpDocumento", item.documento);
    setVal("cpValor", item.valor);
    setVal("cpVencimento", item.vencimento);
    setVal("cpObservacoes", item.observacoes);
    setVal("cpNumeroNfe", item.numero_nfe);
    setVal("cpNumeroBoleto", item.numero_boleto);

    const cpTemNfe = document.getElementById("cpTemNfe");
    const cpTemBoleto = document.getElementById("cpTemBoleto");

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
        status: "pendente"
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
    this.sincronizarFiltrosDoDOM();

    return this.lista.filter(item => {
      const textoBase = [
        item.fornecedor || "",
        item.descricao || "",
        item.documento || "",
        item.numero_nfe || "",
        item.numero_boleto || ""
      ].join(" ").toLowerCase();

      if (this.filtros.busca && !textoBase.includes(this.filtros.busca)) return false;
      if (this.filtros.fornecedor && String(item.fornecedor || "") !== this.filtros.fornecedor) return false;
      if (this.filtros.categoria && String(item.categoria || "") !== this.filtros.categoria) return false;

      const status = this.getStatusVisual(item);
      if (this.filtros.status && status !== this.filtros.status) return false;

      if (this.filtros.docs === "faltando_nfe" && !!item.tem_nfe) return false;
      if (this.filtros.docs === "faltando_boleto" && !!item.tem_boleto) return false;
      if (this.filtros.docs === "faltando_ambos" && (!!item.tem_nfe || !!item.tem_boleto)) return false;
      if (this.filtros.docs === "completos" && !(!!item.tem_nfe && !!item.tem_boleto)) return false;

      if (this.filtros.dataInicio && (!item.vencimento || item.vencimento < this.filtros.dataInicio)) return false;
      if (this.filtros.dataFim && (!item.vencimento || item.vencimento > this.filtros.dataFim)) return false;

      return String(item.status || "").toLowerCase() !== "pago";
    });
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

  async importarPlanilha(event) {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      if (!rows.length) {
        utils.setAppMsg("A planilha está vazia.", "err");
        return;
      }

      const linhas = rows.map(row => {
        const id = row.id || row.ID || "";
        return {
          id: String(id).trim(),
          fornecedor: String(row.fornecedor || row.FORNECEDOR || "").trim(),
          descricao: String(row.descricao || row.DESCRICAO || row["DESCRIÇÃO"] || "").trim(),
          categoria: String(row.categoria || row.CATEGORIA || "").trim(),
          documento: String(row.documento || row.DOCUMENTO || "").trim(),
          valor: this.normalizarNumero(row.valor || row.VALOR || 0),
          vencimento: this.normalizarData(row.vencimento || row.VENCIMENTO || ""),
          observacoes: String(row.observacoes || row.OBSERVACOES || row["OBSERVAÇÕES"] || "").trim(),
          numero_nfe: String(row.numero_nfe || row.NUMERO_NFE || row["NÚMERO_NFE"] || "").trim(),
          numero_boleto: String(row.numero_boleto || row.NUMERO_BOLETO || row["NÚMERO_BOLETO"] || "").trim(),
          tem_nfe: this.normalizarBooleano(row.tem_nfe || row.TEM_NFE),
          tem_boleto: this.normalizarBooleano(row.tem_boleto || row.TEM_BOLETO),
          status: String(row.status || row.STATUS || "pendente").trim().toLowerCase() || "pendente"
        };
      }).filter(item =>
        item.fornecedor && item.descricao && item.valor && item.vencimento
      );

      if (!linhas.length) {
        utils.setAppMsg("Nenhuma linha válida encontrada na planilha.", "err");
        return;
      }

      for (const item of linhas) {
        const payload = {
          fornecedor: item.fornecedor,
          descricao: item.descricao,
          categoria: item.categoria,
          documento: item.documento,
          valor: item.valor,
          vencimento: item.vencimento,
          observacoes: item.observacoes,
          numero_nfe: item.numero_nfe,
          numero_boleto: item.numero_boleto,
          tem_nfe: item.tem_nfe,
          tem_boleto: item.tem_boleto,
          status: item.status
        };

        if (item.id) {
          await api.restPatch("contas_pagar", `id=eq.${item.id}`, payload);
        } else {
          await api.restInsert("contas_pagar", [payload]);
        }
      }

      utils.setAppMsg("Planilha importada com sucesso.", "ok");
      event.target.value = "";
      await this.carregarContasPagar();

      if (window.planejamentoModule?.carregarPlanejamento) {
        await window.planejamentoModule.carregarPlanejamento();
      }
    } catch (e) {
      utils.setAppMsg("Erro ao importar planilha: " + e.message, "err");
    }
  },

  exportarPlanilha() {
    try {
      const dados = this.lista.map(item => ({
        id: item.id ?? "",
        fornecedor: item.fornecedor || "",
        descricao: item.descricao || "",
        categoria: item.categoria || "",
        documento: item.documento || "",
        valor: Number(item.valor || 0),
        vencimento: item.vencimento || "",
        observacoes: item.observacoes || "",
        numero_nfe: item.numero_nfe || "",
        numero_boleto: item.numero_boleto || "",
        tem_nfe: item.tem_nfe ? "Sim" : "Não",
        tem_boleto: item.tem_boleto ? "Sim" : "Não",
        status: item.status || ""
      }));

      const worksheet = XLSX.utils.json_to_sheet(dados);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Contas a Pagar");

      const hoje = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(workbook, `contas_a_pagar_${hoje}.xlsx`);
    } catch (e) {
      utils.setAppMsg("Erro ao exportar planilha: " + e.message, "err");
    }
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
          <td class="${status === "vencido" ? "err" : status === "pago" ? "ok" : ""}">
            ${status === "vencido" ? "Vencido" : status === "pago" ? "Pago" : "Em aberto"}
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
                type="button"
              >
                ${item.tem_nfe ? "NF OK" : "NF"}
              </button>

              <button
                class="doc-btn boleto ${item.tem_boleto ? "active" : ""}"
                onclick="contasPagarModule.marcarBoleto(${item.id}, ${!item.tem_boleto})"
                type="button"
              >
                ${item.tem_boleto ? "Boleto OK" : "Boleto"}
              </button>
            </div>
          </td>
          <td>
            <div style="display:flex; gap:6px; flex-wrap:wrap;">
              <button
                class="small-btn small-blue"
                onclick="contasPagarModule.editar(JSON.parse(decodeURIComponent('${itemJson}')))"
                type="button"
              >
                Editar
              </button>

              <button
                class="small-btn small-yellow"
                onclick="contasPagarModule.duplicar(JSON.parse(decodeURIComponent('${itemJson}')))"
                type="button"
              >
                Duplicar
              </button>

              <button
                class="small-btn small-green"
                onclick="contasPagarModule.abrirPopupPagamento(${item.id})"
                type="button"
              >
                Pagar
              </button>

              <button
                class="small-btn small-red"
                onclick="contasPagarModule.excluir(${item.id})"
                type="button"
              >
                Excluir
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join("");

    this.registrarEventosSelecao();
    this.atualizarSelecionados();
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
        "select=*&status=neq.pago&order=vencimento.asc"
      );

      this.lista = Array.isArray(data) ? data : [];
      this.preencherFiltros();
      this.render();
    } catch (e) {
      utils.setAppMsg("Erro ao carregar contas a pagar: " + e.message, "err");
    }
  }
};
