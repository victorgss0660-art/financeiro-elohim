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
    if (v === null || v === undefined || v === "") return 0;

    let txt = String(v).trim();
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

  moeda(v) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(this.numero(v));
  },

  dataBR(data) {
    if (!data) return "-";
    const d = new Date(String(data) + "T00:00:00");
    if (isNaN(d.getTime())) return data;
    return d.toLocaleDateString("pt-BR");
  },

  addDias(data, dias) {
    const d = new Date(String(data) + "T00:00:00");
    d.setDate(d.getDate() + dias);
    return d.toISOString().slice(0, 10);
  },

  inicioSemana(data) {
    const d = new Date(String(data) + "T00:00:00");
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
      this.renderizarPlanejamentoInteligente();
    } catch (e) {
      console.error(e);
      alert("Erro ao carregar planejamento.");
    }
  },

  saldoInicial() {
    return this.saldos.reduce((acc, item) => {
      return acc + this.numero(item.saldo);
    }, 0);
  },

  mediaHistorica(tipo) {
    const hoje = new Date().toISOString().slice(0, 10);
    const inicio = this.addDias(hoje, -84); // últimas 12 semanas

    const lista =
      tipo === "receber"
        ? this.contasReceber.filter(item => {
            const status = String(item.status || "").toLowerCase();
            const data = item.data_recebimento || item.vencimento || "";
            return status === "recebido" && data >= inicio && data <= hoje;
          })
        : this.contasPagar.filter(item => {
            const status = String(item.status || "").toLowerCase();
            const data = item.data_pagamento || item.vencimento || "";
            return status === "pago" && data >= inicio && data <= hoje;
          });

    const total = lista.reduce((acc, item) => acc + this.numero(item.valor), 0);

    return total / 12;
  },

  renderizarSaldos() {
    const tbody = this.get("tabelaSaldosBancarios");
    const total = this.get("planejamentoSaldoInicial");

    if (total) total.textContent = this.moeda(this.saldoInicial());

    if (!tbody) return;

    if (!this.saldos.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="3">Nenhum saldo bancário encontrado.</td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = this.saldos.map(item => `
      <tr>
        <td>${item.conta || "-"}</td>
        <td><strong>${this.moeda(item.saldo)}</strong></td>
        <td>
          <button class="btn-editar" onclick="planejamentoModule.editarSaldo(${Number(item.id)})">
            Editar
          </button>
        </td>
      </tr>
    `).join("");
  },

  renderizarPlanejamentoInteligente() {
    const tbody = this.get("tabelaPlanejamento");
    if (!tbody) return;

    const hoje = new Date().toISOString().slice(0, 10);
    let inicio = this.inicioSemana(hoje);

    let saldo = this.saldoInicial();

    const mediaReceber = this.mediaHistorica("receber");
    const mediaPagar = this.mediaHistorica("pagar");

    let totalReceber = 0;
    let totalPagar = 0;

    const labels = [];
    const entradasArr = [];
    const saidasArr = [];
    const caixaArr = [];
    const previsaoArr = [];

    let linhas = "";

    for (let i = 0; i < 12; i++) {
      const fim = this.addDias(inicio, 6);

      const receberReal = this.contasReceber
        .filter(item => {
          const status = String(item.status || "pendente").toLowerCase();
          const data = item.vencimento || "";
          return status !== "recebido" && data >= inicio && data <= fim;
        })
        .reduce((acc, item) => acc + this.numero(item.valor), 0);

      const pagarReal = this.contasPagar
        .filter(item => {
          const status = String(item.status || "pendente").toLowerCase();
          const data = item.vencimento || "";
          return status !== "pago" && data >= inicio && data <= fim;
        })
        .reduce((acc, item) => acc + this.numero(item.valor), 0);

      const receberPrevisto = receberReal > 0 ? receberReal : mediaReceber;
      const pagarPrevisto = pagarReal > 0 ? pagarReal : mediaPagar;

      const saldoAntes = saldo;
      const saldoSemana = receberPrevisto - pagarPrevisto;

      saldo += saldoSemana;

      totalReceber += receberPrevisto;
      totalPagar += pagarPrevisto;

      const risco = saldo < 0;
      const automaticoReceber = receberReal === 0 && mediaReceber > 0;
      const automaticoPagar = pagarReal === 0 && mediaPagar > 0;

      labels.push(`S${i + 1}`);
      entradasArr.push(receberPrevisto);
      saidasArr.push(pagarPrevisto);
      caixaArr.push(saldo);
      previsaoArr.push(saldoSemana);

      linhas += `
        <tr style="${risco ? "background:#fee2e2;" : ""}">
          <td>${i + 1}</td>
          <td>${this.dataBR(inicio)} até ${this.dataBR(fim)}</td>
          <td>${this.moeda(saldoAntes)}</td>

          <td style="color:#166534;font-weight:800;">
            ${this.moeda(receberPrevisto)}
            ${automaticoReceber ? "<small style='display:block;color:#64748b;'>previsão automática</small>" : ""}
          </td>

          <td style="color:#991b1b;font-weight:800;">
            ${this.moeda(pagarPrevisto)}
            ${automaticoPagar ? "<small style='display:block;color:#64748b;'>previsão automática</small>" : ""}
          </td>

          <td style="font-weight:900;color:${saldoSemana >= 0 ? "#166534" : "#991b1b"};">
            ${this.moeda(saldoSemana)}
          </td>

          <td style="font-weight:900;color:${saldo >= 0 ? "#166534" : "#991b1b"};">
            ${this.moeda(saldo)}
          </td>

          <td>
            ${risco ? "⚠️ Risco de caixa" : "OK"}
          </td>
        </tr>
      `;

      inicio = this.addDias(inicio, 7);
    }

    linhas += `
      <tr style="font-weight:900;background:#f8fafc;">
        <td colspan="3">TOTAL 12 SEMANAS</td>
        <td>${this.moeda(totalReceber)}</td>
        <td>${this.moeda(totalPagar)}</td>
        <td>${this.moeda(totalReceber - totalPagar)}</td>
        <td>${this.moeda(saldo)}</td>
        <td></td>
      </tr>
    `;

    tbody.innerHTML = linhas;

    if (this.get("planejamentoTotalReceber")) {
      this.get("planejamentoTotalReceber").textContent = this.moeda(totalReceber);
    }

    if (this.get("planejamentoTotalPagar")) {
      this.get("planejamentoTotalPagar").textContent = this.moeda(totalPagar);
    }

    if (this.get("planejamentoSaldoFinal")) {
      this.get("planejamentoSaldoFinal").textContent = this.moeda(saldo);
    }

    this.renderizarGrafico(labels, entradasArr, saidasArr, caixaArr);
  },

  renderizarGrafico(labels, entradas, saidas, caixa) {
    const canvas = this.get("chartPlanejamento");
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
    backgroundColor: "#22c55e"
  },
  {
    type: "bar",
    label: "Saídas",
    data: saidas,
    backgroundColor: "#ef4444"
  },
  {
    type: "line",
    label: "Caixa",
    data: caixa,
    borderColor: "#38bdf8",
    backgroundColor: "#38bdf8",
    tension: 0.4,
    borderWidth: 3
  }
]
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          tooltip: {
            callbacks: {
              label: ctx => `${ctx.dataset.label}: ${this.moeda(ctx.raw)}`
            }
          }
        },
        scales: {
          y: {
            ticks: {
              callback: value => this.moeda(value)
            }
          }
        }
      }
    });
  },

  async editarSaldo(id) {
    const item = this.saldos.find(s => Number(s.id) === Number(id));
    if (!item) return;

    const novo = prompt(
      `Novo saldo para ${item.conta}:`,
      String(item.saldo || 0).replace(".", ",")
    );

    if (novo === null) return;

    try {
      await api.update("saldos_bancarios", id, {
        saldo: this.numero(novo)
      });

      await this.carregar();
    } catch (e) {
      console.error(e);
      alert("Erro ao atualizar saldo.");
    }
  }
};

window.carregarPlanejamento = () => planejamentoModule.carregar();
