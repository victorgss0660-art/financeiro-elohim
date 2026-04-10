window.loading = window.loading || {
  show() {
    const el = document.getElementById("loadingGlobal");
    if (el) el.classList.remove("hidden");
  },
  hide() {
    const el = document.getElementById("loadingGlobal");
    if (el) el.classList.add("hidden");
  }
};

window.app = {
  currentTab: "dashboard",
  initialized: false,

  async init() {
    try {
      this.bindEventosGlobais();
      this.preencherAnoAtual();
      this.preencherMesAtual();

      await this.preencherPerfil();
      await this.carregarInicial();

      this.initialized = true;
    } catch (e) {
      console.error("Erro ao iniciar app:", e);
      window.utils?.setAppMsg?.("Erro ao iniciar sistema: " + e.message, "err");
    }
  },

  bindEventosGlobais() {
    const btnCarregar = document.getElementById("btnCarregarMes");
    if (btnCarregar && !btnCarregar.dataset.binded) {
      btnCarregar.addEventListener("click", async () => {
        await this.recarregarAbaAtual();
      });
      btnCarregar.dataset.binded = "1";
    }

    const btnSair = document.getElementById("btnSair");
    if (btnSair && !btnSair.dataset.binded) {
      btnSair.addEventListener("click", () => {
        this.logout();
      });
      btnSair.dataset.binded = "1";
    }

    window.addEventListener("resize", () => {
      this.ajustarLayoutMobile();
    });

    this.bindDelegacaoCliques();
    this.bindDelegacaoChange();
    this.bindDelegacaoInput();
  },

  bindDelegacaoCliques() {
    if (document.body.dataset.bindedClicks === "1") return;

    document.addEventListener("click", async (e) => {
      const target = e.target.closest("button");
      if (!target) return;

      try {
        if (target.id === "btnSalvarContaPagar") {
          e.preventDefault();
          await window.contasPagarModule?.salvarContaPagar?.();
          return;
        }

        if (target.id === "btnImportarContasPagar") {
          e.preventDefault();
          document.getElementById("fileInputContasPagar")?.click();
          return;
        }

        if (target.id === "btnExportarContasPagar") {
          e.preventDefault();
          window.contasPagarModule?.exportarPlanilha?.();
          return;
        }

        if (target.id === "btnPagarSelecionadas") {
          e.preventDefault();
          window.contasPagarModule?.abrirPopupPagamentoLote?.();
          return;
        }

        if (target.id === "btnImportarContasPagas") {
          e.preventDefault();
          document.getElementById("fileInputContasPagas")?.click();
          return;
        }

        if (target.id === "btnExportarContasPagas") {
          e.preventDefault();
          window.contasPagasModule?.exportarPlanilha?.();
          return;
        }

        if (target.id === "btnSalvarContaReceber") {
          e.preventDefault();
          await window.contasReceberModule?.salvarContaReceber?.();
          return;
        }

        if (target.id === "btnSalvarFaturamento") {
          e.preventDefault();
          await window.faturamentoModule?.salvarFaturamento?.();
          return;
        }

        if (target.id === "btnSalvarMetas") {
          e.preventDefault();
          await window.metasModule?.salvarMetas?.();
          return;
        }

        if (target.id === "btnSalvarSaldosBancarios") {
          e.preventDefault();
          await window.planejamentoModule?.salvarSaldosBancarios?.();
          return;
        }

        if (target.id === "closeChartFullscreen") {
          e.preventDefault();
          window.dashboardModule?.fecharGraficoFullscreen?.();
          return;
        }
      } catch (err) {
        console.error("Erro em clique delegado:", err);
        window.utils?.setAppMsg?.("Erro ao executar ação: " + err.message, "err");
      }
    });

    document.body.dataset.bindedClicks = "1";
  },

  bindDelegacaoChange() {
    if (document.body.dataset.bindedChanges === "1") return;

    document.addEventListener("change", async (e) => {
      const target = e.target;

      try {
        if (target.id === "fileInputContasPagar") {
          await window.contasPagarModule?.importarPlanilha?.({ target });
          return;
        }

        if (target.id === "fileInputContasPagas") {
          await window.contasPagasModule?.importarPlanilha?.({ target });
          return;
        }

        if (target.id === "fileInput") {
          await window.importarModule?.importarPlanilha?.({ target });
          return;
        }

        if (target.id === "filtroFornecedor") {
          window.contasPagarModule.filtros.fornecedor = target.value || "";
          window.contasPagarModule?.render?.();
          return;
        }

        if (target.id === "filtroCategoria") {
          window.contasPagarModule.filtros.categoria = target.value || "";
          window.contasPagarModule?.render?.();
          return;
        }

        if (target.id === "filtroStatus") {
          window.contasPagarModule.filtros.status = target.value || "";
          window.contasPagarModule?.render?.();
          return;
        }

        if (target.id === "filtroDocs") {
          window.contasPagarModule.filtros.docs = target.value || "";
          window.contasPagarModule?.render?.();
          return;
        }

        if (target.id === "filtroDataInicio") {
          window.contasPagarModule.filtros.dataInicio = target.value || "";
          window.contasPagarModule?.render?.();
          return;
        }

        if (target.id === "filtroDataFim") {
          window.contasPagarModule.filtros.dataFim = target.value || "";
          window.contasPagarModule?.render?.();
          return;
        }

        if (target.id === "cpSelecionarTodos") {
          document.querySelectorAll(".cp-select-item").forEach(cb => {
            cb.checked = !!target.checked;
          });
          window.contasPagarModule?.atualizarSelecionados?.();
          return;
        }

        if (target.classList?.contains("cp-select-item")) {
          window.contasPagarModule?.atualizarSelecionados?.();
        }
      } catch (err) {
        console.error("Erro em change delegado:", err);
        window.utils?.setAppMsg?.("Erro ao atualizar campo: " + err.message, "err");
      }
    });

    document.body.dataset.bindedChanges = "1";
  },

  bindDelegacaoInput() {
    if (document.body.dataset.bindedInputs === "1") return;

    document.addEventListener("input", (e) => {
      const target = e.target;

      try {
        if (target.id === "filtroBusca") {
          window.contasPagarModule.filtros.busca = String(target.value || "").toLowerCase();
          window.contasPagarModule?.render?.();
        }
      } catch (err) {
        console.error("Erro em input delegado:", err);
      }
    });

    document.body.dataset.bindedInputs = "1";
  },

  preencherAnoAtual() {
    const anoSelect = document.getElementById("anoSelect");
    if (!anoSelect) return;

    const anoAtual = new Date().getFullYear();
    const existe = Array.from(anoSelect.options).some(opt => Number(opt.value) === anoAtual);

    if (!existe) {
      const opt = document.createElement("option");
      opt.value = String(anoAtual);
      opt.textContent = String(anoAtual);
      anoSelect.appendChild(opt);
    }

    anoSelect.value = String(anoAtual);
  },

  preencherMesAtual() {
    const mesSelect = document.getElementById("mesSelect");
    if (!mesSelect) return;

    const indiceAtual = new Date().getMonth();
    if (mesSelect.options[indiceAtual]) {
      mesSelect.selectedIndex = indiceAtual;
    }
  },

  async preencherPerfil() {
    try {
      const userEmail = document.getElementById("userEmail");
      const salvo = localStorage.getItem("elohim_user");

      if (salvo) {
        const user = JSON.parse(salvo);
        if (userEmail) userEmail.textContent = user?.email || "Administrador";
        return;
      }

      if (userEmail) {
        userEmail.textContent = "Administrador";
      }
    } catch (e) {
      console.error("Erro ao preencher perfil:", e);
    }
  },

  async carregarInicial() {
    loading.show();

    try {
      this.ajustarLayoutMobile();
      this.marcarMenuAtivo(this.currentTab);
      this.ativarSomenteAba(this.currentTab);
      await this.onTabChange(this.currentTab);
      this.atualizarStatusCabecalho();
      this.atualizarSituacaoMes();
    } finally {
      loading.hide();
    }
  },

  async recarregarAbaAtual() {
    loading.show();

    try {
      await this.onTabChange(this.currentTab);
      this.atualizarStatusCabecalho();
      this.atualizarSituacaoMes();
    } catch (e) {
      console.error("Erro ao recarregar aba:", e);
      window.utils?.setAppMsg?.("Erro ao recarregar dados: " + e.message, "err");
    } finally {
      loading.hide();
    }
  },

navigate(tabName) {
  const secoes = document.querySelectorAll(".tab-section");
  const proxima = document.getElementById(`tab-${tabName}`);
  const atual = document.querySelector(".tab-section.active");

  if (!proxima) {
    console.warn(`Aba não encontrada: tab-${tabName}`);
    return;
  }

  this.currentTab = tabName;

  document.querySelectorAll(".menu-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === tabName);
  });

  this.controlarBlocoMesAno(tabName);

  if (atual) {
    atual.classList.remove("active", "leaving");
  }

  secoes.forEach(sec => {
    sec.classList.remove("active", "leaving");
    sec.style.display = "none";
  });

  proxima.style.display = "block";
  proxima.classList.add("active");

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

  this.onTabChange(tabName);
}

  marcarMenuAtivo(tabName) {
    document.querySelectorAll(".menu-btn").forEach(btn => {
      const isActive = btn.dataset.tab === tabName;
      btn.classList.toggle("active", isActive);
    });

    document.querySelectorAll(".sidebar nav button").forEach(btn => {
      const texto = (btn.textContent || "").trim().toLowerCase();
      const mapa = {
        "dashboard": "dashboard",
        "contas a pagar": "contas-pagar",
        "contas pagas": "contas-pagas",
        "contas a receber": "contas-receber",
        "contas recebidas": "contas-recebidas",
        "faturamento": "faturamento",
        "metas": "metas",
        "importar": "importar",
        "resumo": "resumo",
        "planejamento": "planejamento"
      };

      const alvo = mapa[texto];
      btn.classList.toggle("active", alvo === tabName);
    });
  },

  ativarSomenteAba(tabName) {
    document.querySelectorAll(".tab-section").forEach(sec => {
      sec.classList.remove("active", "leaving");
    });

    const alvo = document.getElementById(`tab-${tabName}`);
    if (alvo) alvo.classList.add("active");

    this.controlarBlocoMesAno(tabName);
  },

  controlarBlocoMesAno(tabName) {
    const bloco = document.getElementById("blocoFiltroMesAno");
    if (!bloco) return;

    const abasComFiltro = [
      "dashboard",
      "importar",
      "faturamento",
      "metas",
      "resumo",
      "planejamento"
    ];

    bloco.style.display = abasComFiltro.includes(tabName) ? "" : "none";
  },

  async onTabChange(tabName) {
    loading.show();

    try {
if (tabName === "dashboard") {
  await window.faturamentoModule?.carregarFaturamento?.();
  await window.metasModule?.carregarMetas?.();
  await window.dashboardModule?.carregarDashboard?.();
  return;
}

if (tabName === "planejamento") {
  await window.planejamentoModule?.carregarSaldosBancarios?.();
  await window.planejamentoModule?.carregarPlanejamento?.();
  return;
}
      }

      if (tabName === "contas-pagar") {
        await window.contasPagarModule?.carregarContasPagar?.();
        return;
      }

      if (tabName === "contas-pagas") {
        await window.contasPagasModule?.carregarContasPagas?.();
        return;
      }

      if (tabName === "contas-receber") {
        await window.contasReceberModule?.carregarContasReceber?.();
        return;
      }

      if (tabName === "contas-recebidas") {
        await window.contasRecebidasModule?.carregarContasRecebidas?.();
        return;
      }

      if (tabName === "faturamento") {
        await window.faturamentoModule?.carregarFaturamento?.();
        return;
      }

      if (tabName === "metas") {
        await window.metasModule?.carregarMetas?.();
        return;
      }

      if (tabName === "importar") {
        await window.importarModule?.init?.();
        return;
      }

      if (tabName === "resumo") {
        await window.resumoModule?.carregarResumoAnual?.();
        return;
      }

      if (tabName === "planejamento") {
        await window.planejamentoModule?.carregarSaldosBancarios?.();
        await window.planejamentoModule?.carregarPlanejamento?.();
      }
    } catch (e) {
      console.error("Erro ao trocar aba:", e);
      window.utils?.setAppMsg?.("Erro ao carregar aba: " + e.message, "err");
    } finally {
      loading.hide();
    }
  },

  atualizarStatusCabecalho() {
    try {
      const mesSelect = document.getElementById("mesSelect");
      const anoSelect = document.getElementById("anoSelect");

      const mes = mesSelect?.value || "-";
      const ano = anoSelect?.value || "-";
      const agora = new Date();

      const statusMes = document.getElementById("statusMes");
      const statusMesTopo = document.getElementById("statusMesTopo");
      const statusAtualizacao = document.getElementById("statusAtualizacao");
      const statusAtualizacaoTopo = document.getElementById("statusAtualizacaoTopo");

      const hora = agora.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit"
      });

      if (statusMes) statusMes.textContent = `${mes}/${ano}`;
      if (statusMesTopo) statusMesTopo.textContent = `${mes}/${ano}`;
      if (statusAtualizacao) statusAtualizacao.textContent = hora;
      if (statusAtualizacaoTopo) statusAtualizacaoTopo.textContent = hora;
    } catch (e) {
      console.error("Erro ao atualizar cabeçalho:", e);
    }
  },

  atualizarSituacaoMes() {
    try {
      const statusSituacao = document.getElementById("statusSituacao");
      const saldoEl = document.getElementById("saldo");
      if (!statusSituacao || !saldoEl) return;

      const textoSaldo = String(saldoEl.textContent || "0")
        .replace(/[R$\s.]/g, "")
        .replace(",", ".");
      const saldo = Number(textoSaldo || 0);

      statusSituacao.classList.remove("ok", "err");

      if (Number.isNaN(saldo)) {
        statusSituacao.textContent = "-";
      } else if (saldo < 0) {
        statusSituacao.textContent = "Crítico";
        statusSituacao.classList.add("err");
      } else if (saldo === 0) {
        statusSituacao.textContent = "Neutro";
      } else {
        statusSituacao.textContent = "Saudável";
        statusSituacao.classList.add("ok");
      }
    } catch (e) {
      console.error("Erro ao atualizar situação:", e);
    }
  },

  ajustarLayoutMobile() {
    document.body.classList.toggle("mobile-layout", window.innerWidth <= 900);
  },

  logout() {
    try {
      localStorage.removeItem("elohim_user");
      location.reload();
    } catch (e) {
      console.error("Erro ao sair:", e);
    }
  }
};

document.addEventListener("DOMContentLoaded", async () => {
  await window.app.init();
});
