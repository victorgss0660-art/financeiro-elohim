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
    if (!input || input.dataset.binded === "1") return;

    input.addEventListener("change", async (event) => {
      await this.handleFile(event);
    });

    input.dataset.binded = "1";
  },

  async handleFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      utils.setAppMsg("Lendo planilha...", "info");

      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });

      if (!workbook.SheetNames?.length) {
        throw new Error("Nenhuma aba encontrada na planilha.");
      }

      const primeiraAba = workbook.SheetNames[0];
      const sheet = workbook.Sheets[primeiraAba];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      if (!rows.length) {
        throw new Error("A planilha está vazia.");
      }

      const registros = rows
        .map((row, index) => this.normalizarLinha(row, index + 2))
        .filter(Boolean);

      if (!registros.length) {
        throw new Error("Nenhuma linha válida encontrada.");
      }

      await this.salvarNoBanco(registros);

      event.target.value = "";

      utils.setAppMsg(
        `Importação concluída com sucesso. ${registros.length} lançamento(s) inserido(s).`,
        "ok"
      );

      if (window.dashboardModule?.carregarDashboard && window.app?.currentTab === "dashboard") {
        await window.dashboardModule.carregarDashboard();
      }

      if (window.resumoModule?.carregarResumoAnual && window.app?.currentTab === "resumo") {
        await window.resumoModule.carregarResumoAnual();
      }

      if (window.dreModule?.carregarDRE && window.app?.currentTab === "dre") {
        await window.dreModule.carregarDRE();
      }
    } catch (error) {
      console.error("Erro ao importar planilha:", error);
      utils.setAppMsg("Erro ao importar planilha: " + error.message, "err");
    }
  },

  normalizarLinha(row, numeroLinha) {
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

    const categoria = this.normalizarCategoria(categoriaBruta);
    const valor = this.normalizarValor(valorBruto);

    if (!valor || valor <= 0) {
      return null;
    }

    return {
      categoria,
      valor,
      linha: numeroLinha
    };
  },

  normalizarCategoria(valor) {
    const categoria = String(valor || "")
      .trim()
      .toUpperCase();

    if (this.categoriasValidas.includes(categoria)) {
      return categoria;
    }

    return "DESP";
  },

  normalizarValor(valor) {
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

  async salvarNoBanco(registros) {
    const { mes, ano } = utils.getMesAno();

    const payload = registros.map((item) => ({
      categoria: item.categoria,
      valor: item.valor,
      mes,
      ano
    }));

    await api.insert("gastos", payload);
  }
};
