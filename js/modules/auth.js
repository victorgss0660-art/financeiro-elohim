window.authModule = {
  usuario: null,
  permissoes: null,

  get(id) {
    return document.getElementById(id);
  },

  async iniciar() {
    const { data } = await supabase.auth.getSession();

    if (data.session?.user) {
      this.usuario = data.session.user;
      await this.carregarPermissoes();
      this.mostrarSistema();
    } else {
      this.mostrarLogin();
    }
  },

  async login() {
    try {
      const email = this.get("loginEmail").value.trim();
      const senha = this.get("loginSenha").value;

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: senha
      });

      if (error) {
        this.get("loginErro").textContent = "E-mail ou senha inválidos.";
        return;
      }

      this.usuario = data.user;

      await this.carregarPermissoes();

      if (!this.permissoes || !this.permissoes.ativo) {
        await supabase.auth.signOut();
        this.get("loginErro").textContent = "Usuário sem permissão de acesso.";
        return;
      }

      this.mostrarSistema();

    } catch (erro) {
      console.error(erro);
      this.get("loginErro").textContent = "Erro ao fazer login.";
    }
  },

  async carregarPermissoes() {
    const email = this.usuario.email;

    const dados = await api.restGet(
      "usuarios_permissoes",
      `select=*&email=eq.${encodeURIComponent(email)}`
    );

    this.permissoes = Array.isArray(dados) ? dados[0] : null;
  },

  mostrarLogin() {
    this.get("loginScreen").style.display = "flex";
    this.get("appSistema").style.display = "none";
  },

  mostrarSistema() {
    this.get("loginScreen").style.display = "none";
    this.get("appSistema").style.display = "flex";

    this.aplicarPermissoes();

    if (window.app?.iniciar) {
      app.iniciar();
    }
  },

  aplicarPermissoes() {
    const mapa = {
      dashboard: "dashboard",
      "contas-pagar": "contas_pagar",
      "contas-pagas": "contas_pagas",
      "contas-receber": "contas_receber",
      planejamento: "planejamento",
      "inserir-dados": "inserir_dados"
    };

    document.querySelectorAll(".menu button").forEach(btn => {
      const aba = btn.dataset.tab;
      const campo = mapa[aba];

      if (!campo || !this.permissoes[campo]) {
        btn.style.display = "none";
      } else {
        btn.style.display = "block";
      }
    });

    const primeiraAba = document.querySelector(".menu button[style='display: block;']");

    if (primeiraAba) {
      abrirAba(primeiraAba.dataset.tab);
    }
  },

  podeAcessar(nomeAba) {
    const mapa = {
      dashboard: "dashboard",
      "contas-pagar": "contas_pagar",
      "contas-pagas": "contas_pagas",
      "contas-receber": "contas_receber",
      planejamento: "planejamento",
      "inserir-dados": "inserir_dados"
    };

    const campo = mapa[nomeAba];

    return campo && this.permissoes?.[campo];
  },

  async logout() {
    await supabase.auth.signOut();
    location.reload();
  }
};
