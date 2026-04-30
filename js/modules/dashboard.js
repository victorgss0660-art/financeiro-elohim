const dashboardModule = {

  async carregar() {
    try {
      console.log("Carregando dashboard...");

      const contasPagar = await api.restGet("contas_pagar", "select=*");
      const contasReceber = await api.restGet("contas_receber", "select=*");

      this.processar(contasPagar || [], contasReceber || []);

    } catch (e) {
      console.error("Erro no dashboard:", e);
    }
  },

  processar(contasPagar, contasReceber) {

    const hoje = new Date();
    hoje.setHours(0,0,0,0);

    let totalAberto = 0;
    let totalVencidas = 0;
    let totalHoje = 0;
    let totalPagasMes = 0;

    let qtdAberto = 0;
    let qtdVencidas = 0;
    let qtdHoje = 0;
    let qtdPagasMes = 0;

    const vencimentos = [];
    const fornecedoresMap = {};
    const categoriasMap = {};

    // ===== CONTAS A PAGAR =====
    contasPagar.forEach(item => {

      if (item.pago) {
        const dataPagamento = new Date(item.data_pagamento);
        if (
          dataPagamento.getMonth() === hoje.getMonth() &&
          dataPagamento.getFullYear() === hoje.getFullYear()
        ) {
          totalPagasMes += Number(item.valor || 0);
          qtdPagasMes++;
        }
        return;
      }

      const valor = Number(item.valor || 0);
      const vencimento = new Date(item.vencimento);

      totalAberto += valor;
      qtdAberto++;

      if (vencimento < hoje) {
        totalVencidas += valor;
        qtdVencidas++;
      }

      if (vencimento.getTime() === hoje.getTime()) {
        totalHoje += valor;
        qtdHoje++;
      }

      vencimentos.push(item);

      // fornecedores
      const fornecedor = item.fornecedor || "Sem nome";
      fornecedoresMap[fornecedor] = (fornecedoresMap[fornecedor] || 0) + valor;

      // categorias
      const categoria = item.categoria || "Outros";
      categoriasMap[categoria] = (categoriasMap[categoria] || 0) + valor;

    });

    this.renderKPIs({
      totalAberto,
      totalVencidas,
      totalHoje,
      totalPagasMes,
      qtdAberto,
      qtdVencidas,
      qtdHoje,
      qtdPagasMes
    });

    this.renderVencimentos(vencimentos);
    this.renderFornecedores(fornecedoresMap);
    this.renderCategorias(categoriasMap);
  },

  // ===== KPI =====
  renderKPIs(d) {

    this.set("dashTotalAberto", this.moeda(d.totalAberto));
    this.set("dashQtdAberto", `${d.qtdAberto} conta(s)`);

    this.set("dashTotalVencidas", this.moeda(d.totalVencidas));
    this.set("dashQtdVencidas", `${d.qtdVencidas} vencida(s)`);

    this.set("dashVenceHoje", this.moeda(d.totalHoje));
    this.set("dashQtdHoje", `${d.qtdHoje} hoje`);

    this.set("dashPagasMes", this.moeda(d.totalPagasMes));
    this.set("dashQtdPagasMes", `${d.qtdPagasMes} paga(s)`);
  },

  // ===== TABELA =====
  renderVencimentos(lista) {
    const tbody = document.getElementById("dashboardVencimentos");
    if (!tbody) return;

    if (!lista.length) {
      tbody.innerHTML = `<tr><td colspan="4">Sem dados</td></tr>`;
      return;
    }

    lista.sort((a,b) => new Date(a.vencimento) - new Date(b.vencimento));

    tbody.innerHTML = lista.slice(0, 10).map(item => `
      <tr>
        <td>${item.fornecedor || "-"}</td>
        <td>${item.documento || "-"}</td>
        <td>${this.dataBR(item.vencimento)}</td>
        <td><strong>${this.moeda(item.valor)}</strong></td>
      </tr>
    `).join("");
  },

  // ===== FORNECEDORES =====
  renderFornecedores(map) {
    const el = document.getElementById("dashboardTopFornecedores");
    if (!el) return;

    const lista = Object.entries(map)
      .sort((a,b) => b[1] - a[1])
      .slice(0,5);

    if (!lista.length) {
      el.innerHTML = "Sem dados";
      return;
    }

    el.innerHTML = lista.map(([nome, valor]) => `
      <div class="dash-line">
        <span>${nome}</span>
        <strong>${this.moeda(valor)}</strong>
      </div>
    `).join("");
  },

  // ===== CATEGORIAS =====
  renderCategorias(map) {
    const el = document.getElementById("dashboardCategorias");
    if (!el) return;

    const lista = Object.entries(map)
      .sort((a,b) => b[1] - a[1])
      .slice(0,6);

    if (!lista.length) {
      el.innerHTML = "Sem dados";
      return;
    }

    el.innerHTML = lista.map(([nome, valor]) => `
      <div class="dash-category">
        <span>${nome}</span>
        <strong>${this.moeda(valor)}</strong>
      </div>
    `).join("");
  },

  // ===== HELPERS =====
  moeda(v) {
    return Number(v || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
  },

  dataBR(d) {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("pt-BR");
  },

  set(id, val) {
    const el = document.getElementById(id);
    if (el) el.innerText = val;
  }

};

window.dashboardModule = dashboardModule;
