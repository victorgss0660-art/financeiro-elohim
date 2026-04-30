const app = {
  abaAtual: "dashboard",

  meses: [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ],

  iniciar() {
    this.preencherFiltros();
    this.configurarMenu();
    this.abrirAba("dashboard");
  },

  preencherFiltros() {
    const mesSelect = document.getElementById("mesSelect");
    const anoSelect = document.getElementById("anoSelect");

    if (mesSelect && !mesSelect.options.length) {
      this.meses.forEach((mes) => {
        const option = document.createElement("option");
        option.value = mes;
        option.textContent = mes;
        mesSelect.appendChild(option);
      });

      mesSelect.value = this.meses[new Date().getMonth()];
    }

    if (anoSelect && !anoSelect.value) {
      anoSelect.value = new Date().getFullYear();
    }
  },

  configurarMenu() {
    const botoes = document.querySelectorAll(".menu button");

    botoes.forEach((botao) => {
      botao.addEventListener("click", () => {
        const nomeAba = botao.dataset.tab;
        if (nomeAba) {
          this.abrirAba(nomeAba);
        }
      });
    });
  },

  async abrirAba(nomeAba) {
    this.abaAtual = nomeAba;

    document.querySelectorAll(".tab-section").forEach((section) => {
      section.classList.remove("active");
      section.style.display = "none";
    });

    const sectionAtiva = document.getElementById(`tab-${nomeAba}`);

    if (sectionAtiva) {
      sectionAtiva.classList.add("active");
      sectionAtiva.style.display = "block";
    }

    document.querySelectorAll(".menu button").forEach((botao) => {
      botao.classList.toggle("active", botao.dataset.tab === nomeAba);
    });

    await this.carregarModulo(nomeAba);
  },

  async carregarModulo(nomeAba) {
    try {
      if (nomeAba === "dashboard" && window.dashboardModule?.carregar) {
        await dashboardModule.carregar();
      }

      if (nomeAba === "contas-pagar" && window.contasPagarModule?.carregar) {
        await contasPagarModule.carregar();
      }

      if (nomeAba === "contas-pagas" && window.contasPagasModule?.carregar) {
        await contasPagasModule.carregar();
      }

      if (nomeAba === "contas-receber" && window.contasReceberModule?.carregar) {
        await contasReceberModule.carregar();
      }

      if (nomeAba === "planejamento" && window.planejamentoModule?.carregar) {
        await planejamentoModule.carregar();
      }

      if (nomeAba === "faturamento" && window.faturamentoModule?.carregar) {
        await faturamentoModule.carregar();
      }

      if (nomeAba === "metas" && window.metasModule?.carregar) {
        await metasModule.carregar();
      }

      if (nomeAba === "dre" && window.dreModule?.carregar) {
        await dreModule.carregar();
      }

      if (nomeAba === "importar" && window.importarModule?.carregar) {
        await importarModule.carregar();
      }
    } catch (error) {
      console.error("Erro ao carregar módulo:", nomeAba, error);
    }
  },

  async recarregarAbaAtual() {
    await this.carregarModulo(this.abaAtual);
  }
};

window.app = app;

document.addEventListener("DOMContentLoaded", () => {
  app.iniciar();
});
