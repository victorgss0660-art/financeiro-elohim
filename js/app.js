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

    const statusMesTopo = document.getElementById("statusMesTopo");
    const statusAtualizacaoTopo = document.getElementById("statusAtualizacaoTopo");

    if (window.utils?.getMesAno) {
      const { mes, ano } = utils.getMesAno();

      if (statusMes) statusMes.textContent = `${mes}/${ano}`;
      if (statusMesTopo) statusMesTopo.textContent = `${mes}/${ano}`;
    }

    const agora = new Date().toLocaleString("pt-BR");

    if (statusAtualizacao) statusAtualizacao.textContent = agora;
    if (statusAtualizacaoTopo) statusAtualizacaoTopo.textContent = agora;
    if (statusSituacao) statusSituacao.textContent = "Dados carregados";
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
        if (e.key === "Enter") authModule.login();
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
        if (window.authModule?.usuarioAtual) await this.carregarTudo();
      });
    }

    if (anoSelect) {
      anoSelect.addEventListener("change", async () => {
        if (window.authModule?.usuarioAtual) await this.carregarTudo();
      });
    }
  },

  initEventosModulos() {
    const btnSalvarContaPagar = document.getElementById("btnSalvarContaPagar");
    const btnSalvarContaReceber = document.getElementById("btnSalvarContaReceber");
    const btnSalvarFaturamento = document.getElementById("btnSalvarFaturamento");
    const btnSalvarMetas = document.getElementById("btnSalvarMetas");
    const btnPagarSelecionadas = document.getElementById("btnPagarSelecionadas");

    const btnImportarContasPagar = document.getElementById("btnImportarContasPagar");
    const btnExportarContasPagar = document.getElementById("btnExportarContasPagar");
    const fileInputContasPagar = document.getElementById("fileInputContasPagar");

    const btnImportarContasPagas = document.getElementById("btnImportarContasPagas");
    const btnExportarContasPagas = document.getElementById("btnExportarContasPagas");
    const fileInputContasPagas = document.getElementById("fileInputContasPagas");

    const fileInput = document.getElementById("fileInput");

    if (btnSalvarContaPagar) {
      btnSalvarContaPagar.addEventListener("click", () => {
        window.contasPagarModule?.salvarContaPagar?.();
      });
    }

    if (btnSalvarContaReceber) {
      btnSalvarContaReceber.addEventListener("click", () => {
        window.contasReceberModule?.salvarContaReceber?.();
      });
    }

    if (btnSalvarFaturamento) {
      btnSalvarFaturamento.addEventListener("click", () => {
        window.faturamentoModule?.salvarFaturamento?.();
      });
    }

    if (btnSalvarMetas) {
      btnSalvarMetas.addEventListener("click", () => {
        window.metasModule?.salvarMetas?.();
      });
    }

    if (btnPagarSelecionadas) {
      btnPagarSelecionadas.addEventListener("click", () => {
        window.contasPagarModule?.abrirPopupPagamentoLote?.();
      });
    }

    if (btnImportarContasPagar) {
      btnImportarContasPagar.addEventListener("click", () => {
        fileInputContasPagar?.click();
      });
    }

    if (btnExportarContasPagar) {
      btnExportarContasPagar.addEventListener("click", () => {
        window.contasPagarModule?.exportarPlanilha?.();
      });
    }

    if (fileInputContasPagar) {
      fileInputContasPagar.addEventListener("change", async (e) => {
        await window.contasPagarModule?.importarPlanilha?.(e);
      });
    }

    if (btnImportarContasPagas) {
      btnImportarContasPagas.addEventListener("click", () => {
        fileInputContasPagas?.click();
      });
    }

    if (btnExportarContasPagas) {
      btnExportarContasPagas.addEventListener("click", () => {
        window.contasPagasModule?.exportarPlanilha?.();
      });
    }

    if (fileInputContasPagas) {
      fileInputContasPagas.addEventListener("change", async (e) => {
        await window.contasPagasModule?.importarPlanilha?.(e);
      });
    }

    if (fileInput) {
      fileInput.addEventListener("change", (e) => {
        window.importarModule?.handleFile?.(e);
      });
    }

    document.querySelectorAll(".saldo-conta").forEach(input => {
      input.addEventListener("input", async () => {
        await window.planejamentoModule?.carregarPlanejamento?.();
      });
    });
  },

  initLayout() {
    utils?.definirMesAtual?.();
    navigation?.ativarAbas?.();

    if (window.navigation?.atualizarVisibilidadeFiltroMesAno) {
      setTimeout(() => {
        navigation.atualizarVisibilidadeFiltroMesAno();
      }, 100);
    }
  },

  initSessao() {
    authModule?.restaurarSessao?.();
  },

  initFiltros() {
    window.contasPagarModule?.registrarEventosFiltros?.();
  },

  initPopups() {
    document.getElementById("popupPagamento")?.classList.add("hidden");
    document.getElementById("popupPagamentoLote")?.classList.add("hidden");
  },

  init() {
    this.initEventosBasicos();
    this.initEventosModulos();
    this.initLayout();
    this.initSessao();
    this.initFiltros();
    this.initPopups();
  }
};

window.addEventListener("DOMContentLoaded", () => {
  window.app.init();
});
