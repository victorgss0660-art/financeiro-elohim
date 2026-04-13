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

  previewData: [],
  arquivoAtual: "",

  init() {
    const input = document.getElementById("fileInput");
    const btnConfirmar = document.getElementById("btnConfirmarImportacao");
    const btnCancelar = document.getElementById("btnCancelarImportacao");

    if (input && input.dataset.binded !== "1") {
      input.addEventListener("change", async (event) => {
        await this.handleFile(event);
      });
      input.dataset.binded = "1";
    }

    if (btnConfirmar && btnConfirmar.dataset.binded !== "1") {
      btnConfirmar.addEventListener("click", async () => {
        await this.confirmarImportacao();
      });
      btnConfirmar.dataset.binded = "1";
    }

    if (btnCancelar && btnCancelar.dataset.binded !== "1") {
      btnCancelar.addEventListener("click", () => {
        this.cancelarImportacao();
      });
      btnCancelar.dataset.binded = "1";
    }
  },

  async handleFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      utils.setAppMsg("Lendo planilha...", "info");
      this.arquivoAtual = file.name;

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

      this.previewData = rows.map((row, index) => this.normalizarLinha(row, index + 2));
      this.renderPreview();
      this.atualizarResumo();
      this.mostrarAcoesImportacao(true);

      utils.setAppMsg("Pré-visualização carregada. Revise e confirme.", "ok");
    } catch (error) {
      console.error("Erro ao ler planilha:", error);
      this.previewData = [];
      this.renderPreview();
      this.atualizarResumo();
      this.mostrarAcoesImportacao(false);
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

    const categoriaOriginal = String(categoriaBruta || "").trim();
    const valorOriginal = String(valorBruto ?? "").trim();

    const categoriaInfo = this.normalizarCategoria(categoriaBruta);
    const valorInfo = this.normalizarValor(valorBruto);

    const erros = [];
    const avisos = [];

    if (!valorInfo.valido) erros.push("Valor inválido");
    if (valorInfo.numero <= 0) erros.push("Valor zerado");
    if (categoriaInfo.ajustada) avisos.push("Categoria ajustada para DESP");

    const valido = erros.length === 0;

    let status = "OK";
    if (!valido) status = "Erro";
    else if (avisos.length) status = "Ajustado";

    return {
      linha: numeroLinha,
      categoriaOriginal,
      categoriaFinal: categoriaInfo.categoria,
      valorOriginal,
      valorFinal: valorInfo.numero,
      valido,
      status,
      observacao: [...erros, ...avisos].join(" | ") || "-"
    };
  },

  normalizarCategoria(valor) {
    const categoria = String(valor || "")
      .trim()
      .toUpperCase();

    if (this.categoriasValidas.includes(categoria)) {
      return {
        categoria,
        ajustada: false
      };
    }

    return {
      categoria: "DESP",
      ajustada: true
    };
  },

  normalizarValor(valor) {
    if (typeof valor === "number") {
      return {
        numero: Number.isFinite(valor) ? valor : 0,
        valido: Number.isFinite(valor)
      };
    }

    if (valor == null) {
      return { numero: 0, valido: false };
    }

    let texto = String(valor).trim();
    if (!texto) {
      return { numero: 0, valido: false };
    }

    texto = texto.replace(/R\$/gi, "").replace(/\s/g, "");

    const temVirgula = texto.includes(",");
    const temPonto = texto.includes(".");

    if (temVirgula && temPonto) {
      texto = texto.replace(/\./g, "").replace(",", ".");
    } else if (temVirgula) {
      texto = texto.replace(",", ".");
    }

    const numero = Number(texto);

    return {
      numero: Number.isFinite(numero) ? numero : 0,
      valido: Number.isFinite(numero)
    };
  },

  renderPreview() {
    const tbody = document.getElementById("tabelaPreviewImportacao");
    const nomeArquivo = document.getElementById("impNomeArquivo");

    if (nomeArquivo) {
      nomeArquivo.textContent = this.arquivoAtual || "Nenhum arquivo";
    }

    if (!tbody) return;

    if (!this.previewData.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="muted">Nenhum arquivo carregado.</td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = this.previewData.map(item => `
      <tr class="${item.valido ? "" : "selecionado"}">
        <td>${item.linha}</td>
        <td>${item.categoriaOriginal || "-"}</td>
        <td>${item.categoriaFinal}</td>
        <td>${item.valorOriginal || "-"}</td>
        <td>${utils.moeda(item.valorFinal || 0)}</td>
        <td class="${item.status === "Erro" ? "err" : item.status === "Ajustado" ? "" : "ok"}">${item.status}</td>
        <td>${item.observacao}</td>
      </tr>
    `).join("");
  },

  atualizarResumo() {
    const validas = this.previewData.filter(i => i.valido);
    const invalidas = this.previewData.filter(i => !i.valido);
    const total = validas.reduce((acc, item) => acc + Number(item.valorFinal || 0), 0);

    const qtdValidas = document.getElementById("impQtdValidas");
    const qtdInvalidas = document.getElementById("impQtdInvalidas");
    const valorTotal = document.getElementById("impValorTotal");
    const status = document.getElementById("impStatus");

    if (qtdValidas) qtdValidas.textContent = String(validas.length);
    if (qtdInvalidas) qtdInvalidas.textContent = String(invalidas.length);
    if (valorTotal) valorTotal.textContent = utils.moeda(total);

    if (status) {
      if (!this.previewData.length) status.textContent = "Aguardando";
      else if (invalidas.length) status.textContent = "Revisar";
      else status.textContent = "Pronto";
    }
  },

  mostrarAcoesImportacao(mostrar) {
    const btnConfirmar = document.getElementById("btnConfirmarImportacao");
    const btnCancelar = document.getElementById("btnCancelarImportacao");

    if (btnConfirmar) btnConfirmar.classList.toggle("hidden", !mostrar);
    if (btnCancelar) btnCancelar.classList.toggle("hidden", !mostrar);
  },

  async confirmarImportacao() {
    try {
      const validos = this.previewData.filter(item => item.valido);

      if (!validos.length) {
        utils.setAppMsg("Nenhuma linha válida para importar.", "err");
        return;
      }

      utils.setAppMsg("Importando registros...", "info");

      const { mes, ano } = utils.getMesAno();

      const payload = validos.map(item => ({
        categoria: item.categoriaFinal,
        valor: item.valorFinal,
        mes,
        ano
      }));

      await api.insert("gastos", payload);

      utils.setAppMsg(
        `Importação concluída com sucesso. ${payload.length} lançamento(s) inserido(s).`,
        "ok"
      );

      this.cancelarImportacao();

      if (window.dashboardModule?.carregarDashboard && window.app?.currentTab === "dashboard") {
        await window.dashboardModule.carregarDashboard();
      }

      if (window.resumoModule?.carregarResumoAnual) {
        await window.resumoModule.carregarResumoAnual();
      }

      if (window.dreModule?.carregarDRE && window.app?.currentTab === "dre") {
        await window.dreModule.carregarDRE();
      }
    } catch (error) {
      console.error("Erro ao confirmar importação:", error);
      utils.setAppMsg("Erro ao importar planilha: " + error.message, "err");
    }
  },

  cancelarImportacao() {
    this.previewData = [];
    this.arquivoAtual = "";

    const input = document.getElementById("fileInput");
    if (input) input.value = "";

    this.renderPreview();
    this.atualizarResumo();
    this.mostrarAcoesImportacao(false);
  }
};
