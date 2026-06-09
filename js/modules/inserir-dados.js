window.inserirDadosModule = {
  metas: [],
  faturamentos: [],

  // ======================================================
  // HELPERS
  // ======================================================

  get(id) {
    return document.getElementById(id);
  },

  valor(id) {
    return this.get(id)?.value || "";
  },

  numero(valor) {
    if (typeof valor === "number") {
      return isNaN(valor) ? 0 : valor;
    }

    if (valor === null || valor === undefined || valor === "") {
      return 0;
    }

    let txt = String(valor)
      .trim()
      .replace(/R\$/gi, "")
      .replace(/\s/g, "")
      .replace(/[^\d,.-]/g, "");

    if (!txt) return 0;

    // negativo contábil: (1.000,00)
    const negativoPorParenteses =
      String(valor).includes("(") && String(valor).includes(")");

    // formato BR completo: 1.000,00 / 10.864,02 / 1.234.567,89
    if (txt.includes(".") && txt.includes(",")) {
      txt = txt.replace(/\./g, "").replace(",", ".");
    }

    // formato BR sem milhar: 1000,00 / 958,66
    else if (txt.includes(",")) {
      txt = txt.replace(",", ".");
    }

    // formato com ponto de milhar: 1.000 / 10.000 / 100.000
    else if (/^-?\d{1,3}(\.\d{3})+$/.test(txt)) {
      txt = txt.replace(/\./g, "");
    }

    const n = Number(txt);

    if (isNaN(n)) return 0;

    return negativoPorParenteses ? Math.abs(n) : n;
  },

  moeda(valor) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(this.numero(valor));
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

  async carregar() {
    await Promise.all([
      this.listarMetas(),
      this.listarFaturamento(),
      this.carregarCategoriasMeta()
    ]);

    this.garantirAbaInicial();
  },

  garantirAbaInicial() {
    const existeAtiva = document.querySelector(
      "#tab-inserir-dados .input-tab.active"
    );

    if (existeAtiva) return;

    const primeiroBotao = document.querySelector(
      "#tab-inserir-dados .input-tab"
    );

    if (primeiroBotao) {
      window.inserirDadosUI("import", primeiroBotao);
    }
  },

  // ======================================================
  // CATEGORIAS
  // ======================================================

  async carregarCategoriasMeta() {
    try {
      const dados = await api.restGet(
        "gastos",
        "select=categoria&limit=20000"
      );

      const categorias = [
        ...new Set(
          (dados || [])
            .map(item => this.normalizarTexto(item.categoria))
            .filter(Boolean)
        )
      ].sort();

      const select = this.get("metaCategoria");

      if (!select) return;

      select.innerHTML = `
        <option value="">Selecione</option>
        ${categorias
          .map(cat => `<option value="${cat}">${cat}</option>`)
          .join("")}
      `;
    } catch (erro) {
      console.error("Erro ao carregar categorias:", erro);
    }
  },

  // ======================================================
  // METAS
  // ======================================================

  async salvarMetaPercentual() {
    try {
      const mes = this.valor("metaMes");
      const ano = String(this.valor("metaAno"));
      const categoria = this.normalizarTexto(this.valor("metaCategoria"));
      const percentual_meta = this.numero(this.valor("metaPercentual"));

      if (!mes || !ano || !categoria || !percentual_meta) {
        alert("Preencha todos os campos.");
        return;
      }

      const existentes = await api.restGet(
        "metas",
        `select=*&mes=eq.${encodeURIComponent(mes)}&ano=eq.${encodeURIComponent(ano)}&categoria=eq.${encodeURIComponent(categoria)}`
      );

      const payload = {
        mes,
        ano,
        categoria,
        percentual_meta
      };

      if (Array.isArray(existentes) && existentes.length) {
        await api.update("metas", existentes[0].id, payload);
      } else {
        await api.insert("metas", payload);
      }

      const percentualInput = this.get("metaPercentual");
      if (percentualInput) percentualInput.value = "";

      await this.listarMetas();

      if (window.dashboardModule?.carregar) {
        await dashboardModule.carregar();
      }

      alert("Meta salva com sucesso.");
    } catch (erro) {
      console.error("Erro ao salvar meta:", erro);
      alert("Erro ao salvar meta.");
    }
  },

  async listarMetas() {
    try {
      const dados = await api.restGet(
        "metas",
        "select=*&order=ano.desc,mes.asc,categoria.asc&limit=5000"
      );

      this.metas = Array.isArray(dados) ? dados : [];

      const tbody = this.get("tabelaMetasMensais");

      if (!tbody) return;

      if (!this.metas.length) {
        tbody.innerHTML = `
          <tr>
            <td colspan="5" class="muted">
              Nenhuma meta cadastrada.
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = this.metas
        .map(item => `
          <tr>
            <td>${item.mes || "-"}</td>
            <td>${item.ano || "-"}</td>
            <td><strong>${item.categoria || "-"}</strong></td>
            <td>${this.numero(item.percentual_meta)}%</td>
            <td>
              <button
                type="button"
                class="btn-excluir"
                onclick="inserirDadosModule.excluirMeta(${Number(item.id)})"
              >
                Excluir
              </button>
            </td>
          </tr>
        `)
        .join("");
    } catch (erro) {
      console.error("Erro ao listar metas:", erro);
    }
  },

  async excluirMeta(id) {
    if (!confirm("Excluir esta meta?")) return;

    try {
      await api.request(
        `metas?id=eq.${id}`,
        "",
        "DELETE"
      );

      await this.listarMetas();

      if (window.dashboardModule?.carregar) {
        await dashboardModule.carregar();
      }
    } catch (erro) {
      console.error("Erro ao excluir meta:", erro);
    }
  },

  // ======================================================
  // FATURAMENTO
  // ======================================================

  async salvarFaturamento() {
    try {
      const mes = this.valor("fatMes");
      const ano = String(this.valor("fatAno"));

      if (!mes || !ano) {
        alert("Informe mês e ano.");
        return;
      }

      const payload = {
        mes,
        ano,
        faturamento: this.numero(this.valor("fatValor")),
        faturado: this.numero(this.valor("fatFaturado")),
        a_faturar: this.numero(this.valor("fatAFaturar"))
      };

      const existentes = await api.restGet(
        "meses",
        `select=*&mes=eq.${encodeURIComponent(mes)}&ano=eq.${encodeURIComponent(ano)}`
      );

      if (Array.isArray(existentes) && existentes.length) {
        await api.update("meses", existentes[0].id, payload);
      } else {
        await api.insert("meses", payload);
      }

      ["fatValor", "fatFaturado", "fatAFaturar"].forEach(id => {
        const el = this.get(id);
        if (el) el.value = "";
      });

      await this.listarFaturamento();

      if (window.dashboardModule?.carregar) {
        await dashboardModule.carregar();
      }

      alert("Faturamento salvo com sucesso.");
    } catch (erro) {
      console.error("Erro ao salvar faturamento:", erro);
      alert("Erro ao salvar faturamento.");
    }
  },

  async listarFaturamento() {
    try {
      const dados = await api.restGet(
        "meses",
        "select=*&order=ano.desc,mes.asc&limit=5000"
      );

      this.faturamentos = Array.isArray(dados) ? dados : [];

      const tbody = this.get("tabelaFaturamentoMensal");

      if (!tbody) return;

      if (!this.faturamentos.length) {
        tbody.innerHTML = `
          <tr>
            <td colspan="6" class="muted">
              Nenhum faturamento cadastrado.
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = this.faturamentos
        .map(item => `
          <tr>
            <td>${item.mes || "-"}</td>
            <td>${item.ano || "-"}</td>
            <td>${this.moeda(item.faturamento)}</td>
            <td>${this.moeda(item.faturado)}</td>
            <td>${this.moeda(item.a_faturar)}</td>
            <td>
              <button
                type="button"
                class="btn-excluir"
                onclick="inserirDadosModule.excluirFaturamento(${Number(item.id)})"
              >
                Excluir
              </button>
            </td>
          </tr>
        `)
        .join("");
    } catch (erro) {
      console.error("Erro ao listar faturamento:", erro);
    }
  },

  async excluirFaturamento(id) {
    if (!confirm("Excluir faturamento?")) return;

    try {
      await api.request(
        `meses?id=eq.${id}`,
        "",
        "DELETE"
      );

      await this.listarFaturamento();

      if (window.dashboardModule?.carregar) {
        await dashboardModule.carregar();
      }
    } catch (erro) {
      console.error("Erro ao excluir faturamento:", erro);
    }
  },

  // ======================================================
  // IMPORTAR GASTOS
  // ======================================================

  obterValorPorChaves(linha, chavesPossiveis) {
    const mapa = {};

    Object.keys(linha || {}).forEach(chaveOriginal => {
      mapa[this.normalizarChave(chaveOriginal)] = linha[chaveOriginal];
    });

    for (const chave of chavesPossiveis) {
      const chaveNormalizada = this.normalizarChave(chave);

      if (
        mapa[chaveNormalizada] !== undefined &&
        mapa[chaveNormalizada] !== null &&
        mapa[chaveNormalizada] !== ""
      ) {
        return mapa[chaveNormalizada];
      }
    }

    return "";
  },

  async importarContasPagas() {
    try {
      const arquivo = this.get("importArquivo")?.files?.[0];

      if (!arquivo) {
        alert("Selecione uma planilha.");
        return;
      }

      if (typeof XLSX === "undefined") {
        alert("XLSX não carregado.");
        return;
      }

      const mes = this.valor("importMes");
      const ano = String(this.valor("importAno"));

      if (!mes || !ano) {
        alert("Informe mês e ano da importação.");
        return;
      }

      const antigos = await api.restGet(
        "gastos",
        `select=id&mes=eq.${encodeURIComponent(mes)}&ano=eq.${encodeURIComponent(ano)}&limit=20000`
      );

      if (Array.isArray(antigos) && antigos.length) {
        const confirmar = confirm(
          `Já existem ${antigos.length} registros para ${mes}/${ano}.\n\nDeseja substituir tudo?`
        );

        if (!confirmar) return;

        await api.request(
          `gastos?mes=eq.${encodeURIComponent(mes)}&ano=eq.${encodeURIComponent(ano)}`,
          "",
          "DELETE"
        );
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
        raw: true
      });

      if (!linhas.length) {
        alert("Planilha vazia.");
        return;
      }

      const registros = [];
      let ignoradas = 0;

      linhas.forEach(linha => {
        const categoriaOriginal = this.obterValorPorChaves(linha, [
          "CATEGORIA",
          "Categoria",
          "categoria",
          "TIPO",
          "GRUPO",
          "CLASSE",
          "CLASSIFICACAO",
          "CLASSIFICAÇÃO"
        ]);

        const valorOriginal = this.obterValorPorChaves(linha, [
          "VALOR",
          "Valor",
          "valor",
          "VALOR PAGO",
          "VALORPAGO",
          "TOTAL",
          "PAGO",
          "PAGAMENTO",
          "VLR",
          "DÉBITO",
          "DEBITO",
          "SAIDA",
          "SAÍDA"
        ]);

        const categoria = this.normalizarTexto(categoriaOriginal);
        const valor = this.numero(valorOriginal);

        const categoriaValida =
          categoria &&
          categoria !== "-" &&
          categoria !== "NULL" &&
          categoria !== "N/A";

        const valorValido =
          !isNaN(valor) &&
          Number(valor) > 0;

        if (categoriaValida && valorValido) {
          registros.push({
            mes,
            ano,
            categoria,
            valor: Number(valor)
          });
        } else {
          ignoradas++;
        }
      });

      console.log("REGISTROS VÁLIDOS:", registros);
      console.log("LINHAS IGNORADAS:", ignoradas);

      if (!registros.length) {
        alert("Nenhum registro válido encontrado.");
        return;
      }

      const confirmar = confirm(
        `Importar ${registros.length} registros para ${mes}/${ano}?\n\nLinhas ignoradas: ${ignoradas}`
      );

      if (!confirmar) return;

      for (const item of registros) {
        await api.insert("gastos", item);
      }

      const inputArquivo = this.get("importArquivo");
      if (inputArquivo) inputArquivo.value = "";

      await this.carregarCategoriasMeta();

      if (window.dashboardModule?.carregar) {
        await dashboardModule.carregar();
      }

      alert(`${registros.length} registros importados com sucesso.`);
    } catch (erro) {
      console.error("Erro ao importar:", erro);
      alert("Erro ao importar planilha.");
    }
  }
};

// ======================================================
// TABS INTERNAS
// ======================================================

window.inserirDadosUI = function(tipo, botao) {
  document
    .querySelectorAll("#tab-inserir-dados .input-section")
    .forEach(secao => {
      secao.style.display = "none";
    });

  document
    .querySelectorAll("#tab-inserir-dados .input-tab")
    .forEach(btn => {
      btn.classList.remove("active");
    });

  const secaoAtiva = document.querySelector(
    `#tab-inserir-dados .input-section[data-section="${tipo}"]`
  );

  if (secaoAtiva) {
    secaoAtiva.style.display = "block";
  }

  if (botao) {
    botao.classList.add("active");
  }
};

// ======================================================
// INIT
// ======================================================

window.carregarInserirDados = () => {
  inserirDadosModule.carregar();
};
