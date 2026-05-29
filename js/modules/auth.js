window.authModule = {

  usuario: null,

  tempoLimiteSegundoPlano: 15 * 60 * 1000,

  saiuEm: null,

  iniciar() {

    try {

      this.limparSessaoSalva();

      this.configurarBloqueioSegundoPlano();

      this.mostrarLogin();

    } catch (erro) {

      console.error("Erro auth:", erro);

      this.mostrarLogin();

    }

  },

  limparSessaoSalva() {

    localStorage.removeItem("financeiro_user");

    sessionStorage.removeItem("financeiro_user");

  },

  mostrarLogin() {

    const login = document.getElementById("loginScreen");

    const app = document.getElementById("appSistema");

    if (login) login.style.display = "flex";

    if (app) app.style.display = "none";

    const senha = document.getElementById("loginSenha");

    if (senha) senha.value = "";

    setTimeout(() => {

      const email = document.getElementById("loginEmail");

      if (email) email.focus();

    }, 100);

  },

  abrirSistema() {

    const login = document.getElementById("loginScreen");

    const app = document.getElementById("appSistema");

    if (login) login.style.display = "none";

    if (app) app.style.display = "block";

    this.aplicarPermissoes();

    if (window.app?.iniciar) {

      window.app.iniciar();

    }

  },

  async login() {

    try {

      const email = document.getElementById("loginEmail")?.value?.trim()?.toLowerCase();

      const senha = document.getElementById("loginSenha")?.value?.trim();

      if (!email || !senha) {

        alert("Preencha e-mail e senha.");

        return;

      }

      const usuarios = await api.restGet("usuarios_permissoes", "select=*");

      const usuario = (usuarios || []).find(u =>

        String(u.email || "").trim().toLowerCase() === email &&

        String(u.senha || "").trim() === senha &&

        u.ativo === true

      );

      if (!usuario) {

        alert("Usuário ou senha inválidos.");

        return;

      }

      this.usuario = usuario;

      this.saiuEm = null;

      this.abrirSistema();

    } catch (erro) {

      console.error("Erro login:", erro);

      alert("Erro ao realizar login.");

    }

  },

  logout() {

    this.usuario = null;

    this.saiuEm = null;

    localStorage.removeItem("financeiro_user");

    localStorage.removeItem("abaAtualFinanceiro");

    sessionStorage.removeItem("financeiro_user");

    this.mostrarLogin();

  },

  bloquearPorInatividade() {

    if (!this.usuario) return;

    this.usuario = null;

    this.saiuEm = null;

    localStorage.removeItem("financeiro_user");

    sessionStorage.removeItem("financeiro_user");

    this.mostrarLogin();

  },

  configurarBloqueioSegundoPlano() {

    document.addEventListener("visibilitychange", () => {

      if (document.hidden) {

        this.saiuEm = Date.now();

        return;

      }

      if (!this.saiuEm) return;

      const tempoFora = Date.now() - this.saiuEm;

      if (tempoFora >= this.tempoLimiteSegundoPlano) {

        this.bloquearPorInatividade();

      }

      this.saiuEm = null;

    });

    window.addEventListener("blur", () => {

      if (this.usuario) {

        this.saiuEm = Date.now();

      }

    });

    window.addEventListener("focus", () => {

      if (!this.usuario || !this.saiuEm) return;

      const tempoFora = Date.now() - this.saiuEm;

      if (tempoFora >= this.tempoLimiteSegundoPlano) {

        this.bloquearPorInatividade();

      }

      this.saiuEm = null;

    });

  },

  aplicarPermissoes() {

    if (!this.usuario) return;

    const mapaPermissoes = {

      "dashboard": this.usuario.dashboard,

      "contas-pagar": this.usuario.contas_pagar,

      "contas-pagas": this.usuario.contas_pagas,

      "contas-receber": this.usuario.contas_receber,

      "planejamento": this.usuario.planejamento,

      "inserir-dados": this.usuario.inserir_dados

    };

    document

      .querySelectorAll(".menu button, .sidebar-nav .nav-btn")

      .forEach(botao => {

        const aba = botao.dataset.tab;

        if (mapaPermissoes[aba]) {

          botao.style.display = "flex";

        } else {

          botao.style.display = "none";

        }

      });

  },

  podeAcessar(aba) {

    if (!this.usuario) return false;

    const permissoes = {

      "dashboard": this.usuario.dashboard,

      "contas-pagar": this.usuario.contas_pagar,

      "contas-pagas": this.usuario.contas_pagas,

      "contas-receber": this.usuario.contas_receber,

      "planejamento": this.usuario.planejamento,

      "inserir-dados": this.usuario.inserir_dados

    };

    return !!permissoes[aba];

  }

};
