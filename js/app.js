window.app = {
  abaAtual: "dashboard",
  iniciado: false,

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
      if (this.iniciado) return;

      this.iniciado = true;

      this.preencherFiltros();
      this.configurarMenu();
      this.restaurarUltimaAba();
    } catch (erro) {
      console.error("Erro ao iniciar aplicação:", erro);
    }
  },

  get(id) {
    return document.getElementById(id);
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

      mesSelect.value = this.meses[new Date().getMonth()];
    }

    if (anoSelect && !anoSelect.value) {
      anoSelect.value = new Date().getFullYear();
    }
  },

  // ======================================================
  // MENU
  // ======================================================

  configurarMenu() {
    const botoes = document.querySelectorAll(
      ".menu button, .sidebar-nav .nav-btn"
    );

    botoes.forEach(botao => {
      botao.onclick = () => {
        const aba = botao.dataset.tab;

        if (!aba) {
          console.warn("Botão sem data-tab:", botao);
          return;
        }

        this.abrirAba(aba);
      };
    });
  },

  atualizarBotaoAtivo(nomeAba) {
    document
      .querySelectorAll(".menu button, .sidebar-nav .nav-btn")
      .forEach(botao => {
        botao.classList.remove("active");
      });

    const botaoAtivo = document.querySelector(
      `.menu button[data-tab="${nomeAba}"], .sidebar-nav .nav-btn[data-tab="${nomeAba}"]`
    );

    if (botaoAtivo) {
      botaoAtivo.classList.add("active");
    }
  },

  esconderAbas() {
    document.querySelectorAll(".tab-section").forEach(secao => {
      secao.classList.remove("active");
      secao.style.display = "none";
    });
  },

  // ======================================================
  // ABAS
  // ======================================================

  abrirAba(nomeAba) {
    try {
      if (
        window.authModule &&
        typeof authModule.podeAcessar === "function" &&
        !authModule.podeAcessar(nomeAba)
      ) {
        alert("Você não possui permissão para acessar esta área.");
        return;
      }

      const secaoAtiva = this.get(`tab-${nomeAba}`);

      if (!secaoAtiva) {
        console.warn("Aba não encontrada:", nomeAba);
        return;
      }

      this.abaAtual = nomeAba;

      localStorage.setItem(
        "abaAtualFinanceiro",
        nomeAba
      );

      this.esconderAbas();

      secaoAtiva.style.display = "block";
      secaoAtiva.classList.add("active");

      this.atualizarBotaoAtivo(nomeAba);

      this.carregarModulo(nomeAba);
    } catch (erro) {
      console.error("Erro ao abrir aba:", nomeAba, erro);
    }
    this.atualizarTituloMobile(nomeAba);
    this.fecharMenuMobile();
  },

  restaurarUltimaAba() {
    const ultima = localStorage.getItem("abaAtualFinanceiro");

    if (
      ultima &&
      this.get(`tab-${ultima}`) &&
      (!window.authModule?.podeAcessar || authModule.podeAcessar(ultima))
    ) {
      this.abrirAba(ultima);
      return;
    }

    const primeiraPermitida = Array
      .from(
        document.querySelectorAll(".menu button, .sidebar-nav .nav-btn")
      )
      .find(btn => {
        const aba = btn.dataset.tab;
        const visivel = btn.style.display !== "none";

        const permitido =
          !window.authModule?.podeAcessar ||
          authModule.podeAcessar(aba);

        return (
          visivel &&
          aba &&
          permitido &&
          this.get(`tab-${aba}`)
        );
      });

    if (primeiraPermitida) {
      this.abrirAba(primeiraPermitida.dataset.tab);
      return;
    }

    console.warn("Nenhuma aba permitida encontrada.");
  },

  // ======================================================
  // MÓDULOS
  // ======================================================

  async carregarModulo(nomeAba) {
    try {
      switch (nomeAba) {
        case "dashboard":
          if (window.dashboardModule?.carregar) {
            await dashboardModule.carregar();
          }
          break;

        case "contas-pagar":
          if (window.contasPagarModule?.carregar) {
            await contasPagarModule.carregar();
          }
          break;

        case "contas-pagas":
          if (window.contasPagasModule?.carregar) {
            await contasPagasModule.carregar();
          }
          break;

        case "contas-receber":
          if (window.contasReceberModule?.carregar) {
            await contasReceberModule.carregar();
          }
          break;

        case "planejamento":
          if (window.planejamentoModule?.carregar) {
            await planejamentoModule.carregar();
          }
          break;

        case "inserir-dados":
          if (window.inserirDadosModule?.carregar) {
            await inserirDadosModule.carregar();
          }
          break;

        default:
          console.warn("Nenhum módulo encontrado para:", nomeAba);
      }
    } catch (erro) {
      console.error("Erro ao carregar módulo:", nomeAba, erro);
    }
  },

  async recarregarAbaAtual() {
    try {
      await this.carregarModulo(this.abaAtual);
    } catch (erro) {
      console.error("Erro ao recarregar aba:", erro);
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

document.addEventListener("DOMContentLoaded", () => {
  try {
    if (window.authModule?.iniciar) {
      authModule.iniciar();
      return;
    }

    app.iniciar();
  } catch (erro) {
    console.error("Erro ao iniciar sistema:", erro);
  }
    toggleMenuMobile() {
    const sidebar = document.querySelector(".sidebar");
    const overlay = document.getElementById("mobileMenuOverlay");

    if (!sidebar) return;

    sidebar.classList.toggle("mobile-open");

    if (overlay) {
      overlay.classList.toggle("active");
    }
  },

  fecharMenuMobile() {
    const sidebar = document.querySelector(".sidebar");
    const overlay = document.getElementById("mobileMenuOverlay");

    if (sidebar) {
      sidebar.classList.remove("mobile-open");
    }

    if (overlay) {
      overlay.classList.remove("active");
    }
  },

  atualizarTituloMobile(nomeAba) {
    const nomes = {
      "dashboard": "Dashboard",
      "contas-pagar": "Contas a Pagar",
      "contas-pagas": "Contas Pagas",
      "contas-receber": "Contas a Receber",
      "planejamento": "Planejamento",
      "inserir-dados": "Inserir Dados"
    };

    const el = document.getElementById("mobileAbaAtual");

    if (el) {
      el.textContent = nomes[nomeAba] || nomeAba;
    }
  },
});
