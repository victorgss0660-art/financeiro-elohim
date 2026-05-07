window.inserirDadosModule = {

  metas: [],
  faturamentos: [],

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

    if (valor === null || valor === undefined) {
      return 0;
    }

    let txt = String(valor).trim();

    if (!txt) return 0;

    txt = txt
      .replace(/R\$/gi, "")
      .replace(/\s/g, "")
      .replace(/[^\d,.-]/g, "");

    // 1.234,56
    if (txt.includes(".") && txt.includes(",")) {
      txt = txt.replace(/\./g, "").replace(",", ".");
    }

    // 1234,56
    else if (txt.includes(",")) {
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

  normalizarTexto(texto) {
    return String(texto || "")
      .trim()
      .toUpperCase();
  },

  async carregar() {

    await Promise.all([
      this.listarMetas(),
      this.listarFaturamento(),
      this.carregarCategoriasMeta()
    ]);
  },

  // ======================================================
  // CATEGORIAS DINÂMICAS
  // ======================================================

  async carregarCategoriasMeta() {

    try {

      const dados = await api.restGet(
        "gastos",
        "select=categoria"
      );

      const categorias = [
        ...new Set(
          (dados || [])
            .map(item =>
              this.normalizarTexto(item.categoria)
            )
            .filter(Boolean)
        )
      ].sort();

      const select = this.get("metaCategoria");

      if (!select) return;

      select.innerHTML = `
        <option value="">Selecione</option>

        ${categorias.map(cat => `
          <option value="${cat}">
            ${cat}
          </option>
        `).join("")}
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

      const categoria = this.normalizarTexto(
        this.valor("metaCategoria")
      );

      const percentual_meta = this.numero(
        this.valor("metaPercentual")
      );

      if (!mes || !ano || !categoria || !percentual_meta) {
        alert("Preencha mês, ano, categoria e percentual.");
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

      if (existentes?.length) {

        const confirmar = confirm(
          `Já existe meta para ${categoria} em ${mes}/${ano}.\n\nDeseja atualizar?`
        );

        if (!confirmar) return;

        await api.update(
          "metas",
          existentes[0].id,
          payload
        );

      } else {

        await api.insert(
          "metas",
          payload
        );
      }

      this.get("metaPercentual").value = "";

      await this.listarMetas();

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
        "select=*&order=ano.desc,mes.asc,categoria.asc"
      );

      this.metas = Array.isArray(dados)
        ? dados
        : [];

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

      tbody.innerHTML = this.metas.map(item => `

        <tr>

          <td>${item.mes || "-"}</td>

          <td>${item.ano || "-"}</td>

          <td>
            <strong>
              ${item.categoria || "-"}
            </strong>
          </td>

          <td>
            <strong>
              ${this.numero(item.percentual_meta)}%
            </strong>
          </td>

          <td>
            <button
              class="btn-excluir"
              onclick="inserirDadosModule.excluirMeta(${Number(item.id)})"
            >
              Excluir
            </button>
          </td>

        </tr>

      `).join("");

    } catch (erro) {

      console.error("Erro ao carregar metas:", erro);
      alert("Erro ao carregar metas.");
    }
  },

  async excluirMeta(id) {

    const confirmar = confirm(
      "Excluir esta meta?"
    );

    if (!confirmar) return;

    try {

      await api.request(
        `metas?id=eq.${id}`,
        "",
        "DELETE"
      );

      await this.listarMetas();

    } catch (erro) {

      console.error("Erro ao excluir meta:", erro);
      alert("Erro ao excluir meta.");
    }
  },

  // ======================================================
  // FATURAMENTO
  // ======================================================

  async salvarFaturamento() {

    try {

      const mes = this.valor("fatMes");
      const ano = String(this.valor("fatAno"));

      const payload = {
        mes,
        ano,
        faturamento: this.numero(this.valor("fatValor")),
        faturado: this.numero(this.valor("fatFaturado")),
        a_faturar: this.numero(this.valor("fatAFaturar"))
      };

      if (!mes || !ano) {
        alert("Informe mês e ano.");
        return;
      }

      const existentes = await api.restGet(
        "meses",
        `select=*&mes=eq.${encodeURIComponent(mes)}&ano=eq.${encodeURIComponent(ano)}`
      );

      if (existentes?.length) {

        const confirmar = confirm(
          `Já existe faturamento para ${mes}/${ano}.\n\nDeseja atualizar?`
        );

        if (!confirmar) return;

        await api.update(
          "meses",
          existentes[0].id,
          payload
        );

      } else {

        await api.insert(
          "meses",
          payload
        );
      }

      this.get("fatValor").value = "";
      this.get("fatFaturado").value = "";
      this.get("fatAFaturar").value = "";

      await this.listarFaturamento();

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
        "select=*&order=ano.desc,mes.asc"
      );

      this.faturamentos = Array.isArray(dados)
        ? dados
        : [];

      const tbody = this.get(
        "tabelaFaturamentoMensal"
      );

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

      tbody.innerHTML = this.faturamentos.map(item => `

        <tr>

          <td>${item.mes || "-"}</td>

          <td>${item.ano || "-"}</td>

          <td>
            <strong>
              ${this.moeda(item.faturamento)}
            </strong>
          </td>

          <td>
            ${this.moeda(item.faturado)}
          </td>

          <td>
            ${this.moeda(item.a_faturar)}
          </td>

          <td>
            <button
              class="btn-excluir"
              onclick="inserirDadosModule.excluirFaturamento(${Number(item.id)})"
            >
              Excluir
            </button>
          </td>

        </tr>

      `).join("");

    } catch (erro) {

      console.error("Erro ao carregar faturamento:", erro);
      alert("Erro ao carregar faturamento.");
    }
  },

  async excluirFaturamento(id) {

    const confirmar = confirm(
      "Excluir este faturamento?"
    );

    if (!confirmar) return;

    try {

      await api.request(
        `meses?id=eq.${id}`,
        "",
        "DELETE"
      );

      await this.listarFaturamento();

    } catch (erro) {

      console.error("Erro ao excluir faturamento:", erro);
      alert("Erro ao excluir faturamento.");
    }
  },

  // ======================================================
  // IMPORTAR GASTOS
  // ======================================================

async importarContasPagas() {

  try {

    const arquivo =
      this.get("importArquivo")?.files?.[0];

    if (!arquivo) {
      alert("Selecione uma planilha.");
      return;
    }

    const mes =
      this.valor("importMes");

    const ano =
      String(this.valor("importAno"));

    // =========================================
    // REMOVER IMPORTAÇÃO ANTIGA
    // =========================================

    const antigos = await api.restGet(
      "gastos",
      `select=id&mes=eq.${encodeURIComponent(mes)}&ano=eq.${encodeURIComponent(ano)}`
    );

    if (antigos?.length) {

      const confirmar = confirm(
        `Já existem ${antigos.length} registros para ${mes}/${ano}.\n\nDeseja substituir?`
      );

      if (!confirmar) return;

      await api.request(
        `gastos?mes=eq.${encodeURIComponent(mes)}&ano=eq.${encodeURIComponent(ano)}`,
        "",
        "DELETE"
      );
    }

    // =========================================
    // LEITURA XLSX
    // =========================================

    const buffer =
      await arquivo.arrayBuffer();

    const workbook =
      XLSX.read(buffer, {
        type: "array"
      });

    const primeiraAba =
      workbook.SheetNames[0];

    const sheet =
      workbook.Sheets[primeiraAba];

    const linhas =
      XLSX.utils.sheet_to_json(sheet, {
        defval: "",
        raw: false
      });

    if (!linhas.length) {

      alert("Planilha vazia.");
      return;
    }

    // =========================================
    // NORMALIZAR
    // =========================================

    const registros = [];

    for (const linha of linhas) {

      const obj = {};

      Object.keys(linha).forEach(chave => {

        const limpa = String(chave)
          .trim()
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/\s/g, "");

        obj[limpa] = linha[chave];
      });

      // =====================================
      // CATEGORIA
      // =====================================

      let categoria =

        obj.categoria ||
        obj.grupo ||
        obj.tipo ||
        obj.classe ||
        obj.conta ||
        obj.classificacao ||
        obj.centrocusto ||
        obj.descricao ||
        "";

      categoria = String(categoria)
        .trim()
        .toUpperCase();

      // =====================================
      // VALOR
      // =====================================

      let valor =

        obj.valor ||
        obj.valortotal ||
        obj.valorpago ||
        obj.valorliquido ||
        obj.valorbruto ||
        obj.total ||
        obj.debito ||
        obj.credito ||
        obj.saida ||
        obj.vlr ||
        0;

      valor = this.numero(valor);

      // =====================================
      // IGNORAR INVÁLIDOS
      // =====================================

      if (!categoria) continue;

      if (isNaN(valor)) continue;

      if (valor === 0) continue;

      // =====================================
      // IGNORAR SUBTOTAIS
      // =====================================

      const textoCategoria =
        categoria.toUpperCase();

      if (
        textoCategoria.includes("TOTAL")
        ||
        textoCategoria.includes("SUBTOTAL")
        ||
        textoCategoria.includes("SALDO")
      ) {
        continue;
      }

      registros.push({

        mes,
        ano,

        categoria,

        valor
      });
    }

    // =========================================
    // VALIDAÇÃO
    // =========================================

    if (!registros.length) {

      console.log(linhas);

      alert(
        "Nenhum registro válido encontrado."
      );

      return;
    }

    console.log(
      "REGISTROS IMPORTADOS:",
      registros
    );

    // =========================================
    // INSERT
    // =========================================

    for (const item of registros) {

      await api.insert(
        "gastos",
        item
      );
    }

    this.get("importArquivo").value = "";

    alert(
      `${registros.length} registros importados com sucesso.`
    );

    if (window.dashboardModule?.carregar) {

      await dashboardModule.carregar();
    }

  } catch (erro) {

    console.error(
      "Erro importação:",
      erro
    );

    alert(
      "Erro ao importar planilha."
    );
  }
}
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

  const alvo = document.querySelector(
    `#tab-inserir-dados .input-section[data-section="${tipo}"]`
  );

  if (alvo) {
    alvo.style.display = "block";
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
