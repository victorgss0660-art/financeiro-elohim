window.app = {
  abaAtual: "dashboard",

  meses: [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro"
  ],

  init() {
    this.preencherMeses();
    this.preencherAno();
    this.configurarMenu();
    this.abrirAba("dashboard");
  },

  preencherMeses() {
    const select = document.getElementById("mesSelect");
    if (!select) return;

    select.innerHTML = this.meses
      .map(mes => `<option value="${mes}">${mes}</option>`)
      .join("");

    const atual = new Date().getMonth();
    select.value = this.meses[atual];
  },

  preencherAno() {
    const ano = document.getElementById("anoSelect");
    if (!ano) return;

    ano.value = new Date().getFullYear();
  },

  configurarMenu() {
    const botoes = document.querySelectorAll("[data-tab]");

    botoes.forEach(btn => {
      btn.addEventListener("click", () => {
        const aba = btn.getAttribute("data-tab");
        this.abrirAba(aba);
      });
    });
  },

  abrirAba(nome) {
    this.abaAtual = nome;

    document.querySelectorAll(".tab-section").forEach(sec => {
      sec.classList.remove("active");
    });

    document.querySelectorAll("[data-tab]").forEach(btn => {
      btn.classList.remove("active");
    });

    const secao = document.getElementById(`tab-${nome}`);
    if (secao) secao.classList.add("active");

    const botao = document.querySelector(`[data-tab="${nome}"]`);
    if (botao) botao.classList.add("active");

    this.carregarModulo(nome);
  },

// ===== NAVEGAÇÃO VIA data-tab =====

document.addEventListener("DOMContentLoaded", () => {

  const botoes = document.querySelectorAll(".menu button");

  botoes.forEach(btn => {
    btn.addEventListener("click", () => {

      const tab = btn.getAttribute("data-tab");

      // esconder todas
      document.querySelectorAll(".tab-section").forEach(sec => {
        sec.style.display = "none";
        sec.classList.remove("active");
      });

      // mostrar selecionada
      const ativa = document.getElementById(`tab-${tab}`);
      if (ativa) {
        ativa.style.display = "block";
        ativa.classList.add("active");
      }

      // botão ativo
      botoes.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

    });
  });

  // abrir dashboard ao iniciar
  const first = document.querySelector('[data-tab="dashboard"]');
  if (first) first.click();

}); 

  async carregarModulo(nome) {
    try {
      if (nome === "dashboard" && window.dashboardModule?.carregar) {
        await dashboardModule.carregar();
      }

      if (nome === "contas-pagar" && window.contasPagarModule?.carregar) {
        await contasPagarModule.carregar();
      }

      if (nome === "contas-pagas" && window.contasPagasModule?.carregar) {
        await contasPagasModule.carregar();
      }

      if (nome === "contas-receber" && window.contasReceberModule?.carregar) {
        await contasReceberModule.carregar();
      }

      if (nome === "faturamento" && window.faturamentoModule?.carregar) {
        await faturamentoModule.carregar();
      }

      if (nome === "metas" && window.metasModule?.carregar) {
        await metasModule.carregar();
      }

      if (nome === "planejamento" && window.planejamentoModule?.carregar) {
        await planejamentoModule.carregar();
      }

      if (nome === "dre" && window.dreModule?.carregar) {
        await dreModule.carregar();
      }

      if (nome === "importar" && window.importarModule?.carregar) {
        await importarModule.carregar();
      }

    } catch (error) {
      console.error("Erro ao carregar módulo:", nome, error);
    }
  },

  async recarregarAbaAtual() {
    await this.carregarModulo(this.abaAtual);
  }
};

document.addEventListener("DOMContentLoaded", () => {
  app.init();
});
