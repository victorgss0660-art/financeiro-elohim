

window.authModule = {
  usuarioAtual: null,

  async login() {
    try {
      utils.setLoginMsg("Validando acesso...", "info");

      const email = (document.getElementById("loginEmail").value || "").trim().toLowerCase();
      const senha = document.getElementById("loginSenha").value || "";

      if (!email || !senha) {
        utils.setLoginMsg("Preencha e-mail e senha.", "err");
        return;
      }

      const query = `select=*&email=eq.${encodeURIComponent(email)}&senha=eq.${encodeURIComponent(senha)}&limit=1`;
      const data = await api.restGet("usuarios", query);

      if (!data || !data.length) {
        utils.setLoginMsg("Login inválido.", "err");
        return;
      }

      this.usuarioAtual = data[0];
      localStorage.setItem("elohim_user", JSON.stringify(this.usuarioAtual));

      document.getElementById("userEmail").textContent = this.usuarioAtual.email || "-";
      document.getElementById("userPerfil").textContent = this.usuarioAtual.perfil || "-";
      document.getElementById("perfilBadge").textContent =
        this.usuarioAtual.perfil === "admin" ? "Administrador" : "Visualização";

      document.getElementById("loginScreen").classList.add("hidden");
      document.getElementById("appShell").classList.remove("hidden");

      if (window.app && window.app.carregarTudo) {
        await window.app.carregarTudo();
      }
    } catch (erro) {
      utils.setLoginMsg("Erro no login: " + erro.message, "err");
    }
  },

  restaurarSessao() {
    const salvo = localStorage.getItem("elohim_user");
    if (!salvo) return;

    try {
      this.usuarioAtual = JSON.parse(salvo);

      document.getElementById("userEmail").textContent = this.usuarioAtual.email || "-";
      document.getElementById("userPerfil").textContent = this.usuarioAtual.perfil || "-";
      document.getElementById("perfilBadge").textContent =
        this.usuarioAtual.perfil === "admin" ? "Administrador" : "Visualização";

      document.getElementById("loginScreen").classList.add("hidden");
      document.getElementById("appShell").classList.remove("hidden");

      if (window.app && window.app.carregarTudo) {
        window.app.carregarTudo();
      }
    } catch {
      localStorage.removeItem("elohim_user");
    }
  },

  logout() {
    localStorage.removeItem("elohim_user");
    location.reload();
  }
};

