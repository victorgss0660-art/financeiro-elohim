let abaAtual = "dashboard";

document.addEventListener("DOMContentLoaded", () => {
  preencherFiltros();
  configurarMenu();
  abrirAba("dashboard");
});

function preencherFiltros() {
  const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const mesSelect = document.getElementById("mesSelect");
  const anoSelect = document.getElementById("anoSelect");

  if (mesSelect && mesSelect.options.length === 0) {
    meses.forEach(mes => {
      const option = document.createElement("option");
      option.value = mes;
      option.textContent = mes;
      mesSelect.appendChild(option);
    });

    mesSelect.value = meses[new Date().getMonth()];
  }

  if (anoSelect && !anoSelect.value) {
    anoSelect.value = new Date().getFullYear();
  }
}

function configurarMenu() {
  const botoes = document.querySelectorAll(".menu button");

  botoes.forEach(botao => {
    botao.addEventListener("click", () => {
      const aba = botao.dataset.tab;
      if (aba) abrirAba(aba);
    });
  });
}

function abrirAba(nomeAba) {
  abaAtual = nomeAba;

  document.querySelectorAll(".tab-section").forEach(secao => {
    secao.classList.remove("active");
    secao.style.display = "none";
  });

  const secaoAtiva = document.getElementById(`tab-${nomeAba}`);

  if (secaoAtiva) {
    secaoAtiva.classList.add("active");
    secaoAtiva.style.display = "block";
  }

  document.querySelectorAll(".menu button").forEach(botao => {
    botao.classList.remove("active");
  });

  const botaoAtivo = document.querySelector(`.menu button[data-tab="${nomeAba}"]`);
  if (botaoAtivo) botaoAtivo.classList.add("active");

  carregarModulo(nomeAba);
}

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

    if (nomeAba === "inserir-dados" && window.inserirDadosModule?.carregar) {
      inserirDadosModule.carregar();
    }
  } catch (erro) {
    console.error("Erro ao carregar módulo:", nomeAba, erro);
  }
}

function recarregarAbaAtual() {
  carregarModulo(abaAtual);
}

window.app = {
  abrirAba,
  recarregarAbaAtual
};
