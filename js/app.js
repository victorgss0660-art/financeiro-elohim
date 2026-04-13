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

    // Inicializa módulos que precisam bindar elementos
    window.importarModule?.init?.();

    await this.navigate("dashboard");
  },

  bindMenu() {
    document.querySelectorAll(".menu-btn").forEach(btn => {
      if (btn.dataset.binded === "1") return;

      btn.addEventListener("click", async () => {
        const tab = btn.dataset.tab;
        if (!tab) return;
        await this.navigate(tab);
      });

      btn.dataset.binded = "1";
    });
  },

  bindAcoesGlobais() {
    const btnCarregarMes = document.getElementById("btnCarregarMes");
    if (btnCarregarMes && btnCarregarMes.dataset.binded !== "1") {
      btnCarregarMes.addEventListener("click", async () => {
        await this.onTabChange(this.currentTab);
      });
      btnCarregarMes.dataset.binded = "1";
    }

    const btnSair = document.getElementById("btnSair");
    if (btnSair && btnSair.dataset.binded !== "1") {
      btnSair.addEventListener("click", () => {
        try {
          localStorage.removeItem("elohim_user");
        } catch (_) {}
        location.reload();
      });
      btnSair.dataset.binded = "1";
    }

    const btnSalvarContaPagar = document.getElementById("btnSalvarContaPagar");
    if (btnSalvarContaPagar && btnSalvarContaPagar.dataset.binded !== "1") {
      btnSalvarContaPagar.addEventListener("click", async () => {
        await window.contasPagarModule?.salvarContaPagar?.();
      });
      btnSalvarContaPagar.dataset.binded = "1";
    }

    const btnImportarContasPagar = document.getElementById("btnImportarContasPagar");
    if (btnImportarContasPagar && btnImportarContasPagar.dataset.binded !== "1") {
      btnImportarContasPagar.addEventListener("click", () => {
        document.getElementById("fileInputContasPagar")?.click();
      });
      btnImportarContasPagar.dataset.binded = "1";
    }

    const fileInputContasPagar = document.getElementById("fileInputContasPagar");
    if (fileInputContasPagar && fileInputContasPagar.dataset.binded !== "1") {
      fileInputContasPagar.addEventListener("change", async event => {
        await window.contasPagarModule?.importarPlanilha?.(event);
      });
      fileInputContasPagar.dataset.binded = "1";
    }

    const btnExportarContasPagar = document.getElementById("btnExportarContasPagar");
    if (btnExportarContasPagar && btnExportarContasPagar.dataset.binded !== "1") {
      btnExportarContasPagar.addEventListener("click", () => {
        window.contasPagarModule?.exportarPlanilha?.();
      });
      btnExportarContasPagar.dataset.binded = "1";
    }

    const btnPagarSelecionadas = document.getElementById("btnPagarSelecionadas");
    if (btnPagarSelecionadas && btnPagarSelecionadas.dataset.binded !== "1") {
      btnPagarSelecionadas.addEventListener("click", () => {
        window.contasPagarModule?.abrirPopupPagamentoLote?.();
      });
      btnPagarSelecionadas.dataset.binded = "1";
    }

    const btnExportarContasPagas = document.getElementById("btnExportarContasPagas");
    if (btnExportarContasPagas && btnExportarContasPagas.dataset.binded !== "1") {
      btnExportarContasPagas.addEventListener("click", () => {
        window.contasPagasModule?.exportarPlanilha?.();
      });
      btnExportarContasPagas.dataset.binded = "1";
    }

    const btnSalvarContaReceber = document.getElementById("btnSalvarContaReceber");
    if (btnSalvarContaReceber && btnSalvarContaReceber.dataset.binded !== "1") {
      btnSalvarContaReceber.addEventListener("click", async () => {
        await window.contasReceberModule?.salvarContaReceber?.();
      });
      btnSalvarContaReceber.dataset.binded = "1";
    }

    const btnSalvarFaturamento = document.getElementById("btnSalvarFaturamento");
    if (btnSalvarFaturamento && btnSalvarFaturamento.dataset.binded !== "1") {
      btnSalvarFaturamento.addEventListener("click", async () => {
        await window.faturamentoModule?.salvarFaturamento?.();
      });
      btnSalvarFaturamento.dataset.binded = "1";
    }

    const btnSalvarMetas = document.getElementById("btnSalvarMetas");
    if (btnSalvarMetas && btnSalvarMetas.dataset.binded !== "1") {
      btnSalvarMetas.addEventListener("click", async () => {
        await window.metasModule?.salvarMetas?.();
      });
      btnSalvarMetas.dataset.binded = "1";
    }

    const btnSalvarSaldosBancarios = document.getElementById("btnSalvarSaldosBancarios");
    if (btnSalvarSaldosBancarios && btnSalvarSaldosBancarios.dataset.binded !== "1") {
      btnSalvarSaldosBancarios.addEventListener("click", async () => {
        await window.planejamentoModule?.salvarSaldosBancarios?.();
      });
      btnSalvarSaldosBancarios.dataset.binded = "1";
    }

    const btnConfirmarImportacao = document.getElementById("btnConfirmarImportacao");
    if (btnConfirmarImportacao && btnConfirmarImportacao.dataset.binded !== "1") {
      btnConfirmarImportacao.addEventListener("click", async () => {
        await window.importarModule?.confirmarImportacao?.();
      });
      btnConfirmarImportacao.dataset.binded = "1";
    }

    const btnCancelarImportacao = document.getElementById("btnCancelarImportacao");
    if (btnCancelarImportacao && btnCancelarImportacao.dataset.binded !== "1") {
      btnCancelarImportacao.addEventListener("click", () => {
        window.importarModule?.cancelarImportacao?.();
      });
      btnCancelarImportacao.dataset.binded = "1";
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
    const proxima = document.getElementById(`tab-${tabName}`);
    if (!proxima) return;

    this.currentTab = tabName;

    document.querySelectorAll(".menu-btn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.tab === tabName);
    });

    document.querySelectorAll(".tab-section").forEach(sec => {
      sec.classList.remove("active");
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
      "dre",
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
          window.importarModule?.init?.();
          break;

        case "resumo":
          await window.resumoModule?.carregarResumoAnual?.();
          break;

        case "dre":
          await window.dreModule?.carregarDRE?.();
          break;

        case "planejamento":
          await window.planejamentoModule?.carregarSaldosBancarios?.();
          await window.planejamentoModule?.carregarPlanejamento?.();
          break;

        default:
          break;
      }

      if (window.utils?.setAppMsg) {
        utils.setAppMsg("", "info");
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

    const statusMes = document.getElementById("statusMes");
    const statusAtualizacao = document.getElementById("statusAtualizacao");
    const statusSituacao = document.getElementById("statusSituacao");

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
  try {
    await window.app.init();
  } catch (e) {
    console.error("Erro ao iniciar aplicação:", e);
    if (window.utils?.setAppMsg) {
      utils.setAppMsg("Erro ao iniciar sistema: " + e.message, "err");
    }
  }
});
