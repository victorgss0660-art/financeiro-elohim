window.importarModule = {
  async handleFile(event) {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      if (!rows.length) {
        utils.setAppMsg("A planilha está vazia.", "err");
        return;
      }

      const { mes, ano } = utils.getMesAno();
      const erros = [];
      const linhasValidas = [];

      rows.forEach((row, index) => {
        const linhaExcel = index + 2;

        const categoriaBruta =
          row.CATEGORIA ??
          row.categoria ??
          row.Categoria ??
          "";

        const valorBruto =
          row.VALOR ??
          row.valor ??
          row.Valor ??
          "";

        const categoria = utils.categoriaCanonica(categoriaBruta);
        const valor = utils.numero(valorBruto);

        if (!utils.categoriaValida(categoriaBruta)) {
          erros.push(`Linha ${linhaExcel}: categoria inválida (${categoriaBruta})`);
          return;
        }

        if (!valor || valor <= 0) {
          erros.push(`Linha ${linhaExcel}: valor inválido (${valorBruto})`);
          return;
        }

        linhasValidas.push({
          categoria,
          valor,
          mes,
          ano
        });
      });

      if (erros.length) {
        utils.setAppMsg(erros.join("\n"), "err");
        return;
      }

      if (!linhasValidas.length) {
        utils.setAppMsg("Nenhuma linha válida encontrada para importar.", "err");
        return;
      }

      await api.restInsert("gastos", linhasValidas);

      utils.setAppMsg("Despesas importadas com sucesso.", "ok");

      event.target.value = "";

      if (window.dashboardModule?.carregarDashboard) {
        await window.dashboardModule.carregarDashboard();
      }

      if (window.resumoModule?.carregarResumoAnual) {
        await window.resumoModule.carregarResumoAnual();
      }
    } catch (e) {
      utils.setAppMsg("Erro ao importar planilha: " + e.message, "err");
    }
  }
};
