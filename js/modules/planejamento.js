window.planejamentoModule = {

  contasPagar: [],
  contasReceber: [],
  saldos: [],
  chart: null,

  get(id) {
    return document.getElementById(id);
  },

numero(v) {

  if (v === null || v === undefined || v === "") {
    return 0;
  }

  // já é número
  if (typeof v === "number") {
    return v;
  }

  let txt = String(v).trim();

  // remove R$
  txt = txt.replace(/R\$/g, "").replace(/\s/g, "");

  // formato BR: 1.234,56
  if (txt.includes(",") && txt.includes(".")) {

    txt = txt
      .replace(/\./g, "")
      .replace(",", ".");

  }

  // formato BR simples: 1234,56
  else if (txt.includes(",")) {

    txt = txt.replace(",", ".");

  }

  // formato US: 1234.56
  // não faz nada

  const n = parseFloat(txt);

  return isNaN(n) ? 0 : n;
}

  moeda(v) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(this.numero(v));
  },

  async carregar() {

    try {

      this.saldos =
        await api.restGet(
          "saldos_bancarios",
          "select=*"
        );

      this.contasPagar =
        await api.restGet(
          "contas_pagar",
          "select=*"
        );

      this.contasReceber =
        await api.restGet(
          "contas_receber",
          "select=*"
        );

      this.renderizar();

    } catch (e) {

      console.error(e);

      alert(
        "Erro ao carregar planejamento"
      );
    }
  },

  saldoInicial() {

    return this.saldos.reduce(
      (t, s) => t + this.numero(s.saldo),
      0
    );
  },

  // =========================================
  // SEMANA = SÁBADO → SEXTA
  // =========================================

  inicioSemanaSabado(data = new Date()) {

    const d = new Date(data);

    const dia = d.getDay();

    // sábado = 6

    let diff;

    if (dia === 6) {
      diff = 0;
    } else {
      diff = dia + 1;
    }

    d.setDate(d.getDate() - diff);

    d.setHours(0, 0, 0, 0);

    return d;
  },

  formatarData(data) {

    return data.toLocaleDateString(
      "pt-BR",
      {
        day: "2-digit",
        month: "2-digit"
      }
    );
  },

  formatarPeriodo(inicio, fim) {

    return `${this.formatarData(inicio)} a ${this.formatarData(fim)}`;
  },

  dataISO(data) {

    const ano = data.getFullYear();

    const mes =
      String(data.getMonth() + 1)
        .padStart(2, "0");

    const dia =
      String(data.getDate())
        .padStart(2, "0");

    return `${ano}-${mes}-${dia}`;
  },

  // =========================================
  // RENDER
  // =========================================

  renderizar() {

    // ===============================
    // TABELA SALDOS
    // ===============================

    const tabelaSaldos =
      this.get("tabelaSaldosBancarios");

    tabelaSaldos.innerHTML =
      this.saldos.map(s => `
        <tr>
          <td>${s.conta}</td>

          <td>${this.moeda(s.saldo)}</td>

          <td>
            <button onclick="planejamentoModule.editarSaldo(${s.id})">
              Editar
            </button>
          </td>
        </tr>
      `).join("");

    // ===============================
    // FLUXO
    // ===============================

    const tabela =
      this.get("tabelaPlanejamento");

    const primeiraSemana =
      this.inicioSemanaSabado(
        new Date()
      );

    let saldo =
      this.saldoInicial();

    let totalReceber = 0;
    let totalPagar = 0;

    let menorSaldo = saldo;
    let semanaCritica = "-";

    let labels = [];
    let entradas = [];
    let saidas = [];
    let caixa = [];

    let html = "";

    for (let i = 0; i < 12; i++) {

      const inicio =
        new Date(primeiraSemana);

      inicio.setDate(
        primeiraSemana.getDate() + (i * 7)
      );

      const fim =
        new Date(inicio);

      fim.setDate(
        inicio.getDate() + 6
      );

      const inicioStr =
        this.dataISO(inicio);

      const fimStr =
        this.dataISO(fim);

      // ==========================
      // RECEBER
      // ==========================

      const receber =
        this.contasReceber
          .filter(c =>
            c.vencimento >= inicioStr &&
            c.vencimento <= fimStr
          )
          .reduce(
            (t, c) =>
              t + this.numero(c.valor),
            0
          );

      // ==========================
      // PAGAR
      // ==========================

      const pagar =
        this.contasPagar
          .filter(c =>
            c.vencimento >= inicioStr &&
            c.vencimento <= fimStr &&
            c.status !== "pago"
          )
          .reduce(
            (t, c) =>
              t + this.numero(c.valor),
            0
          );

      const saldoAntes = saldo;

      const resultado =
        receber - pagar;

      saldo += resultado;

      totalReceber += receber;
      totalPagar += pagar;

      // ==========================
      // MENOR SALDO
      // ==========================

      if (saldo < menorSaldo) {

        menorSaldo = saldo;

        semanaCritica =
          this.formatarPeriodo(
            inicio,
            fim
          );
      }

      const risco =
        saldo < 0;

      // ==========================
      // HTML
      // ==========================

      html += `
        <tr style="${risco ? "background:#fee2e2;" : ""}">

          <td>
            ${i + 1}
          </td>

          <td>
            ${this.formatarPeriodo(inicio, fim)}
          </td>

          <td>
            ${this.moeda(saldoAntes)}
          </td>

          <td style="color:#22c55e;">
            ${this.moeda(receber)}
          </td>

          <td style="color:#ef4444;">
            ${this.moeda(pagar)}
          </td>

          <td style="font-weight:bold;">
            ${this.moeda(resultado)}
          </td>

          <td style="
            font-weight:bold;
            color:${risco ? "#ef4444" : "#22c55e"};
          ">
            ${this.moeda(saldo)}
          </td>

          <td>
            ${risco ? "⚠️ Risco" : "OK"}
          </td>

        </tr>
      `;

      labels.push(
        this.formatarData(inicio)
      );

      entradas.push(receber);

      saidas.push(pagar);

      caixa.push(saldo);
    }

    tabela.innerHTML = html;

    // ===============================
    // CARDS
    // ===============================

    this.get("planejamentoSaldoInicial").textContent =
      this.moeda(this.saldoInicial());

    this.get("planejamentoTotalReceber").textContent =
      this.moeda(totalReceber);

    this.get("planejamentoTotalPagar").textContent =
      this.moeda(totalPagar);

    this.get("planejamentoSaldoFinal").textContent =
      this.moeda(saldo);

    // ===============================
    // STATUS CFO
    // ===============================

    this.get("planejamentoMenorSaldo").textContent =
      this.moeda(menorSaldo);

    this.get("planejamentoSemanaCritica").textContent =
      semanaCritica;

    if (menorSaldo < 0) {

      this.get("planejamentoStatusCaixa").textContent =
        "CRÍTICO";

      this.get("planejamentoStatusCaixa").style.color =
        "#ef4444";

      this.get("planejamentoNecessidadeCaixa").textContent =
        this.moeda(
          Math.abs(menorSaldo)
        );

    } else {

      this.get("planejamentoStatusCaixa").textContent =
        "SAUDÁVEL";

      this.get("planejamentoStatusCaixa").style.color =
        "#22c55e";

      this.get("planejamentoNecessidadeCaixa").textContent =
        "R$ 0,00";
    }

    // ===============================
    // GRÁFICO
    // ===============================

    this.renderizarGrafico(
      labels,
      entradas,
      saidas,
      caixa
    );
  },

  // =========================================
  // GRÁFICO
  // =========================================

  renderizarGrafico(
    labels,
    entradas,
    saidas,
    caixa
  ) {

    const canvas =
      this.get("chartPlanejamento");

    if (
      !canvas ||
      typeof Chart === "undefined"
    ) return;

    if (this.chart) {
      this.chart.destroy();
    }

    this.chart = new Chart(
      canvas,
      {
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
              label: "Saldo",
              data: caixa,
              borderColor: "#38bdf8",
              borderWidth: 3,
              tension: 0.4
            }

          ]
        },

        options: {
          responsive: true,
          maintainAspectRatio: false
        }
      }
    );
  },

  // =========================================
  // EDITAR SALDO
  // =========================================

  async editarSaldo(id) {

    const item =
      this.saldos.find(
        s => s.id == id
      );

    if (!item) return;

    const novo =
      prompt(
        "Novo saldo:",
        item.saldo
      );

    if (novo === null) return;

    await api.update(
      "saldos_bancarios",
      id,
      {
        saldo:
          this.numero(novo)
      }
    );

    this.carregar();
  }
};

window.carregarPlanejamento =
  () => planejamentoModule.carregar();
