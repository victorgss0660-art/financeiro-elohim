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

  async init() {
    this.bindMenu();
    this.bindAcoesGlobais();
    this.preencherAnoAtual();
    this.preencherMesAtual();
    this.preencherUsuario();
    this.controlarBlocoMesAno("dashboard");
    await this.navigate("dashboard");
  },

  bindMenu() {
    document.querySelectorAll(".menu-btn").forEach(btn => {
      if (btn.dataset.binded) return;

      btn.addEventListener("click", async () => {
        const tab = btn.dataset.tab;
        if (!tab) return;
        await this.navigate(tab);
      });

      btn.dataset.binded = "1";
    });
  },

  bindAcoesGlobais() {
    const btnCarregar = document.getElementById("btnCarregarMes");
    if (btnCarregar && !btnCarregar.dataset.binded) {
      btnCarregar.addEventListener("click", async () => {
        await this.onTabChange(this.currentTab);
      });
      btnCarregar.dataset.binded = "1";
    }

    const btnSair = document.getElementById("btnSair");
    if (btnSair && !btnSair.dataset.binded) {
      btnSair.addEventListener("click", () => {
        try {
          localStorage.removeItem("elohim_user");
        } catch (_) {}
        location.reload();
      });
      btnSair.dataset.binded = "1";
    }

    const btnSalvarContaPagar = document.getElementById("btnSalvarContaPagar");
    if (btnSalvarContaPagar && !btnSalvarContaPagar.dataset.binded) {
      btnSalvarContaPagar.addEventListener("click", async () => {
        await window.contasPagarModule?.salvarContaPagar?.();
      });
      btnSalvarContaPagar.dataset.binded = "1";
    }

    const btnImportarContasPagar = document.getElementById("btnImportarContasPagar");
    if (btnImportarContasPagar && !btnImportarContasPagar.dataset.binded) {
      btnImportarContasPagar.addEventListener("click", () => {
        document.getElementById("fileInputContasPagar")?.click();
      });
      btnImportarContasPagar.dataset.binded = "1";
    }

    const fileInputContasPagar = document.getElementById("fileInputContasPagar");
    if (fileInputContasPagar && !fileInputContasPagar.dataset.binded) {
      fileInputContasPagar.addEventListener("change", async event => {
        await window.contasPagarModule?.importarPlanilha?.(event);
      });
      fileInputContasPagar.dataset.binded = "1";
    }

    const btnExportarContasPagar = document.getElementById("btnExportarContasPagar");
    if (btnExportarContasPagar && !btnExportarContasPagar.dataset.binded) {
      btnExportarContasPagar.addEventListener("click", () => {
        window.contasPagarModule?.exportarPlanilha?.();
      });
      btnExportarContasPagar.dataset.binded = "1";
    }

    const btnPagarSelecionadas = document.getElementById("btnPagarSelecionadas");
    if (btnPagarSelecionadas && !btnPagarSelecionadas.dataset.binded) {
      btnPagarSelecionadas.addEventListener("click", () => {
        window.contasPagarModule?.abrirPopupPagamentoLote?.();
      });
      btnPagarSelecionadas.dataset.binded = "1";
    }
  },

  preencherAnoAtual() {
    const anoSelect = document.getElementById("anoSelect");
    if (!anoSelect) return;

    const anoAtual = String(new Date().getFullYear());
    const existe = Array.from(anoSelect.options).some(opt => opt.value === anoAtual);

    if (!existe) {
      const opt = document.createElement("option");
      opt.value = anoAtual;
      opt.textContent = anoAtual;
      anoSelect.appendChild(opt);
    }

    anoSelect.value = anoAtual;
  },

  preencherMesAtual() {
    const mesSelect = document.getElementById("mesSelect");
    if (!mesSelect) return;
    mesSelect.selectedIndex = new Date().getMonth();
  },

  preencherUsuario() {
    const userEmail = document.getElementById("userEmail");
    if (!userEmail) return;

    try {
      const salvo = localStorage.getItem("elohim_user");
      if (!salvo) {
        userEmail.textContent = "Administrador";
        return;
      }

      const user = JSON.parse(salvo);
      userEmail.textContent = user?.email || "Administrador";
    } catch (_) {
      userEmail.textContent = "Administrador";
    }
  },

  async navigate(tabName) {
    const secoes = document.querySelectorAll(".tab-section");
    const proxima = document.getElementById(`tab-${tabName}`);
    if (!proxima) return;

    this.currentTab = tabName;

    document.querySelectorAll(".menu-btn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.tab === tabName);
    });

    secoes.forEach(sec => {
      sec.classList.remove("active", "leaving");
      sec.style.display = "none";
    });

    proxima.style.display = "block";
    proxima.classList.add("active");

    this.controlarBlocoMesAno(tabName);

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });

    await this.onTabChange(tabName);
  },

  controlarBlocoMesAno(tabName) {
    const bloco = document.getElementById("blocoFiltroMesAno");
    if (!bloco) return;

    const abasComFiltro = [
      "dashboard",
      "faturamento",
      "metas",
      "importar",
      "resumo",
      "planejamento"
    ];

    bloco.style.display = abasComFiltro.includes(tabName) ? "" : "none";
  },

  async onTabChange(tabName) {
    loading.show();

    try {
      switch (tabName) {
        case "dashboard":
          await window.faturamentoModule?.carregarFaturamento?.();
          await window.metasModule?.carregarMetas?.();
          await window.dashboardModule?.carregarDashboard?.();
          this.atualizarCabecalhoDashboard();
          break;

        case "contas-pagar":
          await window.contasPagarModule?.carregarContasPagar?.();
          break;

        case "contas-pagas":
          await window.contasPagasModule?.carregarContasPagas?.();
          break;

        case "contas-receber":
          await window.contasReceberModule?.carregarContasReceber?.();
          break;

        case "contas-recebidas":
          await window.contasRecebidasModule?.carregarContasRecebidas?.();
          break;

        case "faturamento":
          await window.faturamentoModule?.carregarFaturamento?.();
          break;

        case "metas":
          await window.metasModule?.carregarMetas?.();
          break;

        case "importar":
          break;

        case "resumo":
          await window.resumoModule?.carregarResumoAnual?.();
          break;

        case "planejamento":
          await window.planejamentoModule?.carregarSaldosBancarios?.();
          await window.planejamentoModule?.carregarPlanejamento?.();
          break;

        default:
          break;
      }
    } catch (e) {
      console.error(`Erro ao carregar aba ${tabName}:`, e);
      if (window.utils?.setAppMsg) {
        utils.setAppMsg(`Erro ao carregar ${tabName}: ${e.message}`, "err");
      }
    } finally {
      loading.hide();
    }
  },

  atualizarCabecalhoDashboard() {
    const mes = document.getElementById("mesSelect")?.value || "-";
    const ano = document.getElementById("anoSelect")?.value || "-";
    const hora = new Date().toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit"
    });

    const statusMesTopo = document.getElementById("statusMesTopo");
    const statusMes = document.getElementById("statusMes");
    const statusAtualizacao = document.getElementById("statusAtualizacao");
    const statusSituacao = document.getElementById("statusSituacao");

    if (statusMesTopo) statusMesTopo.textContent = `${mes}/${ano}`;
    if (statusMes) statusMes.textContent = `${mes}/${ano}`;
    if (statusAtualizacao) statusAtualizacao.textContent = hora;

    const saldoTexto = String(document.getElementById("saldo")?.textContent || "0")
      .replace(/[R$\s.]/g, "")
      .replace(",", ".");
    const saldo = Number(saldoTexto || 0);

    if (statusSituacao) {
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
    }
  }
};

document.addEventListener("DOMContentLoaded", async () => {
  await window.app.init();
});
document.getElementById("btnImportarContasPagas")?.addEventListener("click", () => {
  document.getElementById("fileInputContasPagas").click();
});

document.getElementById("btnExportarContasPagas")?.addEventListener("click", () => {
  contasPagasModule.exportarPlanilha();
});
