window.contasPagarModule = {
  dados: [],
  filtrados: [],
  selecionados: new Set(),
  editandoId: null,

  inputs: {
    nfe: false,
    boleto: false
  },

  get(id) {
    return document.getElementById(id);
  },

  valor(id) {
    return this.get(id)?.value || "";
  },

  normalizarTexto(texto) {
    return String(texto || "").trim().toUpperCase();
  },

  normalizarChave(chave) {
    return String(chave || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "");
  },

  numero(valor) {
    if (typeof valor === "number") return isNaN(valor) ? 0 : valor;
    if (valor === null || valor === undefined || valor === "") return 0;

    let txt = String(valor)
      .trim()
      .replace(/R\$/gi, "")
      .replace(/\s/g, "")
      .replace(/[^\d,.-]/g, "");

    if (txt.includes(".") && txt.includes(",")) {
      txt = txt.replace(/\./g, "").replace(",", ".");
    } else if (txt.includes(",")) {
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

  dataBR(data) {
    if (!data) return "-";
    const d = new Date(String(data) + "T00:00:00");
    if (isNaN(d.getTime())) return data;
    return d.toLocaleDateString("pt-BR");
  },

  dataISO(valor) {
    if (!valor) return "";

    if (valor instanceof Date && !isNaN(valor.getTime())) {
      return valor.toISOString().slice(0, 10);
    }

    const texto = String(valor).trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) return texto;

    if (/^\d{2}\/\d{2}\/\d{4}$/.test(texto)) {
      const [dia, mes, ano] = texto.split("/");
      return `${ano}-${mes}-${dia}`;
    }

    const d = new Date(texto);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);

    return "";
  },

  booleano(valor) {
    const txt = this.normalizarTexto(valor);

    return [
      "SIM",
      "S",
      "OK",
      "TRUE",
      "VERDADEIRO",
      "RECEBIDO",
      "RECEBIDA",
      "1",
      "X"
    ].includes(txt);
  },

  pegarCampo(linha, opcoes) {
    const mapa = {};

    Object.keys(linha || {}).forEach(chave => {
      mapa[this.normalizarChave(chave)] = linha[chave];
    });

    for (const nome of opcoes) {
      const chave = this.normalizarChave(nome);

      if (
        mapa[chave] !== undefined &&
        mapa[chave] !== null &&
        mapa[chave] !== ""
      ) {
        return mapa[chave];
      }
    }

    return "";
  },

  async carregar() {
    try {
      const dados = await api.restGet(
        "contas_pagar",
        "select=*&status=neq.pago&order=vencimento.asc&limit=20000"
      );

      this.dados = Array.isArray(dados) ? dados : [];
      this.filtrados = [...this.dados];

      this.selecionados.forEach(id => {
        if (!this.dados.some(item => Number(item.id) === Number(id))) {
          this.selecionados.delete(id);
        }
      });

      this.renderizar();
      this.atualizarToggleUI();
    } catch (erro) {
      console.error("Erro ao carregar contas a pagar:", erro);
      alert("Erro ao carregar contas a pagar.");
    }
  },

  toggleInput(tipo) {
    this.inputs[tipo] = !this.inputs[tipo];
    this.atualizarToggleUI();
  },

  atualizarToggleUI() {
    const btnNfe = this.get("btnNfe");
    const btnBoleto = this.get("btnBoleto");

    if (btnNfe) {
      btnNfe.classList.toggle("ativo", !!this.inputs.nfe);
      btnNfe.classList.toggle("active", !!this.inputs.nfe);

      const txt = btnNfe.querySelector(".toggle-text");
      if (txt) txt.textContent = this.inputs.nfe ? "NFE recebida" : "Não recebida";
    }

    if (btnBoleto) {
      btnBoleto.classList.toggle("ativo", !!this.inputs.boleto);
      btnBoleto.classList.toggle("active", !!this.inputs.boleto);

      const txt = btnBoleto.querySelector(".toggle-text");
      if (txt) txt.textContent = this.inputs.boleto ? "Boleto recebido" : "Não recebido";
    }
  },

  resetToggles() {
    this.inputs = {
      nfe: false,
      boleto: false
    };

    this.atualizarToggleUI();
  },

  async salvar() {
    try {
      const payload = {
        fornecedor: this.valor("cpFornecedor").trim(),
        documento: this.valor("cpDocumento").trim(),
        valor: this.numero(this.valor("cpValor")),
        vencimento: this.valor("cpVencimento"),
        categoria: this.normalizarTexto(this.valor("cpCategoria")),
        descricao: this.valor("cpDescricao").trim(),
        tem_nfe: !!this.inputs.nfe,
        tem_boleto: !!this.inputs.boleto,
        status: "pendente"
      };

      if (!payload.fornecedor || !payload.valor || !payload.vencimento) {
        alert("Preencha fornecedor, valor e vencimento.");
        return;
      }

      if (this.editandoId) {
        await api.update("contas_pagar", this.editandoId, payload);
        this.editandoId = null;
        alert("Conta atualizada com sucesso.");
      } else {
        await api.insert("contas_pagar", payload);
        alert("Conta lançada com sucesso.");
      }

      this.limparFormulario();
      await this.carregar();
    } catch (erro) {
      console.error("Erro ao salvar conta:", erro);
      alert("Erro ao salvar conta.");
    }
  },

  limparFormulario() {
    [
      "cpFornecedor",
      "cpDocumento",
      "cpValor",
      "cpVencimento",
      "cpCategoria",
      "cpDescricao"
    ].forEach(id => {
      const el = this.get(id);
      if (el) el.value = "";
    });

    this.editandoId = null;
    this.resetToggles();

    const btnSalvar = document.querySelector(
      "#tab-contas-pagar .cp-form-actions .cp-btn-primary"
    );

    if (btnSalvar) btnSalvar.textContent = "Salvar conta";
  },

  editar(id) {
    const item = this.dados.find(c => Number(c.id) === Number(id));
    if (!item) return;

    this.editandoId = Number(item.id);

    this.get("cpFornecedor").value = item.fornecedor || "";
    this.get("cpDocumento").value = item.documento || "";
    this.get("cpValor").value = item.valor || "";
    this.get("cpVencimento").value = item.vencimento || "";
    this.get("cpCategoria").value = item.categoria || "";
    this.get("cpDescricao").value = item.descricao || "";

    this.inputs.nfe = !!item.tem_nfe;
    this.inputs.boleto = !!item.tem_boleto;
    this.atualizarToggleUI();

    const btnSalvar = document.querySelector(
      "#tab-contas-pagar .cp-form-actions .cp-btn-primary"
    );

    if (btnSalvar) btnSalvar.textContent = "Atualizar conta";

    window.scrollTo({ top: 0, behavior: "smooth" });
  },

  aplicarFiltros() {
    const busca = this.valor("cpBusca").toLowerCase();
    const fornecedor = this.valor("cpFiltroFornecedor").toLowerCase();
    const categoria = this.valor("cpFiltroCategoria").toLowerCase();
    const inicio = this.valor("cpVencimentoInicio");
    const fim = this.valor("cpVencimentoFim");

    this.filtrados = this.dados.filter(item => {
      const texto = [
        item.fornecedor,
        item.documento,
        item.categoria,
        item.descricao
      ].join(" ").toLowerCase();

      if (busca && !texto.includes(busca)) return false;
      if (fornecedor && !String(item.fornecedor || "").toLowerCase().includes(fornecedor)) return false;
      if (categoria && !String(item.categoria || "").toLowerCase().includes(categoria)) return false;
      if (inicio && String(item.vencimento || "") < inicio) return false;
      if (fim && String(item.vencimento || "") > fim) return false;

      return true;
    });

    this.renderizar();
  },

  limparFiltros() {
    [
      "cpBusca",
      "cpFiltroFornecedor",
      "cpFiltroCategoria",
      "cpVencimentoInicio",
      "cpVencimentoFim"
    ].forEach(id => {
      const el = this.get(id);
      if (el) el.value = "";
    });

    this.filtrados = [...this.dados];
    this.renderizar();
  },

  selecionarTodos() {
    this.filtrados.forEach(item => {
      this.selecionados.add(Number(item.id));
    });

    this.renderizar();
  },

  limparSelecao() {
    this.selecionados.clear();
    this.renderizar();
  },

  toggleSelecionado(id, checked) {
    id = Number(id);

    if (checked) {
      this.selecionados.add(id);
    } else {
      this.selecionados.delete(id);
    }

    this.renderizar();
  },

  toggleSelecionadoLinha(id, event) {
    const tag = event.target.tagName.toLowerCase();

    if (["button", "input", "label", "span"].includes(tag)) return;

    id = Number(id);

    if (this.selecionados.has(id)) {
      this.selecionados.delete(id);
    } else {
      this.selecionados.add(id);
    }

    this.renderizar();
  },

  async pagar(id) {
    try {
      if (!confirm("Confirmar pagamento desta conta?")) return;

      await api.update("contas_pagar", id, {
        status: "pago",
        data_pagamento: new Date().toISOString().slice(0, 10)
      });

      this.selecionados.delete(Number(id));

      await this.carregar();

      if (window.contasPagasModule?.carregar) {
        contasPagasModule.carregar();
      }
    } catch (erro) {
      console.error("Erro ao pagar conta:", erro);
      alert("Erro ao pagar conta.");
    }
  },

  async pagarSelecionadas() {
    try {
      if (!this.selecionados.size) {
        alert("Selecione pelo menos uma conta.");
        return;
      }

      if (!confirm(`Confirmar pagamento de ${this.selecionados.size} conta(s)?`)) return;

      const hoje = new Date().toISOString().slice(0, 10);

      for (const id of this.selecionados) {
        await api.update("contas_pagar", id, {
          status: "pago",
          data_pagamento: hoje
        });
      }

      this.selecionados.clear();

      await this.carregar();

      if (window.contasPagasModule?.carregar) {
        contasPagasModule.carregar();
      }

      alert("Contas pagas com sucesso.");
    } catch (erro) {
      console.error("Erro ao pagar selecionadas:", erro);
      alert("Erro ao pagar contas selecionadas.");
    }
  },

  async toggleNfe(id) {
    try {
      const item = this.dados.find(c => Number(c.id) === Number(id));
      if (!item) return;

      await api.update("contas_pagar", id, {
        tem_nfe: !item.tem_nfe
      });

      await this.carregar();
    } catch (erro) {
      console.error("Erro ao alterar NFE:", erro);
      alert("Erro ao alterar NFE.");
    }
  },

  async toggleBoleto(id) {
    try {
      const item = this.dados.find(c => Number(c.id) === Number(id));
      if (!item) return;

      await api.update("contas_pagar", id, {
        tem_boleto: !item.tem_boleto
      });

      await this.carregar();
    } catch (erro) {
      console.error("Erro ao alterar boleto:", erro);
      alert("Erro ao alterar boleto.");
    }
  },

  async excluir(id) {
    try {
      if (!confirm("Excluir esta conta?")) return;

      await api.request(`contas_pagar?id=eq.${id}`, "", "DELETE");

      this.selecionados.delete(Number(id));

      await this.carregar();
    } catch (erro) {
      console.error("Erro ao excluir conta:", erro);
      alert("Erro ao excluir conta.");
    }
  },

  async duplicar(id) {
    try {
      const item = this.dados.find(c => Number(c.id) === Number(id));
      if (!item) return;

      await api.insert("contas_pagar", {
        fornecedor: item.fornecedor,
        documento: item.documento,
        valor: item.valor,
        vencimento: item.vencimento,
        categoria: item.categoria,
        descricao: item.descricao,
        tem_nfe: item.tem_nfe,
        tem_boleto: item.tem_boleto,
        status: "pendente"
      });

      await this.carregar();

      alert("Conta duplicada com sucesso.");
    } catch (erro) {
      console.error("Erro ao duplicar conta:", erro);
      alert("Erro ao duplicar conta.");
    }
  },

  async importarExcel(event) {
    try {
      const arquivo = event?.target?.files?.[0];

      if (!arquivo) {
        alert("Selecione uma planilha.");
        return;
      }

      if (typeof XLSX === "undefined") {
        alert("Biblioteca XLSX não carregada.");
        return;
      }

      const buffer = await arquivo.arrayBuffer();

      const workbook = XLSX.read(buffer, {
        type: "array",
        cellDates: true
      });

      const aba = workbook.SheetNames[0];
      const sheet = workbook.Sheets[aba];

      const linhas = XLSX.utils.sheet_to_json(sheet, {
        defval: "",
        raw: false
      });

      const registros = [];
      let ignoradas = 0;

      linhas.forEach(linha => {
        const fornecedor = String(this.pegarCampo(linha, ["FORNECEDOR", "EMPRESA", "NOME"]) || "").trim();
        const documento = String(this.pegarCampo(linha, ["DOCUMENTO", "NF", "NFE", "NOTA", "NOTA FISCAL", "PEDIDO", "FAT", "FATURA"]) || "").trim();
        const valor = this.numero(this.pegarCampo(linha, ["VALOR", "TOTAL", "VALOR TOTAL", "VALOR PAGO", "VLR"]));
        const vencimento = this.dataISO(this.pegarCampo(linha, ["VENCIMENTO", "DATA VENCIMENTO", "DATA DE VENCIMENTO", "VENCE", "DATA"]));
        const categoria = this.normalizarTexto(this.pegarCampo(linha, ["CATEGORIA", "TIPO", "GRUPO", "CLASSE", "CLASSIFICAÇÃO", "CLASSIFICACAO"]));
        const descricao = String(this.pegarCampo(linha, ["DESCRICAO", "DESCRIÇÃO", "OBS", "OBSERVACAO", "OBSERVAÇÃO", "HISTORICO", "HISTÓRICO"]) || "").trim();
        const nfe = this.booleano(this.pegarCampo(linha, ["NFE", "NF-E", "NOTA FISCAL", "TEM NFE", "NFE RECEBIDA"]));
        const boleto = this.booleano(this.pegarCampo(linha, ["BOLETO", "TEM BOLETO", "BOLETO RECEBIDO"]));

        if (fornecedor && valor > 0 && vencimento) {
          registros.push({
            fornecedor,
            documento,
            valor,
            vencimento,
            categoria,
            descricao,
            tem_nfe: nfe,
            tem_boleto: boleto,
            status: "pendente"
          });
        } else {
          ignoradas++;
        }
      });

      if (!registros.length) {
        alert("Nenhuma linha válida encontrada.");
        return;
      }

      if (!confirm(`Importar ${registros.length} contas?\nLinhas ignoradas: ${ignoradas}`)) return;

      for (const item of registros) {
        await api.insert("contas_pagar", item);
      }

      if (event?.target) event.target.value = "";

      await this.carregar();

      alert(`${registros.length} contas importadas com sucesso.`);
    } catch (erro) {
      console.error("Erro ao importar Excel:", erro);
      alert("Erro ao importar Excel.");
    }
  },

  exportarExcel() {
    try {
      if (typeof XLSX === "undefined") {
        alert("Biblioteca XLSX não carregada.");
        return;
      }

      const lista = this.filtrados?.length ? this.filtrados : this.dados;

      if (!lista.length) {
        alert("Não há dados para exportar.");
        return;
      }

      const linhas = lista.map(item => ({
        FORNECEDOR: item.fornecedor || "",
        DOCUMENTO: item.documento || "",
        VALOR: this.numero(item.valor),
        VENCIMENTO: item.vencimento || "",
        CATEGORIA: item.categoria || "",
        DESCRICAO: item.descricao || "",
        NFE: item.tem_nfe ? "SIM" : "NÃO",
        BOLETO: item.tem_boleto ? "SIM" : "NÃO",
        STATUS: item.status || "pendente"
      }));

      const ws = XLSX.utils.json_to_sheet(linhas);

      ws["!cols"] = [
        { wch: 28 },
        { wch: 18 },
        { wch: 14 },
        { wch: 16 },
        { wch: 16 },
        { wch: 34 },
        { wch: 10 },
        { wch: 12 },
        { wch: 14 }
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Contas a Pagar");

      const hoje = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `contas-a-pagar-${hoje}.xlsx`);
    } catch (erro) {
      console.error("Erro ao exportar Excel:", erro);
      alert("Erro ao exportar Excel.");
    }
  },

  baixarModelo() {
    try {
      if (typeof XLSX === "undefined") {
        alert("Biblioteca XLSX não carregada.");
        return;
      }

      const modelo = [
        {
          FORNECEDOR: "Fornecedor Exemplo",
          DOCUMENTO: "NF 12345",
          VALOR: 1500.75,
          VENCIMENTO: "2026-05-30",
          CATEGORIA: "MP",
          DESCRICAO: "Compra de material",
          NFE: "SIM",
          BOLETO: "SIM"
        }
      ];

      const ws = XLSX.utils.json_to_sheet(modelo);

      ws["!cols"] = [
        { wch: 28 },
        { wch: 18 },
        { wch: 14 },
        { wch: 16 },
        { wch: 16 },
        { wch: 34 },
        { wch: 10 },
        { wch: 12 }
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Modelo");

      XLSX.writeFile(wb, "modelo-importacao-contas-a-pagar.xlsx");
    } catch (erro) {
      console.error("Erro ao baixar modelo:", erro);
      alert("Erro ao baixar modelo.");
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

    const hoje = new Date().toISOString().slice(0, 10);

    tbody.innerHTML = lista.map(item => {
      const id = Number(item.id);
      const marcado = this.selecionados.has(id);

      const vencida = item.vencimento && String(item.vencimento) < hoje;
      const documentosOk = !!item.tem_nfe && !!item.tem_boleto;

      let classeStatus = "linha-alerta";

      if (documentosOk) classeStatus = "linha-ok";
      if (vencida) classeStatus = "linha-vencida";
      if (marcado) classeStatus = "linha-selecionada";

      return `
        <tr
          class="${classeStatus}"
          onclick="contasPagarModule.toggleSelecionadoLinha(${id}, event)"
        >
          <td class="cp-check-cell">
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
              type="button"
              class="doc-status ${item.tem_nfe ? "ok" : "pendente"}"
              onclick="event.stopPropagation(); contasPagarModule.toggleNfe(${id})"
            >
              ${item.tem_nfe ? "NFE OK" : "NFE"}
            </button>

            <button
              type="button"
              class="doc-status ${item.tem_boleto ? "ok" : "pendente"}"
              onclick="event.stopPropagation(); contasPagarModule.toggleBoleto(${id})"
            >
              ${item.tem_boleto ? "Boleto OK" : "Boleto"}
            </button>
          </td>

          <td>
            <button type="button" class="btn-editar" onclick="event.stopPropagation(); contasPagarModule.editar(${id})">Editar</button>
            <button type="button" class="btn-duplicar" onclick="event.stopPropagation(); contasPagarModule.duplicar(${id})">Duplicar</button>
            <button type="button" class="btn-pagar" onclick="event.stopPropagation(); contasPagarModule.pagar(${id})">Pagar</button>
            <button type="button" class="btn-excluir" onclick="event.stopPropagation(); contasPagarModule.excluir(${id})">Excluir</button>
          </td>
        </tr>
      `;
    }).join("");

    this.resumo();
  },

  resumo() {
    const total = this.filtrados.reduce(
      (acc, item) => acc + this.numero(item.valor),
      0
    );

    const selecionadas = this.filtrados.filter(item =>
      this.selecionados.has(Number(item.id))
    );

    const totalSelecionado = selecionadas.reduce(
      (acc, item) => acc + this.numero(item.valor),
      0
    );

    if (this.get("cpQtd")) this.get("cpQtd").textContent = this.filtrados.length;
    if (this.get("cpTotal")) this.get("cpTotal").textContent = this.moeda(total);
    if (this.get("cpSelecionadas")) this.get("cpSelecionadas").textContent = selecionadas.length;
    if (this.get("cpTotalSelecionado")) this.get("cpTotalSelecionado").textContent = this.moeda(totalSelecionado);
  }
};
