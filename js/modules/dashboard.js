window.dashboardModule = {
  gastos: [],
  meses: [],
  metas: [],
  chartFluxo: null,
  chartCategorias: null,
  chartMetaReal: null,

  async carregar() {
    try {
      const gastos = await api.restGet("gastos", "select=*");
      const meses = await api.restGet("meses", "select=*");
      const metas = await api.restGet("metas", "select=*");

      this.gastos = Array.isArray(gastos) ? gastos : [];
      this.meses = Array.isArray(meses) ? meses : [];
      this.metas = Array.isArray(metas) ? metas : [];

      this.renderizar();
    } catch (error) {
      console.error("Erro ao carregar dashboard:", error);
      alert("Erro ao carregar dashboard.");
    }
  },

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

    if (txt.includes(",") && txt.includes(".")) {
      txt = txt.replace(/\./g, "").replace(",", ".");
    } else if (txt.includes(",")) {
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

  mesSelecionado() {
    return this.get("mesSelect")?.value || new Date().toLocaleString("pt-BR", { month: "long" });
  },

  anoSelecionado() {
    return String(this.get("anoSelect")?.value || new Date().getFullYear());
  },

  filtrarMes(lista) {
    const mes = this.mesSelecionado();
    const ano = this.anoSelecionado();

    return lista.filter(item =>
      String(item.mes || "").toLowerCase() === String(mes).toLowerCase() &&
      String(item.ano || "") === ano
    );
  },

  renderizar() {
    const gastosMes = this.filtrarMes(this.gastos);
    const mesesMes = this.filtrarMes(this.meses);
    const metasMes = this.filtrarMes(this.metas);

    const totalGastos = gastosMes.reduce((acc, item) => acc + this.numero(item.valor), 0);

    const faturamento = mesesMes.reduce((acc, item) => {
      return acc + this.numero(item.faturamento);
    }, 0);

    const faturado = mesesMes.reduce((acc, item) => {
      return acc + this.numero(item.faturado);
    }, 0);

    const aFaturar = mesesMes.reduce((acc, item) => {
      return acc + this.numero(item.a_faturar);
    }, 0);

    const lucro = faturamento - totalGastos;
    const margem = faturamento > 0 ? (lucro / faturamento) * 100 : 0;

    this.set("dashCEOReceberAberto", this.moeda(faturamento));
    this.set("dashCEOPagarAberto", this.moeda(totalGastos));
    this.set("dashCEOSaldoProjetado", this.moeda(lucro));
    this.set("dashCEOLucroMes", this.moeda(lucro));

    this.set("dashCEORecebidoMes", this.moeda(faturado));
    this.set("dashCEOPagoMes", this.moeda(totalGastos));
    this.set("dashCEOVencidas", this.moeda(aFaturar));
    this.set("dashCEOReceberVencido", `${margem.toFixed(1)}%`);

    this.set("dashCEOQtdReceber", "Faturamento do mês");
    this.set("dashCEOQtdPagar", `${gastosMes.length} lançamento(s)`);

    this.renderizarStatus(totalGastos, faturamento, lucro, margem);
    this.renderizarTopCategorias(gastosMes);
    this.renderizarCategoriasCards(gastosMes);
    this.renderizarMetaVsReal(gastosMes, metasMes, faturamento);
    this.renderizarGraficoFluxo();
    this.renderizarGraficoCategorias(gastosMes);
    this.renderizarTabelaResumo(gastosMes);
  },

  renderizarStatus(totalGastos, faturamento, lucro, margem) {
    let status = "SAUDÁVEL";
    let detalhe = "Operação dentro do controle esperado.";

    if (faturamento <= 0) {
      status = "SEM FATURAMENTO";
      detalhe = "Informe o faturamento do mês em Inserir Dados.";
    } else if (lucro < 0) {
      status = "CRÍTICO";
      detalhe = "Os gastos do mês estão acima do faturamento.";
    } else if (margem < 10) {
      status = "ATENÇÃO";
      detalhe = "Margem baixa. Revise as principais categorias de gasto.";
    }

    this.set("dashCEOStatus", status);
    this.set("dashCEOStatusDetalhe", detalhe);

    const el = this.get("dashCEOStatus");
    if (el) {
      el.className = "";
      el.classList.add(
        status === "CRÍTICO" ? "status-critico" :
        status === "ATENÇÃO" ? "status-alerta" :
        "status-ok"
      );
    }

    this.set("dashCEODiasCaixa", faturamento > 0 ? `${margem.toFixed(1)}%` : "—");
    this.set("dashCEOFluxoMensal", this.moeda(lucro));
  },

  agruparPorCategoria(gastos) {
    const mapa = {};

    gastos.forEach(item => {
      const categoria = String(item.categoria || "SEM CATEGORIA").toUpperCase();
      mapa[categoria] = (mapa[categoria] || 0) + this.numero(item.valor);
    });

    return mapa;
  },

  renderizarTopCategorias(gastos) {
    const tbody = this.get("dashboardCEOVencimentos");
    if (!tbody) return;

    const mapa = this.agruparPorCategoria(gastos);

    const lista = Object.entries(mapa)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    if (!lista.length) {
      tbody.innerHTML = `<tr><td colspan="4" class="muted">Nenhum gasto importado neste mês.</td></tr>`;
      return;
    }

    tbody.innerHTML = lista.map(([categoria, valor]) => `
      <tr>
        <td><strong>${categoria}</strong></td>
        <td>Gasto importado</td>
        <td>${this.mesSelecionado()}/${this.anoSelecionado()}</td>
        <td><strong>${this.moeda(valor)}</strong></td>
      </tr>
    `).join("");
  },

  renderizarCategoriasCards(gastos) {
    const box = this.get("dashboardCEOCategorias");
    if (!box) return;

    const mapa = this.agruparPorCategoria(gastos);

    const lista = Object.entries(mapa)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    if (!lista.length) {
      box.innerHTML = `<p class="muted">Sem categorias importadas.</p>`;
      return;
    }

    box.innerHTML = lista.map(([categoria, valor]) => `
      <div class="dash-category">
        <span>${categoria}</span>
        <strong>${this.moeda(valor)}</strong>
      </div>
    `).join("");
  },

  renderizarMetaVsReal(gastos, metas, faturamento) {
    const box = this.get("dashboardCEOTopFornecedores");
    if (!box) return;

    const gastosMap = this.agruparPorCategoria(gastos);

    if (!metas.length) {
      box.innerHTML = `<p class="muted">Nenhuma meta cadastrada para este mês.</p>`;
      return;
    }

    box.innerHTML = metas.map(meta => {
      const categoria = String(meta.categoria || "").toUpperCase();
      const percentual = this.numero(meta.percentual_meta);
      const limite = (faturamento * percentual) / 100;
      const real = gastosMap[categoria] || 0;
      const usado = limite > 0 ? (real / limite) * 100 : 0;
      const estourou = limite > 0 && real > limite;

      return `
        <div class="dash-line">
          <div>
            <span>${categoria} — Meta ${percentual}%</span>
            <strong>
              ${this.moeda(real)} / ${this.moeda(limite)}
              ${estourou ? " 🔴" : " 🟢"}
            </strong>
          </div>

          <div class="dash-progress">
            <div style="width:${Math.min(100, Math.max(5, usado))}%; background:${estourou ? "#dc2626" : "#16a34a"};"></div>
          </div>
        </div>
      `;
    }).join("");
  },

  renderizarGraficoFluxo() {
    const canvas = this.get("chartCEOFluxo");
    if (!canvas || typeof Chart === "undefined") return;

    const ano = this.anoSelecionado();

    const mesesOrdem = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];

    const labels = [];
    const faturamentoArr = [];
    const gastosArr = [];
    const lucroArr = [];

    mesesOrdem.forEach(mes => {
      const gastosMes = this.gastos.filter(item =>
        String(item.mes || "").toLowerCase() === mes.toLowerCase() &&
        String(item.ano || "") === ano
      );

      const mesesMes = this.meses.filter(item =>
        String(item.mes || "").toLowerCase() === mes.toLowerCase() &&
        String(item.ano || "") === ano
      );

      const gastos = gastosMes.reduce((acc, item) => acc + this.numero(item.valor), 0);
      const faturamento = mesesMes.reduce((acc, item) => acc + this.numero(item.faturamento), 0);

      labels.push(mes.slice(0, 3));
      faturamentoArr.push(faturamento);
      gastosArr.push(gastos);
      lucroArr.push(faturamento - gastos);
    });

    if (this.chartFluxo) this.chartFluxo.destroy();

    this.chartFluxo = new Chart(canvas, {
      data: {
        labels,
        datasets: [
          {
            type: "bar",
            label: "Faturamento",
            data: faturamentoArr,
            backgroundColor: "#16a34a"
          },
          {
            type: "bar",
            label: "Gastos",
            data: gastosArr,
            backgroundColor: "#dc2626"
          },
          {
            type: "line",
            label: "Lucro",
            data: lucroArr,
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

  renderizarGraficoCategorias(gastos) {
    const canvas = this.get("chartCEOCategorias");
    if (!canvas || typeof Chart === "undefined") return;

    const mapa = this.agruparPorCategoria(gastos);
    const lista = Object.entries(mapa).sort((a, b) => b[1] - a[1]);

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
  },

  renderizarTabelaResumo(gastos) {
    // Mantido separado para futuras expansões.
  }
};

window.carregarDashboard = () => dashboardModule.carregar();
