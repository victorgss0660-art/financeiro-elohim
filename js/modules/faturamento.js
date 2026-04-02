window.faturamentoModule = {
  async garantirMes(mes, ano) {
    const data = await api.restGet(
      "meses",
      `select=*&mes=eq.${encodeURIComponent(mes)}&ano=eq.${encodeURIComponent(ano)}&limit=1`
    );

    if (!data.length) {
      await api.restInsert("meses", [{
        mes,
        ano,
        faturamento: 0
      }]);
    }
  },

  async salvarFaturamento() {
    try {
      const { mes, ano } = utils.getMesAno();
      const input = document.getElementById("faturamentoInput");

      if (!input) {
        utils.setAppMsg("Campo de faturamento não encontrado.", "err");
        return;
      }

      const valor = utils.num(input.value || 0);

      await this.garantirMes(mes, ano);

      await api.restPatch(
        "meses",
        `mes=eq.${encodeURIComponent(mes)}&ano=eq.${encodeURIComponent(ano)}`,
        { faturamento: valor }
      );

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
