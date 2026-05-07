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

  iniciar() {

    try {

      this.preencherFiltros();

      this.configurarMenu();

      this.restaurarUltimaAba();

      this.carregarModulo(this.abaAtual);

    } catch (erro) {

      console.error(
        "Erro ao iniciar aplicação:",
        erro
      );
    }
  },

  // ======================================================
  // HELPERS
  // ======================================================

  get(id) {
    return document.getElementById(id);
  },

  existe(el) {
    return !!el;
  },

  // ======================================================
  // FILTROS
  // ======================================================

  preencherFiltros() {

    const mesSelect = this.get("mesSelect");
    const anoSelect = this.get("anoSelect");

    if (mesSelect && mesSelect.options.length === 0) {

      this.meses.forEach(mes => {

        const option = document.createElement("option");

        option.value = mes;
        option.textContent = mes;

        mesSelect.appendChild(option);
      });

      mesSelect.value =
        this.meses[new Date().getMonth()];
    }

    if (anoSelect && !anoSelect.value) {
      anoSelect.value =
        new Date().getFullYear();
    }
  },

  // ======================================================
  // MENU
  // ======================================================

  configurarMenu() {

    const botoes =
      document.querySelectorAll(".menu button");

    botoes.forEach(botao => {

      botao.addEventListener("click", () => {

        const aba =
          botao.dataset.tab;

        if (!aba) return;

        this.abrirAba(aba);
      });
    });
  },

  // ======================================================
  // ABAS
  // ======================================================

  abrirAba(nomeAba) {

    try {

      // =========================
      // PERMISSÃO
      // =========================

      if (
        window.authModule &&
        typeof authModule.podeAcessar === "function"
      ) {

        const permitido =
          authModule.podeAcessar(nomeAba);

        if (!permitido) {

          alert(
            "Você não possui permissão para acessar esta área."
          );

          return;
        }
      }

      this.abaAtual = nomeAba;

      localStorage.setItem(
        "abaAtualFinanceiro",
        nomeAba
      );

      // =========================
      // ESCONDER ABAS
      // =========================

      document
        .querySelectorAll(".tab-section")
        .forEach(secao => {

          secao.classList.remove("active");

          secao.style.display = "none";
        });

      // =========================
      // REMOVER ACTIVE MENU
      // =========================

      document
        .querySelectorAll(".menu button")
        .forEach(botao => {

          botao.classList.remove("active");
        });

      // =========================
      // MOSTRAR ABA
      // =========================

      const secaoAtiva =
        this.get(`tab-${nomeAba}`);

      if (secaoAtiva) {

        secaoAtiva.style.display = "block";

        secaoAtiva.classList.add("active");
      }

      // =========================
      // ATIVAR BOTÃO MENU
      // =========================

      const botaoAtivo =
        document.querySelector(
          `.menu button[data-tab="${nomeAba}"]`
        );

      if (botaoAtivo) {

        botaoAtivo.classList.add("active");
      }

      // =========================
      // CARREGAR MÓDULO
      // =========================

      this.carregarModulo(nomeAba);

    } catch (erro) {

      console.error(
        "Erro ao abrir aba:",
        nomeAba,
        erro
      );
    }
  },

restaurarUltimaAba() {
  const ultima = localStorage.getItem("abaAtualFinanceiro");

  if (
    ultima &&
    (!window.authModule?.podeAcessar || authModule.podeAcessar(ultima))
  ) {
    this.abrirAba(ultima);
    return;
  }

  const primeiraPermitida = document.querySelector(".menu button:not([style*='display: none'])");

  if (primeiraPermitida) {
    this.abrirAba(primeiraPermitida.dataset.tab);
    return;
  }

  console.warn("Nenhuma aba permitida encontrada.");
}

  // ======================================================
  // LOAD MÓDULOS
  // ======================================================

  async carregarModulo(nomeAba) {

    try {

      switch (nomeAba) {

        case "dashboard":

          if (
            window.dashboardModule?.carregar
          ) {

            await dashboardModule.carregar();
          }

          break;

        case "contas-pagar":

          if (
            window.contasPagarModule?.carregar
          ) {

            await contasPagarModule.carregar();
          }

          break;

        case "contas-pagas":

          if (
            window.contasPagasModule?.carregar
          ) {

            await contasPagasModule.carregar();
          }

          break;

        case "contas-receber":

          if (
            window.contasReceberModule?.carregar
          ) {

            await contasReceberModule.carregar();
          }

          break;

        case "planejamento":

          if (
            window.planejamentoModule?.carregar
          ) {

            await planejamentoModule.carregar();
          }

          break;

        case "inserir-dados":

          if (
            window.inserirDadosModule?.carregar
          ) {

            await inserirDadosModule.carregar();
          }

          break;

        default:

          console.warn(
            "Nenhum módulo encontrado para:",
            nomeAba
          );
      }

    } catch (erro) {

      console.error(
        "Erro ao carregar módulo:",
        nomeAba,
        erro
      );
    }
  },

  // ======================================================
  // RELOAD
  // ======================================================

  async recarregarAbaAtual() {

    try {

      await this.carregarModulo(
        this.abaAtual
      );

    } catch (erro) {

      console.error(
        "Erro ao recarregar aba:",
        erro
      );
    }
  }
};

// ======================================================
// FUNÇÕES GLOBAIS
// ======================================================

window.abrirAba = function(nomeAba) {
  app.abrirAba(nomeAba);
};

// ======================================================
// START
// ======================================================

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    try {

      // AUTH
      if (
        window.authModule?.iniciar
      ) {

        await authModule.iniciar();

        return;
      }

      // SEM AUTH
      app.iniciar();

    } catch (erro) {

      console.error(
        "Erro ao iniciar sistema:",
        erro
      );
    }
  }
);
document.addEventListener("DOMContentLoaded", async () => {
  if (window.authModule?.iniciar) {
    await authModule.iniciar();
    return;
  }

  app.iniciar();
});
