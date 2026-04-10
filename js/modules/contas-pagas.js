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

      this.lista = data || [];

      this.renderTabela();
      this.renderCards();
      this.renderGraficoMes();
      this.renderGraficoCategoria();

    } catch (e) {
      utils.setAppMsg("Erro ao carregar contas pagas", "err");
    }
  },

  renderTabela() {
    const tbody = document.getElementById("tabelaContasPagas");

    tbody.innerHTML = this.lista.map(i => `
      <tr>
        <td>${i.fornecedor}</td>
        <td>${i.descricao}</td>
        <td>${i.categoria}</td>
        <td>${utils.moeda(i.valor)}</td>
        <td>${i.data_pagamento || "-"}</td>
      </tr>
    `).join("");
  },

  renderCards() {
    const total = this.lista.reduce((acc, i) => acc + Number(i.valor || 0), 0);
    const qtd = this.lista.length;
    const media = qtd ? total / qtd : 0;
    const maior = Math.max(...this.lista.map(i => Number(i.valor || 0)), 0);

    document.getElementById("cpPagasTotalCard").textContent = utils.moeda(total);
    document.getElementById("cpPagasQtdCard").textContent = qtd;
    document.getElementById("cpPagasMedia").textContent = utils.moeda(media);
    document.getElementById("cpPagasMaior").textContent = utils.moeda(maior);
  },

  renderGraficoMes() {
    const dados = {};

    this.lista.forEach(i => {
      if (!i.data_pagamento) return;
      const mes = i.data_pagamento.slice(0,7);
      dados[mes] = (dados[mes] || 0) + Number(i.valor || 0);
    });

    const labels = Object.keys(dados).sort();
    const valores = labels.map(l => dados[l]);

    const ctx = document.getElementById("chartPagasMes");

    if (this.chartMes) this.chartMes.destroy();

    this.chartMes = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [{
          label: "Pagamentos",
          data: valores,
          tension: 0.4
        }]
      }
    });
  },

  renderGraficoCategoria() {
    const dados = {};

    this.lista.forEach(i => {
      const cat = i.categoria || "Outros";
      dados[cat] = (dados[cat] || 0) + Number(i.valor || 0);
    });

    const labels = Object.keys(dados);
    const valores = Object.values(dados);

    const ctx = document.getElementById("chartPagasCategoria");

    if (this.chartCategoria) this.chartCategoria.destroy();

    this.chartCategoria = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels,
        datasets: [{
          data: valores
        }]
      }
    });
  },

  exportarPlanilha() {
    const ws = XLSX.utils.json_to_sheet(this.lista);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pagas");
    XLSX.writeFile(wb, "contas_pagas.xlsx");
  }
};
