window.metasModule = {
  async carregarMetas() {
    try {
      const { ano } = utils.getMesAno();
      const categorias = utils.getCategorias();
      const grid = document.getElementById("metaGrid");

      if (!grid) return;

      let metas = [];
      try {
        metas = await api.restGet(
          "metas",
          `select=*&ano=eq.${ano}`
        );
      } catch (e) {
        metas = [];
      }

      const mapa = {};
      (metas || []).forEach(item => {
        const categoria = utils.categoriaCanonica(item.categoria || "");
        mapa[categoria] = item;
      });

      grid.innerHTML = categorias.map(categoria => {
        const item = mapa[categoria] || {};
        return `
          <div class="meta-item">
            <label>${categoria}</label>
            <input
              type="number"
              step="0.01"
              class="meta-input"
              data-categoria="${categoria}"
              value="${item.percentual_meta ?? ""}"
              placeholder="% do faturamento"
            >
          </div>
        `;
      }).join("");
    } catch (e) {
      utils.setAppMsg("Erro ao carregar metas: " + e.message, "err");
    }
  },

  async salvarMetas() {
    try {
      const { ano } = utils.getMesAno();
      const inputs = Array.from(document.querySelectorAll(".meta-input"));

      for (const input of inputs) {
        const categoria = utils.categoriaCanonica(input.dataset.categoria || "");
        const percentual_meta = Number(input.value || 0);

        const existente = await api.restGet(
          "metas_financeiras",
          `select=id,categoria,ano&categoria=eq.${encodeURIComponent(categoria)}&ano=eq.${ano}&limit=1`
        );

        if (existente.length) {
          await api.restPatch(
            "metas_financeiras",
            `id=eq.${existente[0].id}`,
            {
              categoria,
              ano,
              percentual_meta
            }
          );
        } else {
          await api.restInsert("metas", [{
            categoria,
            ano,
            percentual_meta
          }]);
        }
      }

      utils.setAppMsg("Metas salvas com sucesso.", "ok");
      await this.carregarMetas();

      if (window.dashboardModule?.carregarDashboard) {
        await window.dashboardModule.carregarDashboard();
      }
    } catch (e) {
      utils.setAppMsg("Erro ao salvar metas: " + e.message, "err");
    }
  }
};
