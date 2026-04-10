window.contasPagasModule = {
  lista: [],
  chartMes: null,
  chartCategoria: null,

  async carregarContasPagas() {
    try {
      const data = await api.restGet(
        "contas_pagar",
        "select=*&status=eq.pago"
      );

      this.lista = Array.isArray(data) ? data : [];

      this.renderTabela();
      this.renderCards();
      this.renderGraficoMes();
      this.renderGraficoCategoria();
      this.renderRankingFornecedores();
    } catch (e) {
      utils.setAppMsg("Erro ao carregar contas pagas", "err");
    }
  },

  renderTabela() {
    const tbody = document.getElementById("tabelaContasPagas");
    if (!tbody) return;

    if (!this.lista.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="muted">Nenhuma conta paga.</td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = this.lista.map(i => `
      <tr>
        <td>${i.fornecedor || "-"}</td>
        <td>${i.documento || "-"}</td>
        <td>${i.categoria || "-"}</td>
        <td>${utils.moeda(i.valor || 0)}</td>
        <td>${i.data_pagamento || "-"}</td>
      </tr>
    `).join("");
  },

  renderCards() {
    const total = this.lista.reduce((acc, i) => acc + Number(i.valor || 0), 0);
    const qtd = this.lista.length;
    const media = qtd ? total / qtd : 0;
    const maior = Math.max(...this.lista.map(i => Number(i.valor || 0)), 0);

    const totalEl = document.getElementById("cpPagasTotalCard");
    const qtdEl = document.getElementById("cpPagasQtdCard");
    const mediaEl = document.getElementById("cpPagasMedia");
    const maiorEl = document.getElementById("cpPagasMaior");

    if (totalEl) totalEl.textContent = utils.moeda(total);
    if (qtdEl) qtdEl.textContent = String(qtd);
    if (mediaEl) mediaEl.textContent = utils.moeda(media);
    if (maiorEl) maiorEl.textContent = utils.moeda(maior);
  },

  renderGraficoMes() {
    const ctx = document.getElementById("chartPagasMes");
    if (!ctx || typeof Chart === "undefined") return;

    const dados = {};

    this.lista.forEach(i => {
      if (!i.data_pagamento) return;
      const mes = String(i.data_pagamento).slice(0, 7);
      dados[mes] = (dados[mes] || 0) + Number(i.valor || 0);
    });

    const labels = Object.keys(dados).sort();
    const valores = labels.map(l => dados[l]);

    if (this.chartMes) this.chartMes.destroy();

    this.chartMes = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [{
          label: "Pagamentos",
          data: valores,
          tension: 0.35
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });
  },

  renderGraficoCategoria() {
    const ctx = document.getElementById("chartPagasCategoria");
    if (!ctx || typeof Chart === "undefined") return;

    const dados = {};

    this.lista.forEach(i => {
      const cat = i.categoria || "Outros";
      dados[cat] = (dados[cat] || 0) + Number(i.valor || 0);
    });

    const labels = Object.keys(dados);
    const valores = Object.values(dados);

    if (this.chartCategoria) this.chartCategoria.destroy();

    this.chartCategoria = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels,
        datasets: [{
          data: valores
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });
  },

  renderRankingFornecedores() {
    const el = document.getElementById("rankingFornecedoresPagas");
    if (!el) return;

    if (!this.lista.length) {
      el.innerHTML = `<div class="muted">Nenhum dado disponível.</div>`;
      return;
    }

    const mapa = {};

    this.lista.forEach(item => {
      const fornecedor = item.fornecedor || "Sem fornecedor";
      if (!mapa[fornecedor]) {
        mapa[fornecedor] = {
          fornecedor,
          total: 0,
          quantidade: 0
        };
      }

      mapa[fornecedor].total += Number(item.valor || 0);
      mapa[fornecedor].quantidade += 1;
    });

    const ranking = Object.values(mapa)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    el.innerHTML = ranking.map((item, index) => `
      <div class="alert-item">
        <strong>#${index + 1} ${item.fornecedor}</strong><br>
        Total pago: ${utils.moeda(item.total)}<br>
        Quantidade de pagamentos: ${item.quantidade}
      </div>
    `).join("");
  },

  exportarPlanilha() {
    const ws = XLSX.utils.json_to_sheet(this.lista);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pagas");
    XLSX.writeFile(wb, "contas_pagas.xlsx");
  }
};
