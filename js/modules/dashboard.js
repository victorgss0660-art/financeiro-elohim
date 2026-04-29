window.dashboardModule = {
  dados: [],

  get(id) {
    return document.getElementById(id);
  },

  numero(valor) {
    if (typeof valor === "number") return valor;
    if (valor === null || valor === undefined || valor === "") return 0;

    let txt = String(valor).trim();
    txt = txt.replace(/R\$/g, "").replace(/\s/g, "");

    const temVirgula = txt.includes(",");
    const temPonto = txt.includes(".");

    if (temVirgula && temPonto) {
      txt = txt.replace(/\./g, "").replace(",", ".");
    } else if (temVirgula && !temPonto) {
      txt = txt.replace(",", ".");
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

  hojeISO() {
    return new Date().toISOString().slice(0, 10);
  },

  mesAtualISO() {
    return new Date().toISOString().slice(0, 7);
  },

  dataBR(data) {
    if (!data) return "-";
    const d = new Date(data + "T00:00:00");
    if (isNaN(d.getTime())) return data;
    return d.toLocaleDateString("pt-BR");
  },

  async carregar() {
    try {
      const dados = await api.restGet("contas_pagar", "select=*");

      this.dados = Array.isArray(dados) ? dados : [];

      this.renderizar();
    } catch (error) {
      console.error(error);
      alert("Erro ao carregar dashboard.");
    }
  },

  renderizar() {
    this.cards();
    this.proximosVencimentos();
    this.topFornecedores();
    this.porCategoria();
  },

  cards() {
    const hoje = this.hojeISO();
    const mesAtual = this.mesAtualISO();

    const abertas = this.dados.filter(
      item => String(item.status || "pendente").toLowerCase() !== "pago"
    );

    const pagas = this.dados.filter(
      item => String(item.status || "").toLowerCase() === "pago"
    );

    const totalAberto = abertas.reduce((acc, item) => acc + this.numero(item.valor), 0);

    const vencidas = abertas.filter(
      item => item.vencimento && item.vencimento < hoje
    );

    const totalVencidas = vencidas.reduce((acc, item) => acc + this.numero(item.valor), 0);

    const venceHoje = abertas.filter(
      item => item.vencimento === hoje
    );

    const totalHoje = venceHoje.reduce((acc, item) => acc + this.numero(item.valor), 0);

    const pagasMes = pagas.filter(
      item => item.data_pagamento && item.data_pagamento.slice(0, 7) === mesAtual
    );

    const totalPagasMes = pagasMes.reduce((acc, item) => acc + this.numero(item.valor), 0);

    if (this.get("dashTotalAberto")) this.get("dashTotalAberto").textContent = this.moeda(totalAberto);
    if (this.get("dashTotalVencidas")) this.get("dashTotalVencidas").textContent = this.moeda(totalVencidas);
    if (this.get("dashVenceHoje")) this.get("dashVenceHoje").textContent = this.moeda(totalHoje);
    if (this.get("dashPagasMes")) this.get("dashPagasMes").textContent = this.moeda(totalPagasMes);

    if (this.get("dashQtdAberto")) this.get("dashQtdAberto").textContent = `${abertas.length} conta(s)`;
    if (this.get("dashQtdVencidas")) this.get("dashQtdVencidas").textContent = `${vencidas.length} vencida(s)`;
    if (this.get("dashQtdHoje")) this.get("dashQtdHoje").textContent = `${venceHoje.length} hoje`;
    if (this.get("dashQtdPagasMes")) this.get("dashQtdPagasMes").textContent = `${pagasMes.length} paga(s)`;
  },

  proximosVencimentos() {
    const tbody = this.get("dashboardVencimentos");
    if (!tbody) return;

    const hoje = this.hojeISO();

    const lista = this.dados
      .filter(item =>
        String(item.status || "pendente").toLowerCase() !== "pago" &&
        item.vencimento &&
        item.vencimento >= hoje
      )
      .sort((a, b) => String(a.vencimento).localeCompare(String(b.vencimento)))
      .slice(0, 10);

    if (!lista.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4">Nenhum vencimento próximo.</td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = lista.map(item => `
      <tr>
        <td>${item.fornecedor || "-"}</td>
        <td>${item.documento || "-"}</td>
        <td>${this.dataBR(item.vencimento)}</td>
        <td>${this.moeda(item.valor)}</td>
      </tr>
    `).join("");
  },

  topFornecedores() {
    const box = this.get("dashboardTopFornecedores");
    if (!box) return;

    const abertas = this.dados.filter(
      item => String(item.status || "pendente").toLowerCase() !== "pago"
    );

    const mapa = {};

    abertas.forEach(item => {
      const fornecedor = item.fornecedor || "Sem fornecedor";
      mapa[fornecedor] = (mapa[fornecedor] || 0) + this.numero(item.valor);
    });

    const ranking = Object.entries(mapa)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);

    if (!ranking.length) {
      box.innerHTML = `<p class="dash-muted">Sem dados.</p>`;
      return;
    }

    const maior = ranking[0][1] || 1;

    box.innerHTML = ranking.map(([nome, valor], index) => {
      const largura = Math.max(8, (valor / maior) * 100);

      return `
        <div class="dash-rank-item">
          <div class="dash-rank-head">
            <span>${index + 1}. ${nome}</span>
            <strong>${this.moeda(valor)}</strong>
          </div>
          <div class="dash-bar">
            <div class="dash-bar-fill" style="width:${largura}%"></div>
          </div>
        </div>
      `;
    }).join("");
  },

  porCategoria() {
    const box = this.get("dashboardCategorias");
    if (!box) return;

    const abertas = this.dados.filter(
      item => String(item.status || "pendente").toLowerCase() !== "pago"
    );

    const mapa = {};

    abertas.forEach(item => {
      const categoria = item.categoria || "Sem categoria";
      mapa[categoria] = (mapa[categoria] || 0) + this.numero(item.valor);
    });

    const ranking = Object.entries(mapa)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    if (!ranking.length) {
      box.innerHTML = `<p class="dash-muted">Sem dados.</p>`;
      return;
    }

    box.innerHTML = ranking.map(([categoria, valor]) => `
      <div class="dash-category">
        <span>${categoria}</span>
        <strong>${this.moeda(valor)}</strong>
      </div>
    `).join("");
  }
};

window.carregarDashboard = () => dashboardModule.carregar();
