window.faturamentoModule = {
  async carregarFaturamento() {
    try {
      const { mes, ano } = utils.getMesAno();
      const input = document.getElementById("faturamentoInput");
      if (!input) return;

      const data = await api.restGet(
        "meses",
        `select=*&mes=eq.${encodeURIComponent(mes)}&ano=eq.${ano}&limit=1`
      );

      if (data && data.length) {
        input.value = Number(data[0].valor || 0);
      } else {
        input.value = "";
      }
    } catch (e) {
      utils.setAppMsg("Erro ao carregar faturamento: " + e.message, "err");
    }
  },

  async salvarFaturamento() {
    try {
      const { mes, ano } = utils.getMesAno();
      const input = document.getElementById("faturamentoInput");
      if (!input) return;

      const valor = Number(input.value || 0);

      const existente = await api.restGet(
        "meses",
        `select=id,mes,ano&mes=eq.${encodeURIComponent(mes)}&ano=eq.${ano}&limit=1`
      );

      if (existente.length) {
        await api.restPatch(
          "meses",
          `id=eq.${existente[0].id}`,
          { mes, ano, valor }
        );
      } else {
        await api.restInsert("meses", [{
          mes,
          ano,
          valor
        }]);
      }

      utils.setAppMsg("Faturamento salvo com sucesso.", "ok");

      if (window.dashboardModule?.carregarDashboard) {
        await window.dashboardModule.carregarDashboard();
      }

      if (window.resumoModule?.carregarResumoAnual) {
        await window.resumoModule.carregarResumoAnual();
      }
    } catch (e) {
      utils.setAppMsg("Erro ao salvar faturamento: " + e.message, "err");
    }
  }
};
