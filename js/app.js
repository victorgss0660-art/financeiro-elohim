window.app = {
  currentTab: "dashboard",

  async init() {
    console.log("App iniciado");

    this.bindMenu();
    this.bindGlobalButtons();
    this.preencherAnoAtual();

    // 🔥 inicializa módulos
    window.importarModule?.init?.();
    window.contasPagarModule?.init?.();
    window.contasPagasModule?.init?.();
    window.contasReceberModule?.init?.();
    window.contasRecebidasModule?.init?.();

    // carrega dashboard inicial
    await this.loadTab("dashboard");
  },

  preencherAnoAtual() {
    const anoSelect = document.getElementById("anoSelect");
    if (!anoSelect) return;

    const anoAtual = new Date().getFullYear();
    anoSelect.value = anoAtual;
  },

  bindMenu() {
    const buttons = document.querySelectorAll(".menu-btn");

    buttons.forEach(btn => {
      btn.addEventListener("click", async () => {
        const tab = btn.dataset.tab;
        await this.navigate(tab);
      });
    });
  },

  bindGlobalButtons() {
    const btnMes = document.getElementById("btnCarregarMes");

    if (btnMes) {
      btnMes.addEventListener("click", async () => {
        await this.loadTab(this.currentTab);
      });
    }

    const btnSair = document.getElementById("btnSair");

    if (btnSair) {
      btnSair.addEventListener("click", () => {
        location.reload();
      });
    }
  },

  async navigate(tab) {
    this.currentTab = tab;

    // troca menu ativo
    document.querySelectorAll(".menu-btn").forEach(b =>
      b.classList.remove("active")
    );

    document
      .querySelector(`[data-tab="${tab}"]`)
      ?.classList.add("active");

    // troca conteúdo
    document.querySelectorAll(".tab-section").forEach(sec =>
      sec.classList.remove("active")
    );

    document
      .getElementById(`tab-${tab}`)
      ?.classList.add("active");

    await this.loadTab(tab);
  },

  async loadTab(tab) {
    try {
      utils.setAppMsg("Carregando...", "info");

      switch (tab) {
        case "dashboard":
          await window.dashboardModule?.carregarDashboard?.();
          break;

        case "contas-pagar":
          await window.contasPagarModule?.load?.();
          break;

        case "contas-pagas":
          await window.contasPagasModule?.load?.();
          break;

        case "contas-receber":
          await window.contasReceberModule?.load?.();
          break;

        case "contas-recebidas":
          await window.contasRecebidasModule?.load?.();
          break;

        case "faturamento":
          await window.faturamentoModule?.load?.();
          break;

        case "metas":
          await window.metasModule?.load?.();
          break;

        case "importar":
          window.importarModule?.init?.();
          break;

        case "resumo":
          await window.resumoModule?.carregarResumoAnual?.();
          break;

        case "dre":
          await window.dreModule?.carregarDRE?.();
          break;

        case "planejamento":
          await window.planejamentoModule?.load?.();
          break;
      }

      utils.setAppMsg("");
    } catch (e) {
      console.error(e);
      utils.setAppMsg("Erro ao carregar: " + e.message, "err");
    }
  }
};

window.addEventListener("DOMContentLoaded", () => {
  window.app.init();
});
