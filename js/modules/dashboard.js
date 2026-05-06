window.dashboardModule = {
  gastos: [],
  meses: [],
  metas: [],

  chartMeta: null,
  chartDistribuicao: null,
  chartEvolucao: null,

  async carregar() {
    try {
      const gastos = await api.restGet("gastos", "select=*");
      const meses = await api.restGet("meses", "select=*");
      const metas = await api.restGet("metas", "select=*");

      this.gastos = Array.isArray(gastos) ? gastos : [];
      this.meses = Array.isArray(meses) ? meses : [];
      this.metas = Array.isArray(metas) ? metas : [];

      this.renderizar();
    } catch (erro) {
      console.error("Erro ao carregar dashboard:", erro);
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
    const el = this.get("mesSelect");
    return el?.value || "Abril";
  },

  anoSelecionado() {
    const el = this.get("anoSelect");
    return String(el?.value || new Date().getFullYear());
  },

  mesmoMesAno(item, mes, ano) {
    return (
      String(item.mes || "").toLowerCase() === String(mes).toLowerCase() &&
      String(item.ano || "") === String(ano)
    );
  },

  agruparCategorias(lista) {
    const mapa = {};

    lista.forEach((item) => {
      const categoria = String(item.categoria || "OUTROS").trim().toUpperCase();
      mapa[categoria] = (mapa[categoria] || 0) + this.numero(item.valor);
    });

    return mapa;
  },

  renderizar() {
    const mes = this.mesSelecionado();
    const ano = this.anoSelecionado();

    const gastosMes = this.gastos.filter((item) => this.mesmoMesAno(item, mes, ano));
    const mesesMes = this.meses.filter((item) => this.mesmoMesAno(item, mes, ano));
    const metasMes = this.metas.filter((item) => this.mesmoMesAno(item, mes, ano));

    const totalGastos = gastosMes.reduce((acc, item) => acc + this.numero(item.valor), 0);
    const faturamento = mesesMes.reduce((acc, item) => acc + this.numero(item.faturamento), 0);
    const faturado = mesesMes.reduce((acc, item) => acc + this.numero(item.faturado), 0);
    const aFaturar = mesesMes.reduce((acc, item) => acc + this.numero(item.a_faturar), 0);

    const lucro = faturamento - totalGastos;
    const margem = faturamento > 0 ? (lucro / faturamento) * 100 : 0;

    this.set("dashFaturamento", this.moeda(faturamento));
    this.set("dashGastos", this.moeda(totalGastos));
    this.set("dashLucro", this.moeda(lucro));
    this.set("dashMargem", `${margem.toFixed(1)}%`);

    this.set("dashStatus", this.statusTexto(faturamento, lucro, margem));
    this.set("dashStatusDesc", this.statusDescricao(faturamento, lucro, margem));

    this.set("dashCEORecebidoMes", this.moeda(faturado));
    this.set("dashCEOVencidas", this.moeda(aFaturar));

    this.graficoMeta(gastosMes, metasMes, faturamento);
    this.graficoDistribuicao(gastosMes);
    this.graficoEvolucao(ano);
    this.tabelaCategorias(gastosMes);
  },

  statusTexto(faturamento, lucro, margem) {
    if (faturamento <= 0) return "SEM DADOS";
    if (lucro < 0) return "CRÍTICO";
    if (margem < 10) return "ATENÇÃO";
    return "SAUDÁVEL";
  },

  statusDescricao(faturamento, lucro, margem) {
    if (faturamento <= 0) return "Insira o faturamento do mês.";
    if (lucro < 0) return "Os gastos estão acima do faturamento.";
    if (margem < 10) return "Margem baixa. Revise as categorias de gasto.";
    return "Operação dentro do controle esperado.";
  },

  graficoMeta(gastos, metas, faturamento) {
    const ctx = this.get("chartMetaCategoria");
    if (!ctx || typeof Chart === "undefined") return;

    const gastosMap = this.agruparCategorias(gastos);

    let categorias = [];
    let metaValores = [];
    let realValores = [];

    if (metas.length) {
      categorias = metas.map((m) => String(m.categoria || "").toUpperCase());

      metaValores = metas.map((m) => {
        const percentual = this.numero(m.percentual_meta);
        return (faturamento * percentual) / 100;
      });

      realValores = categorias.map((categoria) => gastosMap[categoria] || 0);
    } else {
      categorias = Object.keys(gastosMap);
      realValores = Object.values(gastosMap);
      metaValores = categorias.map(() => 0);
    }

    if (!categorias.length) {
      categorias = ["Sem dados"];
      realValores = [0];
      metaValores = [0];
    }

    if (this.chartMeta) this.chartMeta.destroy();

    this.chartMeta = new Chart(ctx, {
      data: {
        labels: categorias,
        datasets: [
          {
            type: "bar",
            label: "Gasto Real",
            data: realValores,
            backgroundColor: "#dc2626"
          },
          {
            type: "line",
            label: "Meta",
            data: metaValores,
            borderColor: "#16a34a",
            backgroundColor: "#16a34a",
            borderWidth: 3,
            tension: 0.3,
            pointRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });
  },

  graficoDistribuicao(gastos) {
    const ctx = this.get("chartDistribuicao");
    if (!ctx || typeof Chart === "undefined") return;

    const mapa = this.agruparCategorias(gastos);
    let labels = Object.keys(mapa);
    let valores = Object.values(mapa);

    if (!labels.length) {
      labels = ["Sem dados"];
      valores = [1];
    }

    if (this.chartDistribuicao) this.chartDistribuicao.destroy();

    this.chartDistribuicao = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels,
        datasets: [
          {
            data: valores
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });
  },

graficoEvolucao(ano) {
  const ctx = this.get("chartEvolucao");
  if (!ctx || typeof Chart === "undefined") return;

  const mesesNome = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const mesesCurto = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez"
  ];

  const faturamentoArr = [];
  const gastosArr = [];
  const lucroArr = [];

  mesesNome.forEach((mes) => {
    const gastosMes = this.gastos.filter((item) => this.mesmoMesAno(item, mes, ano));
    const mesesMes = this.meses.filter((item) => this.mesmoMesAno(item, mes, ano));

    const gastos = gastosMes.reduce((acc, item) => acc + this.numero(item.valor), 0);
    const faturamento = mesesMes.reduce((acc, item) => acc + this.numero(item.faturamento), 0);

    faturamentoArr.push(faturamento);
    gastosArr.push(gastos);
    lucroArr.push(faturamento - gastos);
  });

  if (this.chartEvolucao) this.chartEvolucao.destroy();

  this.chartEvolucao = new Chart(ctx, {
    type: "line",
    data: {
      labels: mesesCurto,
      datasets: [
        {
          label: "Faturamento",
          data: faturamentoArr,
          borderColor: "#16a34a",
          backgroundColor: "#16a34a",
          borderWidth: 3,
          tension: 0.35,
          pointRadius: 4
        },
        {
          label: "Gastos",
          data: gastosArr,
          borderColor: "#dc2626",
          backgroundColor: "#dc2626",
          borderWidth: 3,
          tension: 0.35,
          pointRadius: 4
        },
        {
          label: "Lucro",
          data: lucroArr,
          borderColor: "#2563eb",
          backgroundColor: "#2563eb",
          borderWidth: 3,
          tension: 0.35,
          pointRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });
},

  tabelaCategorias(gastos) {
    const tbody = this.get("tabelaTopCategorias");
    if (!tbody) return;

    const mapa = this.agruparCategorias(gastos);
    const lista = Object.entries(mapa).sort((a, b) => b[1] - a[1]);

    if (!lista.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="2" class="muted">Nenhum gasto importado neste mês.</td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = lista.map(([categoria, valor]) => `
      <tr>
        <td><strong>${categoria}</strong></td>
        <td>${this.moeda(valor)}</td>
      </tr>
    `).join("");
  }
};
/* ===== DASHBOARD HERO PREMIUM ===== */

.dashboard-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 26px;
  margin-bottom: 24px;
  border-radius: 22px;
  background: linear-gradient(135deg, #111827, #1f2937);
  color: #ffffff;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.18);
}

.dashboard-hero span {
  display: inline-block;
  margin-bottom: 8px;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: #fca5a5;
}

.dashboard-hero h2 {
  font-size: 34px;
  font-weight: 950;
  letter-spacing: -0.8px;
  margin: 0;
}

.dashboard-hero p {
  margin-top: 8px;
  color: #cbd5e1;
  font-weight: 600;
}

.dashboard-filters {
  display: flex;
  gap: 10px;
  align-items: center;
}

.dashboard-filters select,
.dashboard-filters input {
  height: 42px;
  border: 1px solid rgba(255,255,255,.18);
  background: rgba(255,255,255,.08);
  color: #fff;
  border-radius: 12px;
  padding: 0 12px;
  font-weight: 800;
}

.dashboard-filters option {
  color: #111827;
}

.dashboard-filters button {
  height: 42px;
  border-radius: 12px;
  border: none;
  padding: 0 18px;
  background: #dc2626;
  color: #fff;
  font-weight: 900;
  cursor: pointer;
}

@media (max-width: 900px) {
  .dashboard-hero {
    flex-direction: column;
    align-items: flex-start;
  }

  .dashboard-filters {
    width: 100%;
    flex-wrap: wrap;
  }
}
window.carregarDashboard = () => dashboardModule.carregar();
