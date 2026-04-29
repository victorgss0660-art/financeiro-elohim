window.dashboardModule = {
  dadosPagar: [],
  dadosPagas: [],

  get(id) {
    return document.getElementById(id);
  },

  numero(valor) {
    if (typeof valor === "number") return valor;
    if (valor === null || valor === undefined || valor === "") return 0;

    let txt = String(valor).trim();
    txt = txt.replace("R$", "").replace(/\s/g, "");

    const virgulas = (txt.match(/,/g) || []).length;
    const pontos = (txt.match(/\./g) || []).length;

    if (virgulas === 1 && pontos >= 1) {
      txt = txt.replace(/\./g, "").replace(",", ".");
    } else if (virgulas === 1 && pontos === 0) {
      txt = txt.replace(",", ".");
    } else if (pontos > 1 && virgulas === 0) {
      txt = txt.replace(/\./g, "");
    }

    const n = parseFloat(txt);
    return isNaN(n) ? 0 : n;
  },

  moeda(valor) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(this.numero(valor));
  },

  dataHoje() {
    return new Date().toISOString().slice(0, 10);
  },

  async carregar() {
    try {
      const dados = await api.restGet(
        "contas_pagar",
        "select=*"
      );

      const lista = Array.isArray(dados) ? dados : [];

      this.dadosPagar = lista.filter(
        item => String(item.status || "pendente").toLowerCase() !== "pago"
      );

      this.dadosPagas = lista.filter(
        item => String(item.status || "").toLowerCase() === "pago"
      );

      this.renderizar();

    } catch (error) {
      console.error(error);
      alert("Erro ao carregar dashboard.");
    }
  },

  renderizar() {
    this.cards();
    this.tabelaVencendo();
    this.topFornecedores();
  },

  cards() {
    const hoje = this.dataHoje();

    const totalAberto = this.dadosPagar.reduce(
      (acc, item) => acc + this.numero(item.valor), 0
    );

    const vencidas = this.dadosPagar.filter(
      item => item.vencimento && item.vencimento < hoje
    );

    const totalVencidas = vencidas.reduce(
      (acc, item) => acc + this.numero(item.valor), 0
    );

    const pagasMes = this.dadosPagas.filter(item => {
      if (!item.data_pagamento) return false;
      return item.data_pagamento.slice(0, 7) === hoje.slice(0, 7);
    });

    const totalPagasMes = pagasMes.reduce(
      (acc, item) => acc + this.numero(item.valor), 0
    );

    const vencendoHoje = this.dadosPagar.filter(
      item => item.vencimento === hoje
    );

    const totalHoje = vencendoHoje.reduce(
      (acc, item) => acc + this.numero(item.valor), 0
    );

    if (this.get("dashTotalAberto"))
      this.get("dashTotalAberto").textContent = this.moeda(totalAberto);

    if (this.get("dashTotalVencidas"))
      this.get("dashTotalVencidas").textContent = this.moeda(totalVencidas);

    if (this.get("dashPagasMes"))
      this.get("dashPagasMes").textContent = this.moeda(totalPagasMes);

    if (this.get("dashVenceHoje"))
      this.get("dashVenceHoje").textContent = this.moeda(totalHoje);
  },

  tabelaVencendo() {
    const tbody = this.get("dashboardVencimentos");
    if (!tbody) return;

    const hoje = this.dataHoje();

    const lista = [...this.dadosPagar]
      .filter(item => item.vencimento >= hoje)
      .sort((a, b) => a.vencimento.localeCompare(b.vencimento))
      .slice(0, 10);

    if (!lista.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4">Nenhuma conta próxima.</td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = lista.map(item => `
      <tr>
        <td>${item.fornecedor || "-"}</td>
        <td>${item.documento || "-"}</td>
        <td>${item.vencimento.split("-").reverse().join("/")}</td>
        <td>${this.moeda(item.valor)}</td>
      </tr>
    `).join("");
  },

  topFornecedores() {
    const box = this.get("dashboardTopFornecedores");
    if (!box) return;

    const mapa = {};

    this.dadosPagar.forEach(item => {
      const nome = item.fornecedor || "Sem nome";
      mapa[nome] = (mapa[nome] || 0) + this.numero(item.valor);
    });

    const ranking = Object.entries(mapa)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    if (!ranking.length) {
      box.innerHTML = "Sem dados.";
      return;
    }

    box.innerHTML = ranking.map((item, i) => `
      <div class="rank-item">
        <span>${i + 1}. ${item[0]}</span>
        <strong>${this.moeda(item[1])}</strong>
      </div>
    `).join("");
  }
};

window.carregarDashboard = () =>
  dashboardModule.carregar();
