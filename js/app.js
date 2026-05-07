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

  configurarMenu() {
    const botoes = document.querySelectorAll(".menu button");

    botoes.forEach(botao => {
      botao.onclick = () => {
        const aba = botao.dataset.tab;
        if (aba) this.abrirAba(aba);
      };
    });
  },

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
      localStorage.setItem("abaAtualFinanceiro", nomeAba);

      document.querySelectorAll(".tab-section").forEach(secao => {
        secao.classList.remove("active");
        secao.style.display = "none";
      });

      secaoAtiva.style.display = "block";
      secaoAtiva.classList.add("active");

      document.querySelectorAll(".menu button").forEach(botao => {
        botao.classList.remove("active");
      });

      const botaoAtivo = document.querySelector(`.menu button[data-tab="${nomeAba}"]`);
      if (botaoAtivo) botaoAtivo.classList.add("active");

      this.carregarModulo(nomeAba);
    } catch (erro) {
      console.error("Erro ao abrir aba:", nomeAba, erro);
    }
  },

  restaurarUltimaAba() {
    const ultima = localStorage.getItem("abaAtualFinanceiro");

    if (
      ultima &&
      (!window.authModule?.podeAcessar || authModule.podeAcessar(ultima)) &&
      this.get(`tab-${ultima}`)
    ) {
      this.abrirAba(ultima);
      return;
    }

    const primeiraPermitida = Array.from(document.querySelectorAll(".menu button"))
      .find(btn => {
        const visivel = btn.style.display !== "none";
        const aba = btn.dataset.tab;
        const permitido = !window.authModule?.podeAcessar || authModule.podeAcessar(aba);
        return visivel && aba && permitido && this.get(`tab-${aba}`);
      });

    if (primeiraPermitida) {
      this.abrirAba(primeiraPermitida.dataset.tab);
      return;
    }

    console.warn("Nenhuma aba permitida encontrada.");
  },

  async carregarModulo(nomeAba) {
    try {
      switch (nomeAba) {
        case "dashboard":
          if (window.dashboardModule?.carregar) await dashboardModule.carregar();
          break;

        case "contas-pagar":
          if (window.contasPagarModule?.carregar) await contasPagarModule.carregar();
          break;

        case "contas-pagas":
          if (window.contasPagasModule?.carregar) await contasPagasModule.carregar();
          break;

        case "contas-receber":
          if (window.contasReceberModule?.carregar) await contasReceberModule.carregar();
          break;

        case "planejamento":
          if (window.planejamentoModule?.carregar) await planejamentoModule.carregar();
          break;

        case "inserir-dados":
          if (window.inserirDadosModule?.carregar) await inserirDadosModule.carregar();
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

window.abrirAba = function(nomeAba) {
  app.abrirAba(nomeAba);
};

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
});
