window.app = {
  async carregarTudo() {
    if (window.dashboardModule?.carregarDashboard) {
      await window.dashboardModule.carregarDashboard();
    }

    if (window.resumoModule?.carregarResumoAnual) {
      await window.resumoModule.carregarResumoAnual();
    }

    if (window.contasPagarModule?.carregarContasPagar) {
      await window.contasPagarModule.carregarContasPagar();
    }

    if (window.contasPagasModule?.carregarContasPagas) {
      await window.contasPagasModule.carregarContasPagas();
    }

    if (window.contasReceberModule?.carregarContasReceber) {
      await window.contasReceberModule.carregarContasReceber();
    }

    if (window.contasRecebidasModule?.carregarContasRecebidas) {
      await window.contasRecebidasModule.carregarContasRecebidas();
    }

    if (window.planejamentoModule?.carregarPlanejamento) {
      await window.planejamentoModule.carregarPlanejamento();
    }
  },

  init() {
    const loginBtn = document.getElementById("loginBtn");
    const loginSenha = document.getElementById("loginSenha");
    const btnSair = document.getElementById("btnSair");
    const btnSalvarContaPagar = document.getElementById("btnSalvarContaPagar");
    const btnSalvarContaReceber = document.getElementById("btnSalvarContaReceber");
    const btnSalvarFaturamento = document.getElementById("btnSalvarFaturamento");
    const btnSalvarMetas = document.getElementById("btnSalvarMetas");
    const fileInput = document.getElementById("fileInput");
    const btnCarregarMes = document.getElementById("btnCarregarMes");
    const mesSelect = document.getElementById("mesSelect");
    const anoSelect = document.getElementById("anoSelect");

    if (loginBtn) {
      loginBtn.addEventListener("click", () => authModule.login());
    }

    if (loginSenha) {
      loginSenha.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          authModule.login();
        }
      });
    }

    if (btnSair) {
      btnSair.addEventListener("click", () => authModule.logout());
    }

    if (btnSalvarContaPagar) {
      btnSalvarContaPagar.addEventListener("click", () => {
        if (window.contasPagarModule?.salvarContaPagar) {
          window.contasPagarModule.salvarContaPagar();
        }
      });
    }

    if (btnSalvarContaReceber) {
      btnSalvarContaReceber.addEventListener("click", () => {
        if (window.contasReceberModule?.salvarContaReceber) {
          window.contasReceberModule.salvarContaReceber();
        }
      });
    }

    if (btnSalvarFaturamento) {
      btnSalvarFaturamento.addEventListener("click", () => {
        if (window.faturamentoModule?.salvarFaturamento) {
          window.faturamentoModule.salvarFaturamento();
        }
      });
    }

    if (btnSalvarMetas) {
      btnSalvarMetas.addEventListener("click", () => {
        if (window.metasModule?.salvarMetas) {
          window.metasModule.salvarMetas();
        }
      });
    }

    if (fileInput) {
      fileInput.addEventListener("change", (e) => {
        if (window.importarModule?.handleFile) {
          window.importarModule.handleFile(e);
        }
      });
    }

    if (btnCarregarMes) {
      btnCarregarMes.addEventListener("click", () => this.carregarTudo());
    }

    if (mesSelect) {
      mesSelect.addEventListener("change", async () => {
        if (authModule.usuarioAtual) {
          await this.carregarTudo();
        }
      });
    }

    if (anoSelect) {
      anoSelect.addEventListener("change", async () => {
        if (authModule.usuarioAtual) {
          await this.carregarTudo();
        }
      });
    }

    utils.definirMesAtual();
    navigation.ativarAbas();
    authModule.restaurarSessao();

    setTimeout(() => {
      navigation.atualizarVisibilidadeFiltroMesAno();
    }, 100);
  }
};

window.addEventListener("DOMContentLoaded", () => {
  window.app.init();
});
