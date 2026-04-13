window.importarModule = {
  init() {
    const input = document.getElementById("fileInput");
    if (!input) return;

    input.addEventListener("change", this.handleFile.bind(this));
  },

  async handleFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      utils.setAppMsg("Lendo planilha...", "info");

      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);

      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      const json = XLSX.utils.sheet_to_json(sheet);

      if (!json.length) {
        utils.setAppMsg("Planilha vazia!", "err");
        return;
      }

      const dadosTratados = json.map(row => {
        return {
          categoria: this.tratarCategoria(row),
          valor: this.tratarValor(row)
        };
      }).filter(i => i.valor > 0);

      if (!dadosTratados.length) {
        utils.setAppMsg("Nenhum valor válido encontrado", "err");
        return;
      }

      await this.salvarNoBanco(dadosTratados);

      utils.setAppMsg("Importação concluída com sucesso!", "ok");

    } catch (e) {
      console.error(e);
      utils.setAppMsg("Erro ao importar planilha: " + e.message, "err");
    }
  },

  tratarCategoria(row) {
    const cat = String(row.CATEGORIA || row.categoria || "").trim().toUpperCase();

    const validas = [
      "MC","MP","TERC","FRETE",
      "DESP","TAR","PREST","FOLHA",
      "COMIS","IMPOS","RESC","MANUT"
    ];

    if (validas.includes(cat)) return cat;

    return "DESP";
  },

  tratarValor(row) {
    let valor = row.VALOR || row.valor || 0;

    if (typeof valor === "string") {
      valor = valor
        .replace("R$", "")
        .replace(/\./g, "")
        .replace(",", ".")
        .trim();
    }

    return Number(valor) || 0;
  },

async salvarNoBanco(lista) {
  const { mes, ano } = utils.getMesAno();

  for (const item of lista) {
    const { error } = await supabase
      .from("gastos")
      .insert([
        {
          categoria: item.categoria,
          valor: item.valor,
          mes,
          ano
        }
      ]);

    if (error) {
      console.error("Erro ao inserir:", error);
    }
  }
}

if (error) {
  console.error("Erro ao salvar:", error);
}
    }
  }
};
