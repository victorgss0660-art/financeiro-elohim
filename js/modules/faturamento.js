window.faturamentoModule = {
  extrairValor(item) {
    return utils.numero(
      item?.valor ??
      item?.faturamento ??
      item?.receita ??
      0
    );
  },

  async carregarFaturamento() {
    try {
      const { mes, ano } = utils.getMesAno();
      const input = document.getElementById("faturamentoInput");
      if (!input) return;

      const data = await api.restGet("meses", "select=*");

      const registro = (data || []).find(item =>
        String(item.mes || item.nome_mes || "").trim() === String(mes).trim() &&
        Number(item.ano || item.exercicio || 0) === Number(ano)
      );

      input.value = registro ? this.extrairValor(registro) : "";
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
      const data = await api.restGet("meses", "select=*");

      const existente = (data || []).find(item =>
        String(item.mes || item.nome_mes || "").trim() === String(mes).trim() &&
        Number(item.ano || item.exercicio || 0) === Number(ano)
      );

      const payload = {
        mes,
        ano,
        valor
      };

      if (existente?.id) {
        await api.restPatch("meses", `id=eq.${existente.id}`, payload);
      } else {
        await api.restInsert("meses", [payload]);
      }

      utils.setAppMsg("Faturamento salvo com sucesso.", "ok");

      await this.carregarFaturamento();
      await window.dashboardModule?.carregarDashboard?.();
      await window.resumoModule?.carregarResumoAnual?.();
    } catch (e) {
      utils.setAppMsg("Erro ao salvar faturamento: " + e.message, "err");
    }
  }
};
