window.app = {
  currentTab: "dashboard",

  init() {
    this.bindMenu();
    this.initDefault();
  },

  bindMenu() {
    document.querySelectorAll(".menu-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const tab = btn.dataset.tab;
        if (!tab) return;
        this.navigate(tab);
      });
    });
  },

  initDefault() {
    this.navigate("dashboard");
  },

  async navigate(tabName) {
    const secoes = document.querySelectorAll(".tab-section");
    const proxima = document.getElementById(`tab-${tabName}`);
    const atual = document.querySelector(".tab-section.active");

    if (!proxima) {
      console.warn(`Aba não encontrada: tab-${tabName}`);
      return;
    }

    this.currentTab = tabName;

    // menu ativo
    document.querySelectorAll(".menu-btn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.tab === tabName);
    });

    // esconder todas
    secoes.forEach(sec => {
      sec.classList.remove("active", "leaving");
      sec.style.display = "none";
    });

    // mostrar nova
    proxima.style.display = "block";
    proxima.classList.add("active");

    // scroll topo
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });

    // carregar dados da aba
    await this.onTabChange(tabName);
  },

  async onTabChange(tabName) {
    try {
      switch (tabName) {
        case "dashboard":
          await window.faturamentoModule?.carregarFaturamento?.();
          await window.metasModule?.carregarMetas?.();
          await window.dashboardModule?.carregarDashboard?.();
          break;

        case "contas-pagar":
          await window.contasPagarModule?.init?.();
          break;

        case "contas-pagas":
          await window.contasPagasModule?.init?.();
          break;

        case "contas-receber":
          await window.contasReceberModule?.init?.();
          break;

        case "contas-recebidas":
          await window.contasRecebidasModule?.init?.();
          break;

        case "faturamento":
          await window.faturamentoModule?.carregarFaturamento?.();
          break;

        case "metas":
          await window.metasModule?.carregarMetas?.();
          break;

        case "importar":
          await window.importarModule?.init?.();
          break;

        case "resumo":
          await window.resumoModule?.carregarResumo?.();
          break;

        case "planejamento":
          await window.planejamentoModule?.carregarSaldosBancarios?.();
          await window.planejamentoModule?.carregarPlanejamento?.();
          break;

        default:
          console.warn("Aba sem handler:", tabName);
      }
    } catch (e) {
      console.error(`Erro ao carregar aba ${tabName}:`, e);
      utils.setAppMsg(`Erro ao carregar ${tabName}: ${e.message}`, "err");
    }
  }
};

// inicia sistema
document.addEventListener("DOMContentLoaded", () => {
  window.app.init();
});
