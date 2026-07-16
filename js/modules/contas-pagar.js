window.contasPagarModule = {
  dados: [],
  filtrados: [],
  selecionados: new Set(),
  editandoId: null,

  filtros: {
    busca: "",
    fornecedor: "",
    categoria: "",
    inicio: "",
    fim: ""
  },

  inputs: {
    nfe: false,
    boleto: false
  },

  // ======================================================
  // HELPERS
  // ======================================================

  get(id) {
    return document.getElementById(id);
  },

  valor(id) {
    return this.get(id)?.value || "";
  },

  normalizarTexto(texto) {
    return String(texto || "")
      .trim()
      .toUpperCase();
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
    if (typeof valor === "number") {
      return isNaN(valor) ? 0 : valor;
    }

    if (
      valor === null ||
      valor === undefined ||
      valor === ""
    ) {
      return 0;
    }

    let txt = String(valor)
      .trim()
      .replace(/R\$/gi, "")
      .replace(/\s/g, "")
      .replace(/[^\d,.-]/g, "");

    if (!txt) return 0;

    // Formato brasileiro completo: 1.234,56
    if (txt.includes(".") && txt.includes(",")) {
      txt = txt
        .replace(/\./g, "")
        .replace(",", ".");
    }

    // Formato brasileiro sem separador de milhar: 1234,56
    else if (txt.includes(",")) {
      txt = txt.replace(",", ".");
    }

    // Formato de milhar sem centavos: 1.000
    else if (/^-?\d{1,3}(\.\d{3})+$/.test(txt)) {
      txt = txt.replace(/\./g, "");
    }

    const n = Number(txt);

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

    const d = new Date(`${String(data)}T00:00:00`);

    if (isNaN(d.getTime())) {
      return String(data);
    }

    return d.toLocaleDateString("pt-BR");
  },

  dataISO(valor) {
    if (!valor) return "";

    if (
      valor instanceof Date &&
      !isNaN(valor.getTime())
    ) {
      return valor.toISOString().slice(0, 10);
    }

    // Número serial do Excel
    if (
      typeof valor === "number" &&
      typeof XLSX !== "undefined" &&
      XLSX.SSF?.parse_date_code
    ) {
      const dataExcel = XLSX.SSF.parse_date_code(valor);

      if (dataExcel) {
        const ano = String(dataExcel.y).padStart(4, "0");
        const mes = String(dataExcel.m).padStart(2, "0");
        const dia = String(dataExcel.d).padStart(2, "0");

        return `${ano}-${mes}-${dia}`;
      }
    }

    const texto = String(valor).trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
      return texto;
    }

    if (/^\d{2}\/\d{2}\/\d{4}$/.test(texto)) {
      const [dia, mes, ano] = texto.split("/");
      return `${ano}-${mes}-${dia}`;
    }

    const d = new Date(texto);

    if (!isNaN(d.getTime())) {
      return d.toISOString().slice(0, 10);
    }

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

  escaparHtml(valor) {
    return String(valor ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  },

  // ======================================================
  // ESTADO DOS FILTROS
  // ======================================================

  capturarFiltros() {
    this.filtros = {
      busca: this.valor("cpBusca"),
      fornecedor: this.valor("cpFiltroFornecedor"),
      categoria: this.valor("cpFiltroCategoria"),
      inicio: this.valor("cpVencimentoInicio"),
      fim: this.valor("cpVencimentoFim")
    };

    return { ...this.filtros };
  },

  preencherCamposFiltros() {
    const campos = {
      cpBusca: this.filtros.busca,
      cpFiltroFornecedor: this.filtros.fornecedor,
      cpFiltroCategoria: this.filtros.categoria,
      cpVencimentoInicio: this.filtros.inicio,
      cpVencimentoFim: this.filtros.fim
    };

    Object.entries(campos).forEach(([id, valor]) => {
      const el = this.get(id);

      if (el) {
        el.value = valor || "";
      }
    });
  },

  possuiFiltroAtivo() {
    return Object.values(this.filtros).some(valor =>
      String(valor || "").trim() !== ""
    );
  },

  // ======================================================
  // CARREGAMENTO
  // ======================================================

  async carregar() {
    try {
      /*
       * Antes de atualizar os dados, capturamos os filtros
       * que ainda estão preenchidos na tela.
       */
      this.capturarFiltros();

      const dados = await api.restGet(
        "contas_pagar",
        "select=*&status=neq.pago&order=vencimento.asc&limit=20000"
      );

      this.dados = Array.isArray(dados)
        ? dados
        : [];

      /*
       * Remove da seleção IDs que deixaram de existir
       * ou que passaram para contas pagas.
       */
      [...this.selecionados].forEach(id => {
        const existe = this.dados.some(item =>
          Number(item.id) === Number(id)
        );

        if (!existe) {
          this.selecionados.delete(Number(id));
        }
      });

      this.preencherCamposFiltros();
      this.aplicarFiltros(false);
      this.atualizarToggleUI();
    } catch (erro) {
      console.error(
        "Erro ao carregar contas a pagar:",
        erro
      );

      alert("Erro ao carregar contas a pagar.");
    }
  },

  // ======================================================
  // TOGGLES DO FORMULÁRIO
  // ======================================================

  toggleInput(tipo) {
    if (!Object.prototype.hasOwnProperty.call(this.inputs, tipo)) {
      return;
    }

    this.inputs[tipo] = !this.inputs[tipo];
    this.atualizarToggleUI();
  },

  atualizarToggleUI() {
    const btnNfe = this.get("btnNfe");
    const btnBoleto = this.get("btnBoleto");

    if (btnNfe) {
      btnNfe.classList.toggle(
        "ativo",
        !!this.inputs.nfe
      );

      btnNfe.classList.toggle(
        "active",
        !!this.inputs.nfe
      );

      const texto = btnNfe.querySelector(".toggle-text");

      if (texto) {
        texto.textContent = this.inputs.nfe
          ? "NFE recebida"
          : "Não recebida";
      }
    }

    if (btnBoleto) {
      btnBoleto.classList.toggle(
        "ativo",
        !!this.inputs.boleto
      );

      btnBoleto.classList.toggle(
        "active",
        !!this.inputs.boleto
      );

      const texto = btnBoleto.querySelector(".toggle-text");

      if (texto) {
        texto.textContent = this.inputs.boleto
          ? "Boleto recebido"
          : "Não recebido";
      }
    }
  },

  resetToggles() {
    this.inputs = {
      nfe: false,
      boleto: false
    };

    this.atualizarToggleUI();
  },

  // ======================================================
  // SALVAR / EDITAR
  // ======================================================

  async salvar() {
    try {
      this.capturarFiltros();

      const payload = {
        fornecedor: this.valor("cpFornecedor").trim(),
        documento: this.valor("cpDocumento").trim(),
        valor: this.numero(this.valor("cpValor")),
        vencimento: this.valor("cpVencimento"),
        categoria: this.normalizarTexto(
          this.valor("cpCategoria")
        ),
        descricao: this.valor("cpDescricao").trim(),
        tem_nfe: !!this.inputs.nfe,
        tem_boleto: !!this.inputs.boleto,
        status: "pendente"
      };

      if (
        !payload.fornecedor ||
        payload.valor <= 0 ||
        !payload.vencimento
      ) {
        alert(
          "Preencha fornecedor, valor e vencimento."
        );
        return;
      }

      if (this.editandoId) {
        await api.update(
          "contas_pagar",
          this.editandoId,
          payload
        );

        alert("Conta atualizada com sucesso.");
      } else {
        await api.insert(
          "contas_pagar",
          payload
        );

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

      if (el) {
        el.value = "";
      }
    });

    this.editandoId = null;
    this.resetToggles();

    const btnSalvar = document.querySelector(
      "#tab-contas-pagar .cp-form-actions .cp-btn-primary"
    );

    if (btnSalvar) {
      btnSalvar.textContent = "Salvar conta";
    }
  },

  editar(id) {
    const item = this.dados.find(conta =>
      Number(conta.id) === Number(id)
    );

    if (!item) {
      alert("Conta não encontrada.");
      return;
    }

    this.capturarFiltros();
    this.editandoId = Number(item.id);

    const campos = {
      cpFornecedor: item.fornecedor,
      cpDocumento: item.documento,
      cpValor: item.valor,
      cpVencimento: item.vencimento,
      cpCategoria: item.categoria,
      cpDescricao: item.descricao
    };

    Object.entries(campos).forEach(([idCampo, valor]) => {
      const el = this.get(idCampo);

      if (el) {
        el.value = valor ?? "";
      }
    });

    this.inputs.nfe = !!item.tem_nfe;
    this.inputs.boleto = !!item.tem_boleto;

    this.atualizarToggleUI();

    const btnSalvar = document.querySelector(
      "#tab-contas-pagar .cp-form-actions .cp-btn-primary"
    );

    if (btnSalvar) {
      btnSalvar.textContent = "Atualizar conta";
    }

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  },

  // ======================================================
  // FILTROS
  // ======================================================

  aplicarFiltros(capturar = true) {
    if (capturar) {
      this.capturarFiltros();
    }

    const busca = String(this.filtros.busca || "")
      .trim()
      .toLowerCase();

    const fornecedor = String(
      this.filtros.fornecedor || ""
    )
      .trim()
      .toLowerCase();

    const categoria = String(
      this.filtros.categoria || ""
    )
      .trim()
      .toLowerCase();

    const inicio = this.filtros.inicio || "";
    const fim = this.filtros.fim || "";

    this.filtrados = this.dados.filter(item => {
      const textoGeral = [
        item.fornecedor,
        item.documento,
        item.categoria,
        item.descricao
      ]
        .map(valor => String(valor || ""))
        .join(" ")
        .toLowerCase();

      if (
        busca &&
        !textoGeral.includes(busca)
      ) {
        return false;
      }

      if (
        fornecedor &&
        !String(item.fornecedor || "")
          .toLowerCase()
          .includes(fornecedor)
      ) {
        return false;
      }

      if (
        categoria &&
        !String(item.categoria || "")
          .toLowerCase()
          .includes(categoria)
      ) {
        return false;
      }

      const vencimento = String(
        item.vencimento || ""
      );

      if (
        inicio &&
        vencimento < inicio
      ) {
        return false;
      }

      if (
        fim &&
        vencimento > fim
      ) {
        return false;
      }

      return true;
    });

    this.renderizar();
  },

  limparFiltros() {
    this.filtros = {
      busca: "",
      fornecedor: "",
      categoria: "",
      inicio: "",
      fim: ""
    };

    this.preencherCamposFiltros();

    this.filtrados = [...this.dados];
    this.renderizar();
  },

  // ======================================================
  // SELEÇÃO
  // ======================================================

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

  toggleSelecionado(id, marcado) {
    const contaId = Number(id);

    if (marcado) {
      this.selecionados.add(contaId);
    } else {
      this.selecionados.delete(contaId);
    }

    this.renderizar();
  },

  toggleSelecionadoLinha(id, event) {
    const alvo = event?.target;

    if (!alvo) return;

    if (
      alvo.closest(
        "button, input, label, a, select, textarea"
      )
    ) {
      return;
    }

    const contaId = Number(id);

    if (this.selecionados.has(contaId)) {
      this.selecionados.delete(contaId);
    } else {
      this.selecionados.add(contaId);
    }

    this.renderizar();
  },

  // ======================================================
  // PAGAMENTOS
  // ======================================================

  async pagar(id) {
    try {
      this.capturarFiltros();

      if (
        !confirm(
          "Confirmar pagamento desta conta?"
        )
      ) {
        return;
      }

      await api.update(
        "contas_pagar",
        id,
        {
          status: "pago",
          data_pagamento:
            new Date().toISOString().slice(0, 10)
        }
      );

      this.selecionados.delete(Number(id));

      await this.carregar();

      if (window.contasPagasModule?.carregar) {
        await contasPagasModule.carregar();
      }
    } catch (erro) {
      console.error("Erro ao pagar conta:", erro);
      alert("Erro ao pagar conta.");
    }
  },

  async pagarSelecionadas() {
    try {
      this.capturarFiltros();

      if (!this.selecionados.size) {
        alert("Selecione pelo menos uma conta.");
        return;
      }

      const idsValidos = [...this.selecionados].filter(id =>
        this.dados.some(item =>
          Number(item.id) === Number(id)
        )
      );

      if (!idsValidos.length) {
        alert("Nenhuma conta válida selecionada.");
        this.selecionados.clear();
        this.renderizar();
        return;
      }

      const confirmar = confirm(
        `Confirmar pagamento de ${idsValidos.length} conta(s)?`
      );

      if (!confirmar) return;

      const hoje = new Date()
        .toISOString()
        .slice(0, 10);

      for (const id of idsValidos) {
        await api.update(
          "contas_pagar",
          id,
          {
            status: "pago",
            data_pagamento: hoje
          }
        );
      }

      this.selecionados.clear();

      await this.carregar();

      if (window.contasPagasModule?.carregar) {
        await contasPagasModule.carregar();
      }

      alert("Contas pagas com sucesso.");
    } catch (erro) {
      console.error(
        "Erro ao pagar selecionadas:",
        erro
      );

      alert(
        "Erro ao pagar contas selecionadas."
      );
    }
  },

  // ======================================================
  // DOCUMENTOS
  // ======================================================

  async toggleNfe(id) {
    try {
      this.capturarFiltros();

      const item = this.dados.find(conta =>
        Number(conta.id) === Number(id)
      );

      if (!item) return;

      await api.update(
        "contas_pagar",
        id,
        {
          tem_nfe: !item.tem_nfe
        }
      );

      await this.carregar();
    } catch (erro) {
      console.error("Erro ao alterar NFE:", erro);
      alert("Erro ao alterar NFE.");
    }
  },

  async toggleBoleto(id) {
    try {
      this.capturarFiltros();

      const item = this.dados.find(conta =>
        Number(conta.id) === Number(id)
      );

      if (!item) return;

      await api.update(
        "contas_pagar",
        id,
        {
          tem_boleto: !item.tem_boleto
        }
      );

      await this.carregar();
    } catch (erro) {
      console.error(
        "Erro ao alterar boleto:",
        erro
      );

      alert("Erro ao alterar boleto.");
    }
  },

  // ======================================================
  // EXCLUSÃO / DUPLICAÇÃO
  // ======================================================

  async excluir(id) {
    try {
      this.capturarFiltros();

      if (
        !confirm("Excluir esta conta?")
      ) {
        return;
      }

      await api.request(
        `contas_pagar?id=eq.${id}`,
        "",
        "DELETE"
      );

      this.selecionados.delete(Number(id));

      await this.carregar();
    } catch (erro) {
      console.error("Erro ao excluir conta:", erro);
      alert("Erro ao excluir conta.");
    }
  },

  async duplicar(id) {
    try {
      this.capturarFiltros();

      const item = this.dados.find(conta =>
        Number(conta.id) === Number(id)
      );

      if (!item) {
        alert("Conta não encontrada.");
        return;
      }

      await api.insert(
        "contas_pagar",
        {
          fornecedor: item.fornecedor,
          documento: item.documento,
          valor: this.numero(item.valor),
          vencimento: item.vencimento,
          categoria: item.categoria,
          descricao: item.descricao,
          tem_nfe: !!item.tem_nfe,
          tem_boleto: !!item.tem_boleto,
          status: "pendente"
        }
      );

      await this.carregar();

      alert("Conta duplicada com sucesso.");
    } catch (erro) {
      console.error("Erro ao duplicar conta:", erro);
      alert("Erro ao duplicar conta.");
    }
  },

  // ======================================================
  // IMPORTAÇÃO E SINCRONIZAÇÃO POR EXCEL
  // ======================================================

  async importarExcel(event) {
    try {
      this.capturarFiltros();

      const arquivo =
        event?.target?.files?.[0];

      if (!arquivo) {
        alert("Selecione uma planilha.");
        return;
      }

      if (typeof XLSX === "undefined") {
        alert(
          "Biblioteca XLSX não carregada."
        );
        return;
      }

      const buffer =
        await arquivo.arrayBuffer();

      const workbook = XLSX.read(
        buffer,
        {
          type: "array",
          cellDates: true
        }
      );

      const aba = workbook.SheetNames[0];
      const sheet = workbook.Sheets[aba];

      const linhas =
        XLSX.utils.sheet_to_json(
          sheet,
          {
            defval: "",
            raw: true
          }
        );

      if (!linhas.length) {
        alert("A planilha está vazia.");

        if (event?.target) {
          event.target.value = "";
        }

        return;
      }

      const operacoes = [];
      let ignoradas = 0;

      linhas.forEach((linha, indice) => {
        const numeroLinha = indice + 2;

        const idOriginal = this.pegarCampo(
          linha,
          [
            "ID",
            "CODIGO",
            "CÓDIGO"
          ]
        );

        const id =
          Number(idOriginal) || null;

        let acao = this.normalizarTexto(
          this.pegarCampo(
            linha,
            [
              "ACAO",
              "AÇÃO",
              "OPERACAO",
              "OPERAÇÃO"
            ]
          )
        );

        const fornecedor = String(
          this.pegarCampo(
            linha,
            [
              "FORNECEDOR",
              "EMPRESA",
              "NOME"
            ]
          ) || ""
        ).trim();

        const documento = String(
          this.pegarCampo(
            linha,
            [
              "DOCUMENTO",
              "NF",
              "NFE",
              "NOTA",
              "NOTA FISCAL",
              "PEDIDO",
              "FAT",
              "FATURA"
            ]
          ) || ""
        ).trim();

        const valor = this.numero(
          this.pegarCampo(
            linha,
            [
              "VALOR",
              "TOTAL",
              "VALOR TOTAL",
              "VALOR PAGO",
              "VLR"
            ]
          )
        );

        const vencimento = this.dataISO(
          this.pegarCampo(
            linha,
            [
              "VENCIMENTO",
              "DATA VENCIMENTO",
              "DATA DE VENCIMENTO",
              "VENCE",
              "DATA"
            ]
          )
        );

        const categoria =
          this.normalizarTexto(
            this.pegarCampo(
              linha,
              [
                "CATEGORIA",
                "TIPO",
                "GRUPO",
                "CLASSE",
                "CLASSIFICAÇÃO",
                "CLASSIFICACAO"
              ]
            )
          );

        const descricao = String(
          this.pegarCampo(
            linha,
            [
              "DESCRICAO",
              "DESCRIÇÃO",
              "OBS",
              "OBSERVACAO",
              "OBSERVAÇÃO",
              "HISTORICO",
              "HISTÓRICO"
            ]
          ) || ""
        ).trim();

        const temNfe = this.booleano(
          this.pegarCampo(
            linha,
            [
              "NFE",
              "NF-E",
              "TEM NFE",
              "NFE RECEBIDA"
            ]
          )
        );

        const temBoleto = this.booleano(
          this.pegarCampo(
            linha,
            [
              "BOLETO",
              "TEM BOLETO",
              "BOLETO RECEBIDO"
            ]
          )
        );

        const statusOriginal =
          this.normalizarTexto(
            this.pegarCampo(
              linha,
              ["STATUS"]
            )
          ).toLowerCase();

        const status =
          statusOriginal || "pendente";

        if (!acao) {
          acao = id
            ? "ALTERAR"
            : "NOVO";
        }

        if (
          [
            "ATUALIZAR",
            "EDITAR",
            "UPDATE"
          ].includes(acao)
        ) {
          acao = "ALTERAR";
        }

        if (
          [
            "INSERIR",
            "CRIAR",
            "ADICIONAR",
            "INSERT"
          ].includes(acao)
        ) {
          acao = "NOVO";
        }

        if (
          [
            "DELETAR",
            "APAGAR",
            "DELETE"
          ].includes(acao)
        ) {
          acao = "EXCLUIR";
        }

        if (acao === "EXCLUIR") {
          if (!id) {
            ignoradas++;

            console.warn(
              `Linha ${numeroLinha}: exclusão sem ID.`
            );

            return;
          }

          operacoes.push({
            tipo: "excluir",
            id,
            numeroLinha
          });

          return;
        }

        if (
          !fornecedor ||
          valor <= 0 ||
          !vencimento
        ) {
          ignoradas++;

          console.warn(
            `Linha ${numeroLinha} ignorada: fornecedor, valor ou vencimento inválido.`
          );

          return;
        }

        const payload = {
          fornecedor,
          documento,
          valor,
          vencimento,
          categoria,
          descricao,
          tem_nfe: temNfe,
          tem_boleto: temBoleto,
          status
        };

        if (acao === "ALTERAR") {
          if (!id) {
            ignoradas++;

            console.warn(
              `Linha ${numeroLinha}: alteração sem ID.`
            );

            return;
          }

          operacoes.push({
            tipo: "alterar",
            id,
            payload,
            numeroLinha
          });

          return;
        }

        if (acao === "NOVO") {
          operacoes.push({
            tipo: "novo",
            payload: {
              ...payload,
              status: status || "pendente"
            },
            numeroLinha
          });

          return;
        }

        ignoradas++;

        console.warn(
          `Linha ${numeroLinha}: ação inválida "${acao}".`
        );
      });

      if (!operacoes.length) {
        alert(
          `Nenhuma operação válida encontrada.\n\nLinhas ignoradas: ${ignoradas}`
        );

        if (event?.target) {
          event.target.value = "";
        }

        return;
      }

      const qtdAlterar =
        operacoes.filter(
          operacao =>
            operacao.tipo === "alterar"
        ).length;

      const qtdNovas =
        operacoes.filter(
          operacao =>
            operacao.tipo === "novo"
        ).length;

      const qtdExcluir =
        operacoes.filter(
          operacao =>
            operacao.tipo === "excluir"
        ).length;

      const confirmar = confirm(
        `Resumo da importação:\n\n` +
        `Atualizar: ${qtdAlterar}\n` +
        `Criar novas: ${qtdNovas}\n` +
        `Excluir: ${qtdExcluir}\n` +
        `Ignoradas: ${ignoradas}\n\n` +
        `Deseja continuar?`
      );

      if (!confirmar) {
        if (event?.target) {
          event.target.value = "";
        }

        return;
      }

      let atualizadas = 0;
      let novas = 0;
      let excluidas = 0;
      let erros = 0;

      for (const operacao of operacoes) {
        try {
          if (operacao.tipo === "alterar") {
            const existe = this.dados.some(
              item =>
                Number(item.id) ===
                Number(operacao.id)
            );

            if (!existe) {
              console.warn(
                `Linha ${operacao.numeroLinha}: ID ${operacao.id} não encontrado nas contas em aberto.`
              );

              erros++;
              continue;
            }

            await api.update(
              "contas_pagar",
              operacao.id,
              operacao.payload
            );

            atualizadas++;
            continue;
          }

          if (operacao.tipo === "novo") {
            await api.insert(
              "contas_pagar",
              operacao.payload
            );

            novas++;
            continue;
          }

          if (operacao.tipo === "excluir") {
            const existe = this.dados.some(
              item =>
                Number(item.id) ===
                Number(operacao.id)
            );

            if (!existe) {
              console.warn(
                `Linha ${operacao.numeroLinha}: ID ${operacao.id} não encontrado para exclusão.`
              );

              erros++;
              continue;
            }

            await api.request(
              `contas_pagar?id=eq.${operacao.id}`,
              "",
              "DELETE"
            );

            this.selecionados.delete(
              Number(operacao.id)
            );

            excluidas++;
          }
        } catch (erroOperacao) {
          erros++;

          console.error(
            `Erro na linha ${operacao.numeroLinha}:`,
            erroOperacao
          );
        }
      }

      if (event?.target) {
        event.target.value = "";
      }

      await this.carregar();

      alert(
        `Importação concluída.\n\n` +
        `Atualizadas: ${atualizadas}\n` +
        `Novas: ${novas}\n` +
        `Excluídas: ${excluidas}\n` +
        `Ignoradas: ${ignoradas}\n` +
        `Erros: ${erros}`
      );
    } catch (erro) {
      console.error(
        "Erro ao importar Excel:",
        erro
      );

      if (event?.target) {
        event.target.value = "";
      }

      alert("Erro ao importar Excel.");
    }
  },

  // ======================================================
  // EXPORTAÇÃO
  // ======================================================

  exportarExcel() {
    try {
      if (typeof XLSX === "undefined") {
        alert(
          "Biblioteca XLSX não carregada."
        );
        return;
      }

      this.capturarFiltros();

      /*
       * Se existir qualquer filtro ativo, exporta exatamente
       * o resultado filtrado, mesmo que o resultado seja vazio.
       */
      const lista = this.possuiFiltroAtivo()
        ? this.filtrados
        : this.dados;

      if (!lista.length) {
        alert(
          "Não há dados para exportar com os filtros atuais."
        );
        return;
      }

      const linhas = lista.map(item => ({
        ID: Number(item.id),
        ACAO: "ALTERAR",
        FORNECEDOR: item.fornecedor || "",
        DOCUMENTO: item.documento || "",
        VALOR: this.numero(item.valor),
        VENCIMENTO: item.vencimento || "",
        CATEGORIA: item.categoria || "",
        DESCRICAO: item.descricao || "",
        NFE: item.tem_nfe ? "SIM" : "NÃO",
        BOLETO: item.tem_boleto
          ? "SIM"
          : "NÃO",
        STATUS: item.status || "pendente"
      }));

      linhas.push({
        ID: "",
        ACAO: "NOVO",
        FORNECEDOR: "",
        DOCUMENTO: "",
        VALOR: "",
        VENCIMENTO: "",
        CATEGORIA: "",
        DESCRICAO: "",
        NFE: "NÃO",
        BOLETO: "NÃO",
        STATUS: "pendente"
      });

      const planilha =
        XLSX.utils.json_to_sheet(linhas);

      planilha["!cols"] = [
        { wch: 10 },
        { wch: 13 },
        { wch: 30 },
        { wch: 22 },
        { wch: 15 },
        { wch: 16 },
        { wch: 18 },
        { wch: 38 },
        { wch: 10 },
        { wch: 12 },
        { wch: 14 }
      ];

      if (planilha["!ref"]) {
        const intervalo =
          XLSX.utils.decode_range(
            planilha["!ref"]
          );

        for (
          let linha = intervalo.s.r + 1;
          linha <= intervalo.e.r;
          linha++
        ) {
          const endereco =
            XLSX.utils.encode_cell({
              r: linha,
              c: 4
            });

          if (
            planilha[endereco] &&
            typeof planilha[endereco].v ===
              "number"
          ) {
            planilha[endereco].z =
              '#,##0.00';
          }
        }
      }

      const instrucoes = [
        {
          CAMPO: "ACAO",
          PREENCHIMENTO: "ALTERAR",
          EXPLICACAO:
            "Atualiza a conta correspondente ao ID."
        },
        {
          CAMPO: "ACAO",
          PREENCHIMENTO: "NOVO",
          EXPLICACAO:
            "Cria uma nova conta. Deixe o ID vazio."
        },
        {
          CAMPO: "ACAO",
          PREENCHIMENTO: "EXCLUIR",
          EXPLICACAO:
            "Exclui definitivamente a conta correspondente ao ID."
        },
        {
          CAMPO: "ID",
          PREENCHIMENTO: "NÃO ALTERAR",
          EXPLICACAO:
            "Identificador usado pelo sistema para localizar a conta."
        },
        {
          CAMPO: "VENCIMENTO",
          PREENCHIMENTO: "AAAA-MM-DD",
          EXPLICACAO:
            "Exemplo: 2026-07-31."
        },
        {
          CAMPO: "NFE / BOLETO",
          PREENCHIMENTO: "SIM ou NÃO",
          EXPLICACAO:
            "Indica se os documentos já foram recebidos."
        }
      ];

      const planilhaInstrucoes =
        XLSX.utils.json_to_sheet(
          instrucoes
        );

      planilhaInstrucoes["!cols"] = [
        { wch: 18 },
        { wch: 22 },
        { wch: 65 }
      ];

      const workbook =
        XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(
        workbook,
        planilha,
        "Contas a Pagar"
      );

      XLSX.utils.book_append_sheet(
        workbook,
        planilhaInstrucoes,
        "Instruções"
      );

      const hoje = new Date()
        .toISOString()
        .slice(0, 10);

      XLSX.writeFile(
        workbook,
        `contas-a-pagar-edicao-${hoje}.xlsx`
      );
    } catch (erro) {
      console.error(
        "Erro ao exportar Excel:",
        erro
      );

      alert("Erro ao exportar Excel.");
    }
  },

  baixarModelo() {
    try {
      if (typeof XLSX === "undefined") {
        alert(
          "Biblioteca XLSX não carregada."
        );
        return;
      }

      const modelo = [
        {
          ID: "",
          ACAO: "NOVO",
          FORNECEDOR: "Fornecedor Exemplo",
          DOCUMENTO: "NF 12345",
          VALOR: 1500.75,
          VENCIMENTO: "2026-07-31",
          CATEGORIA: "MP",
          DESCRICAO:
            "Compra de material",
          NFE: "SIM",
          BOLETO: "SIM",
          STATUS: "pendente"
        }
      ];

      const planilha =
        XLSX.utils.json_to_sheet(modelo);

      planilha["!cols"] = [
        { wch: 10 },
        { wch: 13 },
        { wch: 28 },
        { wch: 20 },
        { wch: 14 },
        { wch: 16 },
        { wch: 16 },
        { wch: 34 },
        { wch: 10 },
        { wch: 12 },
        { wch: 14 }
      ];

      const workbook =
        XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(
        workbook,
        planilha,
        "Modelo"
      );

      XLSX.writeFile(
        workbook,
        "modelo-importacao-contas-a-pagar.xlsx"
      );
    } catch (erro) {
      console.error(
        "Erro ao baixar modelo:",
        erro
      );

      alert("Erro ao baixar modelo.");
    }
  },

  // ======================================================
  // RENDERIZAÇÃO
  // ======================================================

  renderizar() {
    const tbody =
      this.get("tabelaContasPagar");

    if (!tbody) return;

    const lista = Array.isArray(this.filtrados)
      ? this.filtrados
      : [];

    if (!lista.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" class="muted">
            Nenhuma conta encontrada.
          </td>
        </tr>
      `;

      this.resumo();
      return;
    }

    const hoje = new Date()
      .toISOString()
      .slice(0, 10);

    tbody.innerHTML = lista
      .map(item => {
        const id = Number(item.id);
        const marcado =
          this.selecionados.has(id);

        const vencida =
          !!item.vencimento &&
          String(item.vencimento) < hoje;

        const documentosOk =
          !!item.tem_nfe &&
          !!item.tem_boleto;

        let classeStatus =
          "linha-alerta";

        if (documentosOk) {
          classeStatus = "linha-ok";
        }

        if (vencida) {
          classeStatus =
            "linha-vencida";
        }

        if (marcado) {
          classeStatus =
            "linha-selecionada";
        }

        const fornecedor =
          this.escaparHtml(
            item.fornecedor || "-"
          );

        const documento =
          this.escaparHtml(
            item.documento || "-"
          );

        const categoria =
          this.escaparHtml(
            item.categoria || "-"
          );

        const descricao =
          this.escaparHtml(
            item.descricao || "-"
          );

        return `
          <tr
            class="${classeStatus}"
            onclick="contasPagarModule.toggleSelecionadoLinha(${id}, event)"
          >
            <td class="cp-check-cell">
              <input
                type="checkbox"
                ${marcado ? "checked" : ""}
                aria-label="Selecionar conta ${id}"
                onclick="event.stopPropagation()"
                onchange="contasPagarModule.toggleSelecionado(${id}, this.checked)"
              >
            </td>

            <td>
              <strong>${fornecedor}</strong>
            </td>

            <td>${documento}</td>

            <td>
              <strong>
                ${this.moeda(item.valor)}
              </strong>
            </td>

            <td>
              ${this.dataBR(item.vencimento)}
            </td>

            <td>${categoria}</td>

            <td>${descricao}</td>

            <td>
              <button
                type="button"
                class="doc-status ${
                  item.tem_nfe
                    ? "ok"
                    : "pendente"
                }"
                onclick="event.stopPropagation(); contasPagarModule.toggleNfe(${id})"
              >
                ${
                  item.tem_nfe
                    ? "NFE OK"
                    : "NFE"
                }
              </button>

              <button
                type="button"
                class="doc-status ${
                  item.tem_boleto
                    ? "ok"
                    : "pendente"
                }"
                onclick="event.stopPropagation(); contasPagarModule.toggleBoleto(${id})"
              >
                ${
                  item.tem_boleto
                    ? "Boleto OK"
                    : "Boleto"
                }
              </button>
            </td>

            <td>
              <button
                type="button"
                class="btn-editar"
                onclick="event.stopPropagation(); contasPagarModule.editar(${id})"
              >
                Editar
              </button>

              <button
                type="button"
                class="btn-duplicar"
                onclick="event.stopPropagation(); contasPagarModule.duplicar(${id})"
              >
                Duplicar
              </button>

              <button
                type="button"
                class="btn-pagar"
                onclick="event.stopPropagation(); contasPagarModule.pagar(${id})"
              >
                Pagar
              </button>

              <button
                type="button"
                class="btn-excluir"
                onclick="event.stopPropagation(); contasPagarModule.excluir(${id})"
              >
                Excluir
              </button>
            </td>
          </tr>
        `;
      })
      .join("");

    this.resumo();
  },

  resumo() {
    const total = this.filtrados.reduce(
      (acumulado, item) =>
        acumulado +
        this.numero(item.valor),
      0
    );

    const selecionadas =
      this.filtrados.filter(item =>
        this.selecionados.has(
          Number(item.id)
        )
      );

    const totalSelecionado =
      selecionadas.reduce(
        (acumulado, item) =>
          acumulado +
          this.numero(item.valor),
        0
      );

    const cpQtd = this.get("cpQtd");
    const cpTotal = this.get("cpTotal");
    const cpSelecionadas =
      this.get("cpSelecionadas");
    const cpTotalSelecionado =
      this.get("cpTotalSelecionado");

    if (cpQtd) {
      cpQtd.textContent =
        this.filtrados.length;
    }

    if (cpTotal) {
      cpTotal.textContent =
        this.moeda(total);
    }

    if (cpSelecionadas) {
      cpSelecionadas.textContent =
        selecionadas.length;
    }

    if (cpTotalSelecionado) {
      cpTotalSelecionado.textContent =
        this.moeda(totalSelecionado);
    }
  }
};
