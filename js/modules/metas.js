window.metasModule = {
  nomesCategorias: {
    MC: "Materiais de Consumo",
    MP: "Matéria-Prima",
    TERC: "Terceirizações",
    FRETE: "Fretes",
    DESP: "Despesas Fixas",
    TAR: "Tarifas Bancárias",
    PREST: "Prestações de Serviço",
    FOLHA: "Folha de Pagamento",
    COMIS: "Comissões",
    IMPOS: "Impostos",
    RESC: "Rescisões",
    MANUT: "Manutenções"
  },

  metasPadrao: {
    MC: 20,
    MP: 18,
    TERC: 8,
    FRETE: 5,
    DESP: 6,
    TAR: 1,
    PREST: 4,
    FOLHA: 15,
    COMIS: 2,
    IMPOS: 5,
    RESC: 1,
    MANUT: 4
  },

  nomeCategoria(sigla) {
    return this.nomesCategorias[sigla] || sigla || "-";
  },

  async garantirMetas(mes, ano) {
    const data = await api.restGet(
      "metas",
      `select=*&mes=eq.${encodeURIComponent(mes)}&ano=eq.${encodeURIComponent(ano)}`
    );

    if (data.length) return data;

    const payload = Object.keys(this.metasPadrao).map(cat => ({
      mes,
      ano,
      categoria: cat,
      meta: this.metasPadrao[cat]
    }));

    await api.restInsert("metas", payload);
    return payload;
  },

  async carregarMetas() {
    try {
      const { mes, ano } = utils.getMesAno();
      const metasData = await this.garantirMetas(mes, ano);

      const metaGrid = document.getElementById("metaGrid");
      if (!metaGrid) return;

      metaGrid.innerHTML = Object.keys(this.metasPadrao).map(cat => {
        const registro = metasData.find(item => item.categoria === cat);
        const valor = registro ? utils.num(registro.meta || 0) : this.metasPadrao[cat];

        return `
          <div class="meta-item">
            <label>${this.nomeCategoria(cat)} (%)</label>
            <input type="number" step="0.01" data-cat="${cat}" value="${valor}">
          </div>
        `;
      }).join("");
    } catch (e) {
      utils.setAppMsg("Erro ao carregar metas: " + e.message, "err");
    }
  },

  capturarMetasTela() {
    const metas = {};
    document.querySelectorAll("#metaGrid input").forEach(input => {
      metas[input.dataset.cat] = utils.num(input.value || 0);
    });
    return metas;
  },

  async salvarMetas() {
    try {
      const { mes, ano } = utils.getMesAno();
      const metas = this.capturarMetasTela();

      await api.restDelete(
        "metas",
        `mes=eq.${encodeURIComponent(mes)}&ano=eq.${encodeURIComponent(ano)}`
      );

      const payload = Object.keys(metas).map(cat => ({
        mes,
        ano,
        categoria: cat,
        meta: utils.num(metas[cat] || 0)
      }));

      await api.restInsert("metas", payload);

      utils.setAppMsg("Metas salvas com sucesso.", "ok");

      if (window.dashboardModule?.carregarDashboard) {
        await window.dashboardModule.carregarDashboard();
      }
    } catch (e) {
      utils.setAppMsg("Erro ao salvar metas: " + e.message, "err");
    }
  }
};
