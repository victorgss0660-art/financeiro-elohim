window.faturamentoModule = {

  async salvarFaturamento() {
    const { mes, ano } = utils.getMesAno();

    await api.restInsert("faturamento", [{
      valor: Number(faturamentoInput.value),
      mes,
      ano
    }]);

    utils.setAppMsg("Faturamento salvo", "ok");
  }

};
