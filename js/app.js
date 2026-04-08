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
      window.navigation?.ativarAbas?.();

      const logado = await this.verificarSessao();
      if (logado) {
        await this.entrarNoSistema(logado);
      } else {
        this.mostrarLogin();
      }
    } catch (e) {
      console.error("Erro ao iniciar app:", e);
      utils?.setAppMsg?.("Erro ao iniciar sistema: " + e.message, "err");
    }
  },

  bindEventosGlobais() {
    const btnCarregarMes = document.getElementById("btnCarregarMes");
    if (btnCarregarMes && !btnCarregarMes.dataset.binded) {
      btnCarregarMes.addEventListener("click", async () => {
        await this.recarregarTudo();
      });
      btnCarregarMes.dataset.binded = "1";
    }

    const btnSair = document.getElementById("btnSair");
    if (btnSair && !btnSair.dataset.binded) {
      btnSair.addEventListener("click", async () => {
        await this.sairDoSistema();
      });
      btnSair.dataset.binded = "1";
    }

    const btnSalvarFaturamento = document.getElementById("btnSalvarFaturamento");
    if (btnSalvarFaturamento && !btnSalvarFaturamento.dataset.binded) {
      btnSalvarFaturamento.addEventListener("click", async () => {
        await window.faturamentoModule?.salvarFaturamento?.();
      });
      btnSalvarFaturamento.dataset.binded = "1";
    }

    const btnSalvarMetas = document.getElementById("btnSalvarMetas");
    if (btnSalvarMetas && !btnSalvarMetas.dataset.binded) {
      btnSalvarMetas.addEventListener("click", async () => {
        await window.metasModule?.salvarMetas?.();
      });
      btnSalvarMetas.dataset.binded = "1";
    }

    document.querySelectorAll(".menu-btn").forEach(btn => {
      if (btn.dataset.bindedReload === "1") return;

      btn.addEventListener("click", async () => {
        const aba = btn.dataset.tab || "";
        await this.onTrocaDeAba(aba);
      });

      btn.dataset.bindedReload = "1";
    });
  },

  bindLogin() {
    const btnLogin = document.getElementById("loginBtn");
    const emailInput = document.getElementById("loginEmail");
    const senhaInput = document.getElementById("loginSenha");

    if (btnLogin && !btnLogin.dataset.binded) {
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
        user = {
          email,
          perfil: "Administrador"
        };
      }

      if (!user) {
        throw new Error("Login não retornou usuário.");
      }

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
      const { mes, ano } = utils.getMesAno();
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

  async recarregarTudo() {
    loading.show();

    try {
      this.atualizarStatusCabecalho();

      if (window.faturamentoModule?.carregarFaturamento) {
        await window.faturamentoModule.carregarFaturamento();
      }

      if (window.metasModule?.carregarMetas) {
        await window.metasModule.carregarMetas();
      }

      if (window.dashboardModule?.carregarDashboard) {
        await window.dashboardModule.carregarDashboard();
      }

      if (window.resumoModule?.carregarResumoAnual) {
        await window.resumoModule.carregarResumoAnual();
      }

      if (window.contasPagarModule?.init) {
        await window.contasPagarModule.init();
      } else if (window.contasPagarModule?.carregar) {
        await window.contasPagarModule.carregar();
      } else if (window.contasPagarModule?.render) {
        await window.contasPagarModule.render();
      }

      if (window.contasPagasModule?.init) {
        await window.contasPagasModule.init();
      } else if (window.contasPagasModule?.carregar) {
        await window.contasPagasModule.carregar();
      }

      if (window.contasReceberModule?.init) {
        await window.contasReceberModule.init();
      } else if (window.contasReceberModule?.carregar) {
        await window.contasReceberModule.carregar();
      }

      if (window.contasRecebidasModule?.init) {
        await window.contasRecebidasModule.init();
      } else if (window.contasRecebidasModule?.carregar) {
        await window.contasRecebidasModule.carregar();
      }

      if (window.importarModule?.init) {
        await window.importarModule.init();
      }

      if (window.planejamentoModule?.init) {
        await window.planejamentoModule.init();
      } else {
        await window.planejamentoModule?.carregarSaldosBancarios?.();
        await window.planejamentoModule?.carregarPlanejamento?.();
      }

      this.atualizarSituacaoMes();
    } catch (e) {
      console.error("Erro ao recarregar sistema:", e);
      utils?.setAppMsg?.("Erro ao recarregar dados: " + e.message, "err");
    } finally {
      loading.hide();
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

      if (Number.isNaN(saldo)) {
        statusSituacao.textContent = "-";
        return;
      }

      statusSituacao.classList.remove("ok", "err");

      if (saldo < 0) {
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

  async onTrocaDeAba(aba) {
    try {
      if (window.navigation?.atualizarVisibilidadeFiltroMesAno) {
        navigation.atualizarVisibilidadeFiltroMesAno(aba);
      }

      if (aba === "dashboard") {
        await window.dashboardModule?.carregarDashboard?.();
        return;
      }

      if (aba === "contas-pagar") {
        if (window.contasPagarModule?.carregar) {
          await window.contasPagarModule.carregar();
        } else {
          await window.contasPagarModule?.render?.();
        }
        return;
      }

      if (aba === "contas-pagas") {
        await window.contasPagasModule?.carregar?.();
        return;
      }

      if (aba === "contas-receber") {
        await window.contasReceberModule?.carregar?.();
        return;
      }

      if (aba === "contas-recebidas") {
        await window.contasRecebidasModule?.carregar?.();
        return;
      }

      if (aba === "faturamento") {
        await window.faturamentoModule?.carregarFaturamento?.();
        return;
      }

      if (aba === "metas") {
        await window.metasModule?.carregarMetas?.();
        return;
      }

      if (aba === "importar") {
        await window.importarModule?.init?.();
        return;
      }

      if (aba === "resumo") {
        await window.resumoModule?.carregarResumoAnual?.();
        return;
      }

      if (aba === "planejamento") {
        await window.planejamentoModule?.carregarSaldosBancarios?.();
        await window.planejamentoModule?.carregarPlanejamento?.();
      }
    } catch (e) {
      console.error(`Erro ao abrir aba ${aba}:`, e);
    }
  }
};

document.addEventListener("DOMContentLoaded", async () => {
  await window.app.init();
});
