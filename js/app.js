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
  async init() {
    try {
      this.bindEventosGlobais();
      this.bindLogin();

      if (window.navigation?.ativarAbas) {
        window.navigation.ativarAbas();
      }

      const user = await this.verificarSessao();

      if (user) {
        await this.entrarNoSistema(user);
      } else {
        this.mostrarLogin();
      }
    } catch (e) {
      console.error("Erro ao iniciar app:", e);
      window.utils?.setAppMsg?.("Erro ao iniciar sistema: " + e.message, "err");
    }
  },

  bindEventosGlobais() {
    this.bindMesAno();
    this.bindLogout();
    this.bindMenuAbas();
    this.bindDelegacaoCliques();
    this.bindDelegacaoInput();
    this.bindDelegacaoChange();
  },

  bindMesAno() {
    const btnCarregarMes = document.getElementById("btnCarregarMes");
    if (btnCarregarMes && btnCarregarMes.dataset.binded !== "1") {
      btnCarregarMes.addEventListener("click", async () => {
        await this.recarregarTudo();
      });
      btnCarregarMes.dataset.binded = "1";
    }
  },

  bindLogout() {
    const btnSair = document.getElementById("btnSair");
    if (btnSair && btnSair.dataset.binded !== "1") {
      btnSair.addEventListener("click", async () => {
        await this.sairDoSistema();
      });
      btnSair.dataset.binded = "1";
    }
  },

  bindMenuAbas() {
    document.querySelectorAll(".menu-btn").forEach(btn => {
      if (btn.dataset.bindedMenu === "1") return;

      btn.addEventListener("click", async () => {
        const aba = btn.dataset.tab || "";
        await this.onTrocaDeAba(aba);
      });

      btn.dataset.bindedMenu = "1";
    });
  },

  bindDelegacaoCliques() {
    if (document.body.dataset.bindedDelegacaoClick === "1") return;

    document.addEventListener("click", async (e) => {
      const target = e.target.closest("button, .doc-btn, .small-btn");
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

        if (
          typeof target.getAttribute("onclick") === "string" &&
          target.getAttribute("onclick").includes("contasPagarModule.confirmarPagamento()")
        ) {
          e.preventDefault();
          await window.contasPagarModule?.confirmarPagamento?.();
          return;
        }

        if (
          typeof target.getAttribute("onclick") === "string" &&
          target.getAttribute("onclick").includes("contasPagarModule.fecharPopup()")
        ) {
          e.preventDefault();
          window.contasPagarModule?.fecharPopup?.();
          return;
        }

        if (
          typeof target.getAttribute("onclick") === "string" &&
          target.getAttribute("onclick").includes("contasPagarModule.confirmarPagamentoLote()")
        ) {
          e.preventDefault();
          await window.contasPagarModule?.confirmarPagamentoLote?.();
          return;
        }

        if (
          typeof target.getAttribute("onclick") === "string" &&
          target.getAttribute("onclick").includes("contasPagarModule.fecharPopupLote()")
        ) {
          e.preventDefault();
          window.contasPagarModule?.fecharPopupLote?.();
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

    document.body.dataset.bindedDelegacaoClick = "1";
  },

  bindDelegacaoInput() {
    if (document.body.dataset.bindedDelegacaoInput === "1") return;

    document.addEventListener("input", (e) => {
      const target = e.target;

      try {
        if (target.id === "filtroBusca") {
          window.contasPagarModule.filtros.busca = String(target.value || "").toLowerCase();
          window.contasPagarModule?.render?.();
          return;
        }
      } catch (err) {
        console.error("Erro em input delegado:", err);
        window.utils?.setAppMsg?.("Erro ao filtrar: " + err.message, "err");
      }
    });

    document.body.dataset.bindedDelegacaoInput = "1";
  },

  bindDelegacaoChange() {
    if (document.body.dataset.bindedDelegacaoChange === "1") return;

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
          return;
        }
      } catch (err) {
        console.error("Erro em change delegado:", err);
        window.utils?.setAppMsg?.("Erro ao atualizar campo: " + err.message, "err");
      }
    });

    document.body.dataset.bindedDelegacaoChange = "1";
  },

  bindLogin() {
    const btnLogin = document.getElementById("loginBtn");
    const emailInput = document.getElementById("loginEmail");
    const senhaInput = document.getElementById("loginSenha");

    if (btnLogin && btnLogin.dataset.binded !== "1") {
      btnLogin.addEventListener("click", async () => {
        await this.fazerLogin();
      });
      btnLogin.dataset.binded = "1";
    }

    [emailInput, senhaInput].forEach(input => {
      if (!input || input.dataset.bindedEnter === "1") return;

      input.addEventListener("keydown", async (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          await this.fazerLogin();
        }
      });

      input.dataset.bindedEnter = "1";
    });
  },

  async verificarSessao() {
    try {
      if (window.auth?.getCurrentUser) {
        const user = await window.auth.getCurrentUser();
        if (user) return user;
      }

      const salvo = localStorage.getItem("elohim_user");
      if (salvo) return JSON.parse(salvo);

      return null;
    } catch (e) {
      console.error("Erro ao verificar sessão:", e);
      return null;
    }
  },

  async fazerLogin() {
    const email = document.getElementById("loginEmail")?.value?.trim() || "";
    const senha = document.getElementById("loginSenha")?.value || "";
    const loginMsg = document.getElementById("loginMsg");

    if (!email || !senha) {
      if (loginMsg) loginMsg.textContent = "Informe e-mail e senha.";
      return;
    }

    loading.show();

    try {
      let user = null;

      if (window.auth?.login) {
        user = await window.auth.login(email, senha);
      } else if (window.auth?.signIn) {
        user = await window.auth.signIn(email, senha);
      } else {
        user = { email, perfil: "Administrador" };
      }

      if (!user) throw new Error("Login não retornou usuário.");

      localStorage.setItem("elohim_user", JSON.stringify(user));

      if (loginMsg) loginMsg.textContent = "Login realizado com sucesso.";
      await this.entrarNoSistema(user);
    } catch (e) {
      console.error("Erro no login:", e);
      if (loginMsg) loginMsg.textContent = "Erro ao entrar: " + e.message;
    } finally {
      loading.hide();
    }
  },

  async sairDoSistema() {
    try {
      loading.show();

      if (window.auth?.logout) {
        await window.auth.logout();
      }

      localStorage.removeItem("elohim_user");
      this.mostrarLogin();
    } catch (e) {
      console.error("Erro ao sair:", e);
    } finally {
      loading.hide();
    }
  },

  mostrarLogin() {
    const loginScreen = document.getElementById("loginScreen");
    const appShell = document.getElementById("appShell");

    if (loginScreen) loginScreen.classList.remove("hidden");
    if (appShell) appShell.classList.add("hidden");
  },

  async entrarNoSistema(user) {
    const loginScreen = document.getElementById("loginScreen");
    const appShell = document.getElementById("appShell");

    if (loginScreen) loginScreen.classList.add("hidden");
    if (appShell) appShell.classList.remove("hidden");

    await this.preencherPerfil(user);
    await this.recarregarTudo();
  },

  async preencherPerfil(userRecebido = null) {
    try {
      let user = userRecebido;

      if (!user && window.auth?.getCurrentUser) {
        user = await window.auth.getCurrentUser();
      }

      if (!user) {
        const salvo = localStorage.getItem("elohim_user");
        if (salvo) user = JSON.parse(salvo);
      }

      const userEmail = document.getElementById("userEmail");
      const userPerfil = document.getElementById("userPerfil");
      const perfilBadge = document.getElementById("perfilBadge");

      if (userEmail) userEmail.textContent = user?.email || "-";
      if (userPerfil) userPerfil.textContent = (user?.perfil || user?.role || "ADMIN").toUpperCase();
      if (perfilBadge) perfilBadge.textContent = user?.perfil || user?.role || "Administrador";
    } catch (e) {
      console.error("Erro ao preencher perfil:", e);
    }
  },

  atualizarStatusCabecalho() {
    try {
      const { mes, ano } = window.utils.getMesAno();
      const texto = `${mes}/${ano}`;
      const agora = new Date();

      const statusMes = document.getElementById("statusMes");
      const statusMesTopo = document.getElementById("statusMesTopo");
      const statusAtualizacao = document.getElementById("statusAtualizacao");
      const statusAtualizacaoTopo = document.getElementById("statusAtualizacaoTopo");

      const hora = agora.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit"
      });

      if (statusMes) statusMes.textContent = texto;
      if (statusMesTopo) statusMesTopo.textContent = texto;
      if (statusAtualizacao) statusAtualizacao.textContent = hora;
      if (statusAtualizacaoTopo) statusAtualizacaoTopo.textContent = hora;
    } catch (e) {
      console.error("Erro ao atualizar status:", e);
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
      console.error("Erro ao atualizar situação do mês:", e);
    }
  },

  async safeRun(nome, fn) {
    try {
      await fn();
    } catch (e) {
      console.error(`Erro no módulo ${nome}:`, e);
    }
  },

  async recarregarTudo() {
    loading.show();

    try {
      this.atualizarStatusCabecalho();

      await this.safeRun("faturamento", async () => {
        await window.faturamentoModule?.carregarFaturamento?.();
      });

      await this.safeRun("metas", async () => {
        await window.metasModule?.carregarMetas?.();
      });

      await this.safeRun("dashboard", async () => {
        await window.dashboardModule?.carregarDashboard?.();
      });

      await this.safeRun("resumo", async () => {
        await window.resumoModule?.carregarResumoAnual?.();
      });

      await this.safeRun("contasPagar", async () => {
        await window.contasPagarModule?.carregarContasPagar?.();
      });

      await this.safeRun("contasPagas", async () => {
        await window.contasPagasModule?.carregarContasPagas?.();
      });

      await this.safeRun("contasReceber", async () => {
        await window.contasReceberModule?.carregarContasReceber?.();
      });

      await this.safeRun("contasRecebidas", async () => {
        await window.contasRecebidasModule?.carregarContasRecebidas?.();
      });

      await this.safeRun("importar", async () => {
        await window.importarModule?.init?.();
      });

      await this.safeRun("planejamento", async () => {
        await window.planejamentoModule?.carregarSaldosBancarios?.();
        await window.planejamentoModule?.carregarPlanejamento?.();
      });

      this.atualizarSituacaoMes();
    } finally {
      loading.hide();
    }
  },

  async onTrocaDeAba(aba) {
    try {
      if (window.navigation?.atualizarVisibilidadeFiltroMesAno) {
        window.navigation.atualizarVisibilidadeFiltroMesAno(aba);
      }

      if (aba === "dashboard") {
        await this.safeRun("dashboard", async () => {
          await window.dashboardModule?.carregarDashboard?.();
        });
        return;
      }

      if (aba === "contas-pagar") {
        await this.safeRun("contasPagar", async () => {
          await window.contasPagarModule?.carregarContasPagar?.();
        });
        return;
      }

      if (aba === "contas-pagas") {
        await this.safeRun("contasPagas", async () => {
          await window.contasPagasModule?.carregarContasPagas?.();
        });
        return;
      }

      if (aba === "contas-receber") {
        await this.safeRun("contasReceber", async () => {
          await window.contasReceberModule?.carregarContasReceber?.();
        });
        return;
      }

      if (aba === "contas-recebidas") {
        await this.safeRun("contasRecebidas", async () => {
          await window.contasRecebidasModule?.carregarContasRecebidas?.();
        });
        return;
      }

      if (aba === "faturamento") {
        await this.safeRun("faturamento", async () => {
          await window.faturamentoModule?.carregarFaturamento?.();
        });
        return;
      }

      if (aba === "metas") {
        await this.safeRun("metas", async () => {
          await window.metasModule?.carregarMetas?.();
        });
        return;
      }

      if (aba === "importar") {
        await this.safeRun("importar", async () => {
          await window.importarModule?.init?.();
        });
        return;
      }

      if (aba === "resumo") {
        await this.safeRun("resumo", async () => {
          await window.resumoModule?.carregarResumoAnual?.();
        });
        return;
      }

      if (aba === "planejamento") {
        await this.safeRun("planejamento", async () => {
          await window.planejamentoModule?.carregarSaldosBancarios?.();
          await window.planejamentoModule?.carregarPlanejamento?.();
        });
      }
    } catch (e) {
      console.error(`Erro ao abrir aba ${aba}:`, e);
    }
  }
};

document.addEventListener("DOMContentLoaded", async () => {
  await window.app.init();
});

window.addEventListener("load", () => {
  const splash = document.getElementById("splashScreen");
  if (!splash) return;

  setTimeout(() => {
    splash.classList.add("hide");
  }, 1800);

  setTimeout(() => {
    splash.remove();
  }, 2500);
});
