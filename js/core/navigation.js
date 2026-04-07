window.navigation = {
  ativarAbas() {
    const botoes = document.querySelectorAll(".menu-btn");
    const abas = document.querySelectorAll(".tab-section");

    if (!botoes.length || !abas.length) return;

    const abrirAba = (nomeAba) => {
      botoes.forEach(btn => {
        btn.classList.toggle("active", btn.dataset.tab === nomeAba);
      });

      abas.forEach(aba => {
        aba.classList.remove("active");
      });

      const abaAlvo = document.getElementById(`tab-${nomeAba}`);
      if (abaAlvo) {
        abaAlvo.classList.add("active");
      }

      this.atualizarVisibilidadeFiltroMesAno(nomeAba);
      window.scrollTo({ top: 0, behavior: "smooth" });
    };

    botoes.forEach(btn => {
      if (btn.dataset.bindedTab === "1") return;

      btn.addEventListener("click", () => {
        const nomeAba = btn.dataset.tab;
        abrirAba(nomeAba);
      });

      btn.dataset.bindedTab = "1";
    });

    const botaoAtivo = document.querySelector(".menu-btn.active");
    const abaInicial = botaoAtivo?.dataset.tab || "dashboard";
    abrirAba(abaInicial);
  },

  atualizarVisibilidadeFiltroMesAno(nomeAbaAtual = null) {
    const bloco = document.getElementById("blocoFiltroMesAno");
    if (!bloco) return;

    let aba = nomeAbaAtual;

    if (!aba) {
      const btnAtivo = document.querySelector(".menu-btn.active");
      aba = btnAtivo?.dataset.tab || "dashboard";
    }

    const abasSemFiltro = [
      "contas-pagar",
      "contas-pagas",
      "contas-receber",
      "contas-recebidas",
      "planejamento"
    ];

    if (abasSemFiltro.includes(aba)) {
      bloco.classList.add("hidden");
    } else {
      bloco.classList.remove("hidden");
    }
  }
};
