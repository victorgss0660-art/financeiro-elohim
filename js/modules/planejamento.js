window.planejamentoModule = {
  contasPagar: [],
  contasReceber: [],
  saldos: [],
  chart: null,

  get(id) {
    return document.getElementById(id);
  },

  numero(v) {
    if (typeof v === "number") return v;
    if (!v) return 0;
    return parseFloat(
      String(v).replace("R$", "").replace(/\./g, "").replace(",", ".")
    ) || 0;
  },

  moeda(v) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(this.numero(v));
  },

  addDias(data, dias) {
    const d = new Date(data);
    d.setDate(d.getDate() + dias);
    return d.toISOString().slice(0, 10);
  },

  inicioSemana(data) {
    const d = new Date(data);
    const dia = d.getDay();
    const ajuste = dia === 0 ? -6 : 1 - dia;
    d.setDate(d.getDate() + ajuste);
    return d.toISOString().slice(0, 10);
  },

  async carregar() {
    try {
      this.saldos = await api.restGet("saldos_bancarios", "select=*");
      this.contasPagar = await api.restGet("contas_pagar", "select=*");
      this.contasReceber = await api.restGet("contas_receber", "select=*");

      this.renderizarSaldos();
      this.renderizar();
    } catch (e) {
      console.error(e);
      alert("Erro ao carregar planejamento");
    }
  },

  saldoInicial() {
    return this.saldos.reduce((t, s) => t + this.numero(s.saldo), 0);
  },

  renderizarSaldos() {
    const el = this.get("tabelaSaldosBancarios");
    const total = this.get("planejamentoSaldoInicial");

    if (total) total.textContent = this.moeda(this.saldoInicial());
    if (!el) return;

    el.innerHTML = this.saldos.map(s => `
      <tr>
        <td>${s.conta}</td>
        <td>${this.moeda(s.saldo)}</td>
        <td>
          <button onclick="planejamentoModule.editarSaldo(${s.id})">Editar</button>
        </td>
      </tr>
    `).join("");
  },

  renderizar() {
    const tabela = this.get("tabelaPlanejamento");
    const ctx = this.get("chartPlanejamento");

    if (!tabela) return;

    let hoje = new Date().toISOString().slice(0,10);
    let inicio = this.inicioSemana(hoje);

    let saldo = this.saldoInicial();

    let labels = [];
    let entradasArr = [];
    let saidasArr = [];
    let caixaArr = [];

    let totalReceber = 0;
    let totalPagar = 0;

    let html = "";

    for (let i = 0; i < 12; i++) {
      const fim = this.addDias(inicio, 6);

      const receber = this.contasReceber
        .filter(c => c.vencimento >= inicio && c.vencimento <= fim)
        .reduce((t, c) => t + this.numero(c.valor), 0);

      const pagar = this.contasPagar
        .filter(c => c.vencimento >= inicio && c.vencimento <= fim && c.status !== "pago")
        .reduce((t, c) => t + this.numero(c.valor), 0);

      const saldoSemana = receber - pagar;
      const saldoAnterior = saldo;
      saldo += saldoSemana;

      totalReceber += receber;
      totalPagar += pagar;

      const risco = saldo < 0;

      html += `
        <tr style="${risco ? 'background:#ffe2e2' : ''}">
          <td>${i+1}</td>
          <td>${inicio} até ${fim}</td>
          <td>${this.moeda(saldoAnterior)}</td>
          <td style="color:green">${this.moeda(receber)}</td>
          <td style="color:red">${this.moeda(pagar)}</td>
          <td>${this.moeda(saldoSemana)}</td>
          <td style="font-weight:bold">${this.moeda(saldo)}</td>
          <td>${risco ? "⚠️" : "OK"}</td>
        </tr>
      `;

      labels.push("S" + (i+1));
      entradasArr.push(receber);
      saidasArr.push(pagar);
      caixaArr.push(saldo);

      inicio = this.addDias(inicio, 7);
    }

    tabela.innerHTML = html;

    this.get("planejamentoTotalReceber").textContent = this.moeda(totalReceber);
    this.get("planejamentoTotalPagar").textContent = this.moeda(totalPagar);
    this.get("planejamentoSaldoFinal").textContent = this.moeda(saldo);

    this.renderizarGrafico(ctx, labels, entradasArr, saidasArr, caixaArr);
  },

  renderizarGrafico(canvas, labels, entradas, saidas, caixa) {
    if (!canvas || typeof Chart === "undefined") return;

    if (this.chart) this.chart.destroy();

    this.chart = new Chart(canvas, {
      data: {
        labels,
        datasets: [
          {
            type: "bar",
            label: "Entradas",
            data: entradas,
          },
          {
            type: "bar",
            label: "Saídas",
            data: saidas,
          },
          {
            type: "line",
            label: "Caixa",
            data: caixa,
            tension: 0.4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });
  },

  async editarSaldo(id) {
    const item = this.saldos.find(s => s.id == id);
    if (!item) return;

    const novo = prompt("Novo saldo:", item.saldo);
    if (novo === null) return;

    await api.update("saldos_bancarios", id, {
      saldo: this.numero(novo)
    });

    this.carregar();
  }
};

window.carregarPlanejamento = () => planejamentoModule.carregar();
