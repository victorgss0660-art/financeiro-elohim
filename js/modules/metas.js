window.metasModule = {
  extrairPercentual(item) {
    return utils.numero(
      item?.percentual_meta ??
      item?.percentual ??
      item?.meta ??
      item?.valor ??
      0
    );
  },

  async carregarMetas() {
    try {
      const { ano } = utils.getMesAno();
      const categorias = utils.getCategorias();
      const grid = document.getElementById("metaGrid");
      if (!grid) return;

      const metas = await api.restGet("metas", "select=*");

      const metasAno = (metas || []).filter(item =>
        Number(item.ano || item.exercicio || 0) === Number(ano)
      );

      const mapa = {};
      metasAno.forEach(item => {
        const categoria = utils.categoriaCanonica(item.categoria || item.nome || "");
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
              value="${this.extrairPercentual(item)}"
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
      const metas = await api.restGet("metas", "select=*");

      for (const input of inputs) {
        const categoria = utils.categoriaCanonica(input.dataset.categoria || "");
        const percentual_meta = Number(input.value || 0);

        const existente = (metas || []).find(item =>
          utils.categoriaCanonica(item.categoria || item.nome || "") === categoria &&
          Number(item.ano || item.exercicio || 0) === Number(ano)
        );

        const payload = {
          categoria,
          ano,
          percentual_meta
        };

        if (existente?.id) {
          await api.restPatch("metas", `id=eq.${existente.id}`, payload);
        } else {
          await api.restInsert("metas", [payload]);
        }
      }

      utils.setAppMsg("Metas salvas com sucesso.", "ok");
      await this.carregarMetas();
      await window.dashboardModule?.carregarDashboard?.();
    } catch (e) {
      utils.setAppMsg("Erro ao salvar metas: " + e.message, "err");
    }
  }
};
