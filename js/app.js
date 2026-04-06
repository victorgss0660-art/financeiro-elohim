window.app = {
  async carregarTudo() {
    try {
      if (window.dashboardModule?.carregarDashboard) {
        await window.dashboardModule.carregarDashboard();
      }

      if (window.resumoModule?.carregarResumoAnual) {
        await window.resumoModule.carregarResumoAnual();
      }

      if (window.metasModule?.carregarMetas) {
        await window.metasModule.carregarMetas();
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

      this.atualizarStatusMes();
    } catch (e) {
      if (window.utils?.setAppMsg) {
        utils.setAppMsg("Erro ao carregar sistema: " + e.message, "err");
      } else {
        console.error(e);
      }
    }
  },

  atualizarStatusMes() {
    const statusMes = document.getElementById("statusMes");
    const statusAtualizacao = document.getElementById("statusAtualizacao");
    const statusSituacao = document.getElementById("statusSituacao");

    if (statusMes && window.utils?.getMesAno) {
      const { mes, ano } = utils.getMesAno();
      statusMes.textContent = `${mes}/${ano}`;
    }

    if (statusAtualizacao) {
      const agora = new Date();
      statusAtualizacao.textContent = agora.toLocaleString("pt-BR");
    }

    if (statusSituacao) {
      statusSituacao.textContent = "Dados carregados";
    }
  },

  initEventosBasicos() {
    const loginBtn = document.getElementById("loginBtn");
    const loginSenha = document.getElementById("loginSenha");
    const btnSair = document.getElementById("btnSair");
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

    if (btnCarregarMes) {
      btnCarregarMes.addEventListener("click", async () => {
        await this.carregarTudo();
      });
    }

    if (mesSelect) {
      mesSelect.addEventListener("change", async () => {
        if (window.authModule?.usuarioAtual) {
          await this.carregarTudo();
        }
      });
    }

    if (anoSelect) {
      anoSelect.addEventListener("change", async () => {
        if (window.authModule?.usuarioAtual) {
          await this.carregarTudo();
        }
      });
    }
  },

  initEventosModulos() {
    const btnSalvarContaPagar = document.getElementById("btnSalvarContaPagar");
    const btnSalvarContaReceber = document.getElementById("btnSalvarContaReceber");
    const btnSalvarFaturamento = document.getElementById("btnSalvarFaturamento");
    const btnSalvarMetas = document.getElementById("btnSalvarMetas");
    const fileInput = document.getElementById("fileInput");

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

    document.querySelectorAll(".saldo-conta").forEach(input => {
      input.addEventListener("input", async () => {
        if (window.planejamentoModule?.carregarPlanejamento) {
          await window.planejamentoModule.carregarPlanejamento();
        }
      });
    });
  },

  initLayout() {
    if (window.utils?.definirMesAtual) {
      utils.definirMesAtual();
    }

    if (window.navigation?.ativarAbas) {
      navigation.ativarAbas();
    }

    if (window.navigation?.atualizarVisibilidadeFiltroMesAno) {
      setTimeout(() => {
        navigation.atualizarVisibilidadeFiltroMesAno();
      }, 100);
    }
  },

  initSessao() {
    if (window.authModule?.restaurarSessao) {
      authModule.restaurarSessao();
    }
  },

  init() {
    this.initEventosBasicos();
    this.initEventosModulos();
    this.initLayout();
    this.initSessao();

    const popupPagamento = document.getElementById("popupPagamento");
if (popupPagamento) {
  popupPagamento.classList.add("hidden");
}
  }
};

window.addEventListener("DOMContentLoaded", () => {
  window.app.init();
});
