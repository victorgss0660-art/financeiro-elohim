

window.navigation = {
  ativarAbas() {
    const botoes = document.querySelectorAll(".menu-btn");
    const abas = document.querySelectorAll(".tab-section");

    botoes.forEach(botao => {
      botao.addEventListener("click", () => {
        botoes.forEach(b => b.classList.remove("active"));
        abas.forEach(a => a.classList.remove("active", "fade-in"));

        botao.classList.add("active");

        const tab = botao.dataset.tab;
        const secao = document.getElementById(`tab-${tab}`);
        if (secao) {
          secao.classList.add("active");
          requestAnimationFrame(() => secao.classList.add("fade-in"));
        }

        this.atualizarVisibilidadeFiltroMesAno();
      });
    });
  },

  atualizarVisibilidadeFiltroMesAno() {
    const bloco = document.getElementById("blocoFiltroMesAno");
    const abaAtiva = document.querySelector(".tab-section.active");
    if (!bloco || !abaAtiva) return;

    const tabsSemFiltro = [
      "tab-contas-pagar",
      "tab-contas-pagas",
      "tab-contas-receber",
      "tab-contas-recebidas",
      "tab-planejamento"
    ];

    if (tabsSemFiltro.includes(abaAtiva.id)) bloco.classList.add("hidden");
    else bloco.classList.remove("hidden");
  }
};

