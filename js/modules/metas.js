window.metasModule = {
  categorias: [
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

  lista: [],
  categoriaAtual: null,

  init() {
    const btnSalvar = document.getElementById("btnSalvarMetas");
    if (btnSalvar && btnSalvar.dataset.binded !== "1") {
      btnSalvar.addEventListener("click", async () => {
        await this.salvarMetas();
      });
      btnSalvar.dataset.binded = "1";
    }

    const btnSalvarPopup = document.getElementById("btnSalvarMetaPopup");
    if (btnSalvarPopup && btnSalvarPopup.dataset.binded !== "1") {
      btnSalvarPopup.addEventListener("click", async () => {
        await this.salvarMetaPopup();
      });
      btnSalvarPopup.dataset.binded = "1";
    }

    const btnCancelarPopup = document.getElementById("btnCancelarMetaPopup");
    if (btnCancelarPopup && btnCancelarPopup.dataset.binded !== "1") {
      btnCancelarPopup.addEventListener("click", () => {
        this.fecharPopup();
      });
      btnCancelarPopup.dataset.binded = "1";
    }
  },

  getMesAno() {
    if (window.utils?.getMesAno) return utils.getMesAno();

    return {
      mes: document.getElementById("mesSelect")?.value || "Janeiro",
      ano: Number(document.getElementById("anoSelect")?.value || new Date().getFullYear())
    };
  },

  normalizarNumero(valor) {
    if (typeof valor === "number") return Number.isFinite(valor) ? valor : 0;
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

  formatarExibicaoMeta(item) {
    const tipo = item?.tipo_meta || "percentual";

    if (tipo === "valor") {
      const valor = this.normalizarNumero(item?.valor_meta || 0);
      return window.utils?.moeda ? utils.moeda(valor) : `R$ ${valor.toFixed(2)}`;
    }

    const percentual = this.normalizarNumero(item?.percentual_meta || 0);
    return `${percentual}%`;
  },

  async carregarMetas() {
    try {
      this.init();

      const { mes, ano } = this.getMesAno();
      const data = await api.select("metas", { ano });

      this.lista = (data || []).filter(item => {
        return String(item.mes || "").trim().toLowerCase() === String(mes).trim().toLowerCase();
      });

      this.render();
    } catch (e) {
      console.error("Erro ao carregar metas:", e);
      if (window.utils?.setAppMsg) {
        utils.setAppMsg("Erro ao carregar metas: " + e.message, "err");
      }
    }
  },

  render() {
    const grid = document.getElementById("metaGrid");
    if (!grid) return;

    grid.innerHTML = this.categorias.map(categoria => {
      const item = this.lista.find(i => String(i.categoria || "").toUpperCase() === categoria);

      return `
        <div class="status-item" style="margin-bottom:12px;">
          <div class="label">${categoria}</div>
          <div class="value" style="font-size:18px; margin-bottom:10px;">
            ${this.formatarExibicaoMeta(item)}
          </div>

          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <button
              class="small-btn small-blue"
              type="button"
              onclick="metasModule.abrirPopup('${categoria}')"
            >
              Configurar
            </button>
          </div>
        </div>
      `;
    }).join("");
  },

  abrirPopup(categoria) {
    this.categoriaAtual = categoria;

    const item = this.lista.find(i => String(i.categoria || "").toUpperCase() === categoria);

    const popup = document.getElementById("popupMeta");
    const categoriaInput = document.getElementById("metaCategoriaPopup");
    const tipoSelect = document.getElementById("metaTipoPopup");
    const valorInput = document.getElementById("metaValorPopup");

    if (categoriaInput) categoriaInput.value = categoria;
    if (tipoSelect) tipoSelect.value = item?.tipo_meta || "percentual";

    if (valorInput) {
      if ((item?.tipo_meta || "percentual") === "valor") {
        valorInput.value = this.normalizarNumero(item?.valor_meta || 0);
      } else {
        valorInput.value = this.normalizarNumero(item?.percentual_meta || 0);
      }
    }

    if (popup) popup.classList.remove("hidden");
  },

  fecharPopup() {
    const popup = document.getElementById("popupMeta");
    if (popup) popup.classList.add("hidden");
    this.categoriaAtual = null;
  },

  async salvarMetaPopup() {
    try {
      if (!this.categoriaAtual) return;

      const { mes, ano } = this.getMesAno();
      const tipo = document.getElementById("metaTipoPopup")?.value || "percentual";
      const valorDigitado = this.normalizarNumero(document.getElementById("metaValorPopup")?.value || 0);

      const existente = this.lista.find(
        i =>
          String(i.categoria || "").toUpperCase() === this.categoriaAtual &&
          String(i.mes || "").trim().toLowerCase() === String(mes).trim().toLowerCase() &&
          Number(i.ano || 0) === Number(ano)
      );

      const payload = {
        categoria: this.categoriaAtual,
        mes,
        ano,
        tipo_meta: tipo,
        percentual_meta: tipo === "percentual" ? valorDigitado : 0,
        valor_meta: tipo === "valor" ? valorDigitado : 0
      };

      if (existente?.id) {
        await api.update("metas", { id: existente.id }, payload);
      } else {
        await api.insert("metas", payload);
      }

      this.fecharPopup();
      await this.carregarMetas();

      if (window.dashboardModule?.carregarDashboard && window.app?.currentTab === "dashboard") {
        await window.dashboardModule.carregarDashboard();
      }

      if (window.dreModule?.carregarDRE && window.app?.currentTab === "dre") {
        await window.dreModule.carregarDRE();
      }

      if (window.utils?.setAppMsg) {
        utils.setAppMsg("Meta salva com sucesso.", "ok");
      }
    } catch (e) {
      console.error("Erro ao salvar meta:", e);
      if (window.utils?.setAppMsg) {
        utils.setAppMsg("Erro ao salvar meta: " + e.message, "err");
      }
    }
  },

  async salvarMetas() {
    if (window.utils?.setAppMsg) {
      utils.setAppMsg("Use o botão 'Configurar' em cada categoria para salvar as metas.", "info");
    }
  }
};
