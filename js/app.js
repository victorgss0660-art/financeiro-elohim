// ===== APP GLOBAL =====

let abaAtual = "dashboard";

// ===== INICIALIZAÇÃO =====
document.addEventListener("DOMContentLoaded", () => {

  const botoes = document.querySelectorAll(".menu button");

  botoes.forEach(btn => {
    btn.addEventListener("click", () => {
      const nomeAba = btn.dataset.tab;
      abrirAba(nomeAba);
    });
  });

  abrirAba("dashboard");
});


// ===== TROCA DE ABAS =====
function abrirAba(nomeAba) {

  abaAtual = nomeAba;

  // esconder todas
  document.querySelectorAll(".tab-section").forEach(sec => {
    sec.classList.remove("active");
  });

  // mostrar a correta
  const ativa = document.getElementById(`tab-${nomeAba}`);
  if (ativa) ativa.classList.add("active");

  // botão ativo
  document.querySelectorAll(".menu button").forEach(btn => {
    btn.classList.remove("active");
  });

  const btn = document.querySelector(`.menu button[data-tab="${nomeAba}"]`);
  if (btn) btn.classList.add("active");

  carregarModulo(nomeAba);
}


// ===== CARREGAMENTO DOS MÓDULOS =====
function carregarModulo(nomeAba) {

  try {

    if (nomeAba === "dashboard" && window.dashboardModule?.carregar) {
      dashboardModule.carregar();
    }

    if (nomeAba === "contas-pagar" && window.contasPagarModule?.carregar) {
      contasPagarModule.carregar();
    }

    if (nomeAba === "contas-pagas" && window.contasPagasModule?.carregar) {
      contasPagasModule.carregar();
    }

    if (nomeAba === "contas-receber" && window.contasReceberModule?.carregar) {
      contasReceberModule.carregar();
    }

    if (nomeAba === "planejamento" && window.planejamentoModule?.carregar) {
      planejamentoModule.carregar();
    }

  } catch (e) {
    console.error("Erro ao carregar módulo:", nomeAba, e);
  }
}


// ===== RECARREGAR =====
function recarregarAbaAtual() {
  carregarModulo(abaAtual);
}

// expõe global
window.app = {
  recarregarAbaAtual
};
