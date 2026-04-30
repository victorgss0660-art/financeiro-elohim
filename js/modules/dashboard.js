window.dashboardModule = {

  contasPagar: [],

  contasReceber: [],

  chartFluxo: null,

  chartCategorias: null,

  get(id) {

    return document.getElementById(id);

  },

  set(id, valor) {

    const el = this.get(id);

    if (el) el.textContent = valor;

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

  mesAtual() {

    return new Date().toISOString().slice(0, 7);

  },

  dataBR(data) {

    if (!data) return "-";

    const d = new Date(String(data) + "T00:00:00");

    if (isNaN(d.getTime())) return data;

    return d.toLocaleDateString("pt-BR");

  },

  async carregar() {

    try {

      const pagar = await api.restGet("contas_pagar", "select=*");

      const receber = await api.restGet("contas_receber", "select=*");

      this.contasPagar = Array.isArray(pagar) ? pagar : [];

      this.contasReceber = Array.isArray(receber) ? receber : [];

      this.renderizarKPIs();

      this.renderizarAlertas();

      this.renderizarVencimentos();

      this.renderizarTopFornecedores();

      this.renderizarCategorias();

      this.renderizarGraficoFluxo();

      this.renderizarGraficoCategorias();

    } catch (error) {

      console.error("Erro ao carregar dashboard CEO:", error);

      alert("Erro ao carregar dashboard.");

    }

  },

  contasAbertas() {

    return this.contasPagar.filter(item =>

      String(item.status || "pendente").toLowerCase() !== "pago"

    );

  },

  contasPagas() {

    return this.contasPagar.filter(item =>

      String(item.status || "").toLowerCase() === "pago"

    );

  },

  receberAberto() {

    return this.contasReceber.filter(item =>

      String(item.status || "pendente").toLowerCase() !== "recebido"

    );

  },

  receberRecebido() {

    return this.contasReceber.filter(item =>

      String(item.status || "").toLowerCase() === "recebido"

    );

  },

  soma(lista, campo = "valor") {

    return lista.reduce((acc, item) => acc + this.numero(item[campo]), 0);

  },

  renderizarKPIs() {

    const hoje = this.hojeISO();

    const mes = this.mesAtual();

    const pagarAberto = this.contasAbertas();

    const pagarPagas = this.contasPagas();

    const receberAberto = this.receberAberto();

    const receberRecebido = this.receberRecebido();

    const totalPagarAberto = this.soma(pagarAberto);

    const totalReceberAberto = this.soma(receberAberto);

    const pagasMes = pagarPagas.filter(item =>

      String(item.data_pagamento || "").startsWith(mes)

    );

    const recebidasMes = receberRecebido.filter(item =>

      String(item.data_recebimento || "").startsWith(mes)

    );

    const totalPagoMes = this.soma(pagasMes);

    const totalRecebidoMes = this.soma(recebidasMes);

    const vencidas = pagarAberto.filter(item =>

      item.vencimento && item.vencimento < hoje

    );

    const vencidasReceber = receberAberto.filter(item =>

      item.vencimento && item.vencimento < hoje

    );

    const saldoProjetado = totalReceberAberto - totalPagarAberto;

    const lucroMes = totalRecebidoMes - totalPagoMes;

    this.set("dashCEOReceberAberto", this.moeda(totalReceberAberto));

    this.set("dashCEOPagarAberto", this.moeda(totalPagarAberto));

    this.set("dashCEOSaldoProjetado", this.moeda(saldoProjetado));

    this.set("dashCEOLucroMes", this.moeda(lucroMes));

    this.set("dashCEORecebidoMes", this.moeda(totalRecebidoMes));

    this.set("dashCEOPagoMes", this.moeda(totalPagoMes));

    this.set("dashCEOVencidas", this.moeda(this.soma(vencidas)));

    this.set("dashCEOReceberVencido", this.moeda(this.soma(vencidasReceber)));

    this.set("dashCEOQtdPagar", `${pagarAberto.length} conta(s)`);

    this.set("dashCEOQtdReceber", `${receberAberto.length} conta(s)`);

  },

  renderizarAlertas() {

    const hoje = this.hojeISO();

    const pagarVencidas = this.contasAbertas().filter(item =>

      item.vencimento && item.vencimento < hoje

    );

    const receberVencidas = this.receberAberto().filter(item =>

      item.vencimento && item.vencimento < hoje

    );

    const caixaProjetado =

      this.soma(this.receberAberto()) - this.soma(this.contasAbertas());

    let status = "SAUDÁVEL";

    let detalhe = "Nenhum risco crítico identificado.";

    if (caixaProjetado < 0) {

      status = "CRÍTICO";

      detalhe = "Saídas em aberto superam entradas previstas.";

    } else if (pagarVencidas.length > 0) {

      status = "ATENÇÃO";

      detalhe = `${pagarVencidas.length} conta(s) a pagar vencida(s).`;

    } else if (receberVencidas.length > 0) {

      status = "MONITORAR";

      detalhe = `${receberVencidas.length} recebimento(s) vencido(s).`;

    }

    this.set("dashCEOStatus", status);

    this.set("dashCEOStatusDetalhe", detalhe);

    const statusEl = this.get("dashCEOStatus");

    if (statusEl) {

      statusEl.className = "";

      statusEl.classList.add(

        status === "CRÍTICO" ? "status-critico" :

        status === "ATENÇÃO" ? "status-alerta" :

        "status-ok"

      );

    }

  },

  renderizarVencimentos() {

    const tbody = this.get("dashboardCEOVencimentos");

    if (!tbody) return;

    const lista = [...this.contasAbertas()]

      .sort((a, b) => String(a.vencimento || "").localeCompare(String(b.vencimento || "")))

      .slice(0, 10);

    if (!lista.length) {

      tbody.innerHTML = `<tr><td colspan="4" class="muted">Nenhum vencimento em aberto.</td></tr>`;

      return;

    }

    tbody.innerHTML = lista.map(item => `

      <tr>

        <td>${item.fornecedor || "-"}</td>

        <td>${item.documento || "-"}</td>

        <td>${this.dataBR(item.vencimento)}</td>

        <td><strong>${this.moeda(item.valor)}</strong></td>

      </tr>

    `).join("");

  },

  renderizarTopFornecedores() {

    const box = this.get("dashboardCEOTopFornecedores");

    if (!box) return;

    const mapa = {};

    this.contasAbertas().forEach(item => {

      const nome = item.fornecedor || "Sem fornecedor";

      mapa[nome] = (mapa[nome] || 0) + this.numero(item.valor);

    });

    const lista = Object.entries(mapa)

      .sort((a, b) => b[1] - a[1])

      .slice(0, 6);

    if (!lista.length) {

      box.innerHTML = `<p class="muted">Sem dados.</p>`;

      return;

    }

    const maior = lista[0][1] || 1;

    box.innerHTML = lista.map(([nome, valor]) => `

      <div class="dash-line">

        <div>

          <span>${nome}</span>

          <strong>${this.moeda(valor)}</strong>

        </div>

        <div class="dash-progress">

          <div style="width:${Math.max(8, (valor / maior) * 100)}%"></div>

        </div>

      </div>

    `).join("");

  },

  renderizarCategorias() {

    const box = this.get("dashboardCEOCategorias");

    if (!box) return;

    const mapa = {};

    this.contasAbertas().forEach(item => {

      const categoria = item.categoria || "Sem categoria";

      mapa[categoria] = (mapa[categoria] || 0) + this.numero(item.valor);

    });

    const lista = Object.entries(mapa)

      .sort((a, b) => b[1] - a[1])

      .slice(0, 8);

    if (!lista.length) {

      box.innerHTML = `<p class="muted">Sem dados.</p>`;

      return;

    }

    box.innerHTML = lista.map(([categoria, valor]) => `

      <div class="dash-category">

        <span>${categoria}</span>

        <strong>${this.moeda(valor)}</strong>

      </div>

    `).join("");

  },

  montarMeses() {

    const ano = new Date().getFullYear();

    return [

      ["01", "Jan"], ["02", "Fev"], ["03", "Mar"], ["04", "Abr"],

      ["05", "Mai"], ["06", "Jun"], ["07", "Jul"], ["08", "Ago"],

      ["09", "Set"], ["10", "Out"], ["11", "Nov"], ["12", "Dez"]

    ].map(([num, nome]) => {

      const chave = `${ano}-${num}`;

      const recebidos = this.receberRecebido().filter(item =>

        String(item.data_recebimento || item.vencimento || "").startsWith(chave)

      );

      const pagos = this.contasPagas().filter(item =>

        String(item.data_pagamento || item.vencimento || "").startsWith(chave)

      );

      const entradas = this.soma(recebidos);

      const saidas = this.soma(pagos);

      return {

        mes: nome,

        entradas,

        saidas,

        resultado: entradas - saidas

      };

    });

  },

  renderizarGraficoFluxo() {

    const canvas = this.get("chartCEOFluxo");

    if (!canvas || typeof Chart === "undefined") return;

    const dados = this.montarMeses();

    if (this.chartFluxo) this.chartFluxo.destroy();

    this.chartFluxo = new Chart(canvas, {

      data: {

        labels: dados.map(item => item.mes),

        datasets: [

          {

            type: "bar",

            label: "Entradas",

            data: dados.map(item => item.entradas),

            backgroundColor: "#16a34a"

          },

          {

            type: "bar",

            label: "Saídas",

            data: dados.map(item => item.saidas),

            backgroundColor: "#dc2626"

          },

          {

            type: "line",

            label: "Resultado",

            data: dados.map(item => item.resultado),

            borderColor: "#2563eb",

            backgroundColor: "#2563eb",

            borderWidth: 3,

            tension: 0.35

          }

        ]

      },

      options: {

        responsive: true,

        maintainAspectRatio: false

      }

    });

  },

  renderizarGraficoCategorias() {

    const canvas = this.get("chartCEOCategorias");

    if (!canvas || typeof Chart === "undefined") return;

    const mapa = {};

    this.contasAbertas().forEach(item => {

      const categoria = item.categoria || "Sem categoria";

      mapa[categoria] = (mapa[categoria] || 0) + this.numero(item.valor);

    });

    const lista = Object.entries(mapa)

      .sort((a, b) => b[1] - a[1])

      .slice(0, 8);

    if (this.chartCategorias) this.chartCategorias.destroy();

    this.chartCategorias = new Chart(canvas, {

      type: "doughnut",

      data: {

        labels: lista.map(item => item[0]),

        datasets: [

          {

            data: lista.map(item => item[1])

          }

        ]

      },

      options: {

        responsive: true,

        maintainAspectRatio: false

      }

    });

  }

};

window.carregarDashboard = () => dashboardModule.carregar();
