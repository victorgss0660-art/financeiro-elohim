window.importarModule = {
  categoriasValidas: [
    "MC",
    "MP",
    "TERC",
    "FRETE",
    "DESP",
    "TAR",
    "PREST",
    "FOLHA",
    "COMIS",
    "IMPOS",
    "RESC",
    "MANUT"
  ],

  init() {
    const input = document.getElementById("fileInput");
    if (!input || input.dataset.binded) return;

    input.addEventListener("change", this.handleFile.bind(this));
    input.dataset.binded = "1";
  },

  async handleFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      utils.setAppMsg("Lendo planilha...", "info");

      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });

      if (!workbook.SheetNames.length) {
        utils.setAppMsg("A planilha não possui abas válidas.", "err");
        return;
      }

      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      if (!rows.length) {
        utils.setAppMsg("A planilha está vazia.", "err");
        return;
      }

      const dadosTratados = rows
        .map((row, index) => this.tratarLinha(row, index + 2))
        .filter(item => item && item.valor > 0);

      if (!dadosTratados.length) {
        utils.setAppMsg("Nenhuma linha válida encontrada para importar.", "err");
        return;
      }

      await this.salvarNoBanco(dadosTratados);

      const input = document.getElementById("fileInput");
      if (input) input.value = "";

      utils.setAppMsg(
        `Importação concluída com sucesso. ${dadosTratados.length} lançamentos inseridos.`,
        "ok"
      );

      if (window.dashboardModule?.carregarDashboard) {
        await window.dashboardModule.carregarDashboard();
      }

      if (window.resumoModule?.carregarResumoAnual) {
        await window.resumoModule.carregarResumoAnual();
      }

      if (window.dreModule?.carregarDRE && window.app?.currentTab === "dre") {
        await window.dreModule.carregarDRE();
      }
    } catch (e) {
      console.error("Erro ao importar planilha:", e);
      utils.setAppMsg("Erro ao importar planilha: " + e.message, "err");
    }
  },

  tratarLinha(row, numeroLinha) {
    const categoriaBruta =
      row.CATEGORIA ??
      row.categoria ??
      row.Categoria ??
      row["CATEGORIA "] ??
      "";

    const valorBruto =
      row.VALOR ??
      row.valor ??
      row.Valor ??
      row["VALOR "] ??
      0;

    const categoria = this.tratarCategoria(categoriaBruta);
    const valor = this.tratarValor(valorBruto);

    if (!valor || valor <= 0) return null;

    return {
      categoria,
      valor,
      linha: numeroLinha
    };
  },

  tratarCategoria(valor) {
    const categoria = String(valor || "")
      .trim()
      .toUpperCase();

    if (this.categoriasValidas.includes(categoria)) {
      return categoria;
    }

    return "DESP";
  },

  tratarValor(valor) {
    if (typeof valor === "number") {
      return Number.isFinite(valor) ? valor : 0;
    }

    if (valor == null) return 0;

    let texto = String(valor).trim();
    if (!texto) return 0;

    texto = texto.replace(/R\$/gi, "").replace(/\s/g, "");

    const temVirgula = texto.includes(",");
    const temPonto = texto.includes(".");

    if (temVirgula && temPonto) {
      texto = texto.replace(/\./g, "").replace(",", ".");
    } else if (temVirgula) {
      texto = texto.replace(",", ".");
    }

    const numero = Number(texto);
    return Number.isFinite(numero) ? numero : 0;
  },

  async salvarNoBanco(lista) {
    const { mes, ano } = utils.getMesAno();

    const payload = lista.map(item => ({
      categoria: item.categoria,
      valor: item.valor,
      mes,
      ano
    }));

    const { error } = await supabase
      .from("gastos")
      .insert(payload);

    if (error) {
      throw new Error(error.message || "Falha ao salvar no banco.");
    }
  }
};
