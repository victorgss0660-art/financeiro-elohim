window.authModule = {

  usuario: null,

  iniciar() {

    try {

      const usuarioSalvo =
        localStorage.getItem("financeiro_user");

      if (usuarioSalvo) {

        this.usuario = JSON.parse(usuarioSalvo);

        this.abrirSistema();

      } else {

        this.mostrarLogin();
      }

    } catch (erro) {

      console.error("Erro auth:", erro);

      this.mostrarLogin();
    }
  },

  mostrarLogin() {

    const login =
      document.getElementById("loginScreen");

    const app =
      document.getElementById("appSistema");

    if (login) login.style.display = "flex";
    if (app) app.style.display = "none";
  },

  abrirSistema() {

    const login =
      document.getElementById("loginScreen");

    const app =
      document.getElementById("appSistema");

    if (login) login.style.display = "none";
    if (app) app.style.display = "block";

    this.aplicarPermissoes();

    if (window.app?.iniciar) {
      window.app.iniciar();
    }
  },

  async login() {

    try {

      const email =
        document.getElementById("loginEmail")
        ?.value
        ?.trim()
        ?.toLowerCase();

      const senha =
        document.getElementById("loginSenha")
        ?.value
        ?.trim();

      if (!email || !senha) {

        alert("Preencha e-mail e senha.");

        return;
      }

      const usuarios =
        await api.restGet(
          "usuarios_permissoes",
          "select=*"
        );

      const usuario =
        usuarios.find(u =>
          String(u.email || "")
            .trim()
            .toLowerCase() === email
          &&
          String(u.senha || "")
            .trim() === senha
        );

      if (!usuario) {

        alert("Usuário ou senha inválidos.");

        return;
      }

      this.usuario = usuario;

      localStorage.setItem(
        "financeiro_user",
        JSON.stringify(usuario)
      );

      this.abrirSistema();

    } catch (erro) {

      console.error("Erro login:", erro);

      alert("Erro ao realizar login.");
    }
  },

  logout() {

    localStorage.removeItem("financeiro_user");

    location.reload();
  },

aplicarPermissoes(usuario) {

  const mapaPermissoes = {
    "dashboard": usuario.dashboard,
    "contas-pagar": usuario.contas_pagar,
    "contas-pagas": usuario.contas_pagas,
    "contas-receber": usuario.contas_receber,
    "planejamento": usuario.planejamento,
    "inserir-dados": usuario.inserir_dados
  };

  document
    .querySelectorAll(".menu button")
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
},
