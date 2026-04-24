document.addEventListener("DOMContentLoaded", async () => {
  try {
    iniciarApp();
  } catch (error) {
    console.error("Erro ao iniciar app:", error);
  }
});

function iniciarApp() {
  preencherSelectsMesAno();
  configurarAbas();
  configurarEventosGlobais();

  abrirAbaInicial();
}

function preencherSelectsMesAno() {
  const meses = [
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
  ];

  const anoAtual = new Date().getFullYear();
  const mesAtual = meses[new Date().getMonth()];

  document.querySelectorAll("select[id$='Mes'], #mesSelect").forEach((select) => {
    if (!select) return;

    if (!select.innerHTML.trim()) {
      select.innerHTML = meses
        .map((mes) => `<option value="${mes}">${mes}</option>`)
        .join("");
    }

    if (!select.value) {
      select.value = mesAtual;
    }
  });

  document.querySelectorAll("input[id$='Ano'], #anoSelect").forEach((input) => {
    if (!input) return;

    if (!input.value) {
      input.value = anoAtual;
    }
  });

  const mesSelect = document.getElementById("mesSelect");
  const anoSelect = document.getElementById("anoSelect");

  if (mesSelect && !mesSelect.value) mesSelect.value = mesAtual;
  if (anoSelect && !anoSelect.value) anoSelect.value = anoAtual;
}

function configurarAbas() {
  const botoes = document.querySelectorAll("[data-tab]");

  botoes.forEach((botao) => {
    botao.addEventListener("click", () => {
      const tab = botao.dataset.tab;
      abrirAba(tab);
    });
  });
}

function abrirAbaInicial() {
  const botaoAtivo = document.querySelector("[data-tab].active");
  const tabInicial = botaoAtivo?.dataset?.tab || "dashboard";

  abrirAba(tabInicial);
}

async function abrirAba(tab) {
  if (!tab) return;

  document.querySelectorAll("[data-tab]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tab);
  });

  document.querySelectorAll(".tab-section").forEach((section) => {
    section.classList.remove("active");
    section.classList.add("hidden");
  });

  const alvo = document.getElementById(`tab-${tab}`);
  if (alvo) {
    alvo.classList.add("active");
    alvo.classList.remove("hidden");
  }

  await carregarModuloDaAba(tab);
}

async function carregarModuloDaAba(tab) {
  try {
    if (tab === "dashboard" && window.dashboardModule) {
      await dashboardModule.carregarDashboard();
      return;
    }

    if (tab === "planejamento" && window.planejamentoModule) {
      await planejamentoModule.carregar();
      return;
    }

    if (tab === "faturamento" && window.faturamentoModule) {
      await faturamentoModule.carregar();
      return;
    }

    if (tab === "metas" && window.metasModule) {
      await metasModule.carregar();
      return;
    }

    if (tab === "importar" && window.importarModule) {
      if (typeof importarModule.carregar === "function") {
        await importarModule.carregar();
      }
      return;
    }

if (tab === "contas-pagar" && window.contasPagarModule) {
  if (typeof contasPagarModule.carregar === "function") {
    await contasPagarModule.carregar();
  } else if (typeof contasPagarModule.init === "function") {
    await contasPagarModule.init();
  } else if (typeof contasPagarModule.listar === "function") {
    await contasPagarModule.listar();
  }
  return;
}

    if (tab === "contas-pagas" && window.contasPagasModule) {
      await contasPagasModule.carregar();
      return;
    }

    if (tab === "contas-receber" && window.contasReceberModule) {
      await contasReceberModule.carregar();
      return;
    }

    if (tab === "dre" && window.dreModule) {
      await dreModule.carregar();
      return;
    }

    if (tab === "fornecedores" && window.fornecedoresModule) {
      await fornecedoresModule.carregar();
      return;
    }
  } catch (error) {
    console.error(`Erro ao carregar aba ${tab}:`, error);

    if (window.utils?.setAppMsg) {
      utils.setAppMsg(`Erro ao carregar aba ${tab}: ${error.message}`, "err");
    }
  }
}

function configurarEventosGlobais() {
  const mesSelect = document.getElementById("mesSelect");
  const anoSelect = document.getElementById("anoSelect");

  if (mesSelect) {
    mesSelect.addEventListener("change", recarregarAbaAtual);
  }

  if (anoSelect) {
    anoSelect.addEventListener("change", recarregarAbaAtual);
  }
}

async function recarregarAbaAtual() {
  const ativo = document.querySelector("[data-tab].active");
  const tab = ativo?.dataset?.tab || "dashboard";

  await carregarModuloDaAba(tab);
}

window.app = {
  abrirAba,
  recarregarAbaAtual,
  carregarModuloDaAba
};
