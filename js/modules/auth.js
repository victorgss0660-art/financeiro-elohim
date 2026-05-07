window.authModule = {

  usuario: null,

  async iniciar() {

    const usuarioLogado =
      localStorage.getItem("financeiro_user");

    if (usuarioLogado) {

      this.usuario =
        JSON.parse(usuarioLogado);

      this.abrirSistema();

      return;
    }

    this.mostrarLogin();
  },

  mostrarLogin() {

    document.getElementById("loginScreen").style.display = "flex";

    document.getElementById("appSistema").style.display = "none";
  },

abrirSistema() {
  document.getElementById("loginScreen").style.display = "none";
  document.getElementById("appSistema").style.display = "block";

  this.aplicarPermissoes();

  localStorage.removeItem("abaAtualFinanceiro");

  if (window.app?.iniciar) {
    app.iniciar();
  }
}

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

    console.log("Tentando login:", email);

    const usuarios =
      await api.restGet(
        "usuarios_permissoes",
        `select=*`
      );

    console.log("Usuarios encontrados:", usuarios);

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

    localStorage.setItem(
      "financeiro_user",
      JSON.stringify(usuario)
    );

    this.usuario = usuario;

    this.aplicarPermissoes();

    this.abrirSistema();

  } catch (erro) {

    console.error("Erro login:", erro);

    alert("Erro ao realizar login.");
  }
}
  
  logout() {

    localStorage.removeItem("financeiro_user");

    location.reload();
  },

  aplicarPermissoes() {

    const permissoes =
      this.usuario.permissoes || [];

    document
      .querySelectorAll(".menu button")
      .forEach(btn => {

        const aba =
          btn.dataset.tab;

        if (
          permissoes.includes("*") ||
          permissoes.includes(aba)
        ) {

          btn.style.display = "flex";

        } else {

          btn.style.display = "none";
        }
      });
  },

  podeAcessar(aba) {

    if (!this.usuario) return false;

    const permissoes =
      this.usuario.permissoes || [];

    return (
      permissoes.includes("*") ||
      permissoes.includes(aba)
    );
  }
};
