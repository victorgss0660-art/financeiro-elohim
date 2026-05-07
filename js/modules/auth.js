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

  const permissoes =
    Array.isArray(usuario.permissoes)
      ? usuario.permissoes
      : [];

  document
    .querySelectorAll(".menu button")
    .forEach(botao => {

      const aba = botao.dataset.tab;

      // ADMIN vê tudo
      if (usuario.tipo === "admin") {
        botao.style.display = "flex";
        return;
      }

      // usuário comum
      if (permissoes.includes(aba)) {
        botao.style.display = "flex";
      } else {
        botao.style.display = "none";
      }
    });
}

  podeAcessar(aba) {

    const permissoes =
      this.usuario?.permissoes || [];

    return (
      permissoes.includes("*") ||
      permissoes.includes(aba)
    );
  }
};
