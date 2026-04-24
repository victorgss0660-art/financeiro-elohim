document.addEventListener("DOMContentLoaded", () => {
  iniciarApp();
});

function iniciarApp() {
  preencherSelectsMesAno();
  configurarAbas();
  configurarEventosGlobais();
  abrirAbaInicial();
}

function preencherSelectsMesAno() {
  const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const mesAtual = meses[new Date().getMonth()];
  const anoAtual = String(new Date().getFullYear());

  document.querySelectorAll("select[id$='Mes'], #mesSelect").forEach((select) => {
    if (!select) return;

    if (!select.innerHTML.trim()) {
      select.innerHTML = meses
        .map((mes) => `<option value="${mes}">${mes}</option>`)
        .join("");
    }

    if (!select.value) select.value = mesAtual;
  });

  document.querySelectorAll("input[id$='Ano'], #anoSelect").forEach((input) => {
    if (!input) return;
    if (!input.value) input.value = anoAtual;
  });
}

function configurarAbas() {
  document.querySelectorAll("[data-tab]").forEach((botao) => {
    botao.addEventListener("click", () => abrirAba(botao.dataset.tab));
  });
}

function abrirAbaInicial() {
  const ativo = document.querySelector("[data-tab].active");
  abrirAba(ativo?.dataset?.tab || "dashboard");
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

  const section = document.getElementById(`tab-${tab}`);
  if (section) {
    section.classList.add("active");
    section.classList.remove("hidden");
  }

  await carregarModuloDaAba(tab);
}

async function carregarModuloDaAba(tab) {
  const modulo = obterModulo(tab);

  if (!modulo) {
    console.warn(`Módulo da aba "${tab}" não encontrado.`);
    return;
  }

  try {
    await executarPrimeiraFuncaoDisponivel(modulo, [
      "carregarDashboard",
      "carregar",
      "init",
      "listar",
      "render",
      "load",
      "atualizar",
      "buscar",
      "start"
    ]);
  } catch (error) {
    console.error(`Erro ao carregar aba ${tab}:`, error);

    if (window.utils?.setAppMsg) {
      utils.setAppMsg(`Erro ao carregar aba ${tab}: ${error.message}`, "err");
    }
  }
}

function obterModulo(tab) {
  const mapa = {
    dashboard: window.dashboardModule,
    planejamento: window.planejamentoModule,
    faturamento: window.faturamentoModule,
    metas: window.metasModule,
    importar: window.importarModule,

    "contas-pagar": window.contasPagarModule,
    contasPagar: window.contasPagarModule,

    "contas-pagas": window.contasPagasModule,
    contasPagas: window.contasPagasModule,

    "contas-receber": window.contasReceberModule,
    contasReceber: window.contasReceberModule,

    "contas-recebidas": window.contasRecebidasModule,
    contasRecebidas: window.contasRecebidasModule,

    resumo: window.resumoModule,
    dre: window.dreModule,
    fornecedores: window.fornecedoresModule
  };

  return mapa[tab];
}

async function executarPrimeiraFuncaoDisponivel(modulo, nomes) {
  for (const nome of nomes) {
    if (typeof modulo[nome] === "function") {
      await modulo[nome]();
      return true;
    }
  }

  console.warn("Nenhuma função de carregamento encontrada neste módulo:", modulo);
  return false;
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

async function carregarTudo() {
  await recarregarAbaAtual();
}

window.app = {
  abrirAba,
  recarregarAbaAtual,
  carregarModuloDaAba,
  carregarTudo
};

window.carregarTudo = carregarTudo;