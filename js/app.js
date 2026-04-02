

window.app = {
  async carregarTudo() {
    if (window.dashboardModule?.carregarDashboard) await window.dashboardModule.carregarDashboard();
    if (window.resumoModule?.carregarResumoAnual) await window.resumoModule.carregarResumoAnual();
    if (window.contasPagarModule?.carregarContasPagar) await window.contasPagarModule.carregarContasPagar();
    if (window.contasPagasModule?.carregarContasPagas) await window.contasPagasModule.carregarContasPagas();
    if (window.contasReceberModule?.carregarContasReceber) await window.contasReceberModule.carregarContasReceber();
    if (window.contasRecebidasModule?.carregarContasRecebidas) await window.contasRecebidasModule.carregarContasRecebidas();
    if (window.planejamentoModule?.carregarPlanejamento) await window.planejamentoModule.carregarPlanejamento();
  },

  init() {
    document.getElementById("loginBtn").addEventListener("click", () => authModule.login());
    document.getElementById("loginSenha").addEventListener("keydown", (e) => {
      if (e.key === "Enter") authModule.login();
    });

    document.getElementById("btnSair").addEventListener("click", () => authModule.logout());

    if (document.getElementById("btnSalvarContaReceber")) {
      document.getElementById("btnSalvarContaReceber").addEventListener("click", () => {
        if (window.contasReceberModule?.salvarContaReceber) {
          window.contasReceberModule.salvarContaReceber();
        }
      });
    }

    if (document.getElementById("btnSalvarFaturamento")) {
      document.getElementById("btnSalvarFaturamento").addEventListener("click", () => {
        if (window.faturamentoModule?.salvarFaturamento) {
          window.faturamentoModule.salvarFaturamento();
        }
      });
    }

    if (document.getElementById("btnSalvarMetas")) {
      document.getElementById("btnSalvarMetas").addEventListener("click", () => {
        if (window.metasModule?.salvarMetas) {
          window.metasModule.salvarMetas();
        }
      });
    }

    if (document.getElementById("fileInput")) {
      document.getElementById("fileInput").addEventListener("change", (e) => {
        if (window.importarModule?.handleFile) {
          window.importarModule.handleFile(e);
        }
      });
    }

    if (document.getElementById("btnCarregarMes")) {
      document.getElementById("btnCarregarMes").addEventListener("click", () => this.carregarTudo());
    }

    if (document.getElementById("mesSelect")) {
      document.getElementById("mesSelect").addEventListener("change", async () => {
        if (authModule.usuarioAtual) await this.carregarTudo();
      });
    }

    if (document.getElementById("anoSelect")) {
      document.getElementById("anoSelect").addEventListener("change", async () => {
        if (authModule.usuarioAtual) await this.carregarTudo();
      });
    }

    utils.definirMesAtual();
    navigation.ativarAbas();
    authModule.restaurarSessao();
    setTimeout(() => navigation.atualizarVisibilidadeFiltroMesAno(), 100);
  }
};

window.addEventListener("DOMContentLoaded", () => {
  window.app.init();
});

