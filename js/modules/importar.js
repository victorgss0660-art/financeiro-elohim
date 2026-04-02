window.importarModule = {
  categoriasValidas: [
    "MC", "MP", "TERC", "FRETE", "DESP", "TAR",
    "PREST", "FOLHA", "COMIS", "IMPOS", "RESC", "MANUT"
  ],

  normalizarCategoria(valor) {
    return String(valor || "").trim().toUpperCase();
  },

  tratarValor(valor) {
    if (valor === undefined || valor === null || valor === "") return 0;
    if (typeof valor === "number") return valor;

    let texto = String(valor).trim();
    texto = texto.replace("R$", "").replace(/\s/g, "");

    if (texto.includes(",") && texto.includes(".")) {
      texto = texto.replace(/\./g, "").replace(",", ".");
    } else if (texto.includes(",")) {
      texto = texto.replace(",", ".");
    }

    const numero = parseFloat(texto);
    return isNaN(numero) ? 0 : numero;
  },

  validarLinha(row, indice) {
    const categoria = this.normalizarCategoria(row["CATEGORIA"]);
    const valor = this.tratarValor(row["VALOR"]);

    if (!categoria || !this.categoriasValidas.includes(categoria)) {
      return `Linha ${indice}: categoria inválida (${row["CATEGORIA"]})`;
    }

    if (valor <= 0) {
      return `Linha ${indice}: valor inválido`;
    }

    return null;
  },

  async importarPayload(payload) {
    const { mes, ano } = utils.getMesAno();

    await api.restDelete(
      "gastos",
      `mes=eq.${encodeURIComponent(mes)}&ano=eq.${encodeURIComponent(ano)}`
    );

    await api.restInsert("gastos", payload);
  },

  async processarPlanilha(json) {
    try {
      if (!json || !json.length) {
        utils.setAppMsg("Planilha vazia.", "err");
        return;
      }

      const { mes, ano } = utils.getMesAno();
      const erros = [];

      json.forEach((row, index) => {
        const erro = this.validarLinha(row, index + 2);
        if (erro) erros.push(erro);
      });

      if (erros.length) {
        utils.setAppMsg(erros.slice(0, 8).join("\n"), "err");
        return;
      }

      const payload = json.map(row => ({
        categoria: this.normalizarCategoria(row["CATEGORIA"]),
        valor: this.tratarValor(row["VALOR"]),
        mes,
        ano
      }));

      await this.importarPayload(payload);

      utils.setAppMsg("Planilha importada com sucesso.", "ok");

      if (window.dashboardModule?.carregarDashboard) {
        await window.dashboardModule.carregarDashboard();
      }

      if (window.resumoModule?.carregarResumoAnual) {
        await window.resumoModule.carregarResumoAnual();
      }
    } catch (e) {
      utils.setAppMsg("Erro ao importar planilha: " + e.message, "err");
    }
  },

  handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws, { defval: "" });

        await this.processarPlanilha(json);
      } catch (e) {
        utils.setAppMsg("Erro ao ler arquivo: " + e.message, "err");
      }
    };

    reader.readAsArrayBuffer(file);
  }
};
