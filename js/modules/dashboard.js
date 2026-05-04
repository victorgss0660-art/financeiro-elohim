window.dashboardModule = {

  chartMeta: null,
  chartDistribuicao: null,
  chartEvolucao: null,

  async carregar() {
    try {

      const gastos = await api.restGet("gastos", "select=*");
      const meses = await api.restGet("meses", "select=*");
      const metas = await api.restGet("metas", "select=*");

      this.gastos = gastos || [];
      this.meses = meses || [];
      this.metas = metas || [];

      this.renderizar();

    } catch (e) {
      console.error(e);
      alert("Erro ao carregar dashboard");
    }
  },

  numero(v) {
    if (!v) return 0;
    return parseFloat(String(v).replace(",", ".")) || 0;
  },

  moeda(v) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(this.numero(v));
  },

  agruparCategorias(lista) {
    const mapa = {};

    lista.forEach(i => {
      const cat = (i.categoria || "OUTROS").toUpperCase();
      mapa[cat] = (mapa[cat] || 0) + this.numero(i.valor);
    });

    return mapa;
  },

  renderizar() {

    const gastos = this.gastos;
    const meses = this.meses;
    const metas = this.metas;

    const totalGastos = gastos.reduce((a, b) => a + this.numero(b.valor), 0);
    const faturamento = meses.reduce((a, b) => a + this.numero(b.faturamento), 0);

    const lucro = faturamento - totalGastos;
    const margem = faturamento ? (lucro / faturamento) * 100 : 0;

    document.getElementById("dashFaturamento").innerText = this.moeda(faturamento);
    document.getElementById("dashGastos").innerText = this.moeda(totalGastos);
    document.getElementById("dashLucro").innerText = this.moeda(lucro);
    document.getElementById("dashMargem").innerText = margem.toFixed(1) + "%";

    this.status(lucro, margem, faturamento);

    this.graficoDistribuicao(gastos);
    this.graficoMeta(gastos, metas, faturamento);
    this.graficoEvolucao();

    this.tabelaCategorias(gastos);
  },

  status(lucro, margem, faturamento) {
    let status = "SAUDÁVEL";
    let desc = "Operação sob controle";

    if (faturamento === 0) {
      status = "SEM DADOS";
      desc = "Insira faturamento";
    } else if (lucro < 0) {
      status = "CRÍTICO";
      desc = "Prejuízo operacional";
    } else if (margem < 10) {
      status = "ATENÇÃO";
      desc = "Margem baixa";
    }

    document.getElementById("dashStatus").innerText = status;
    document.getElementById("dashStatusDesc").innerText = desc;
  },

  graficoDistribuicao(gastos) {
    const ctx = document.getElementById("chartDistribuicao");

    const mapa = this.agruparCategorias(gastos);

    if (this.chartDistribuicao) this.chartDistribuicao.destroy();

    this.chartDistribuicao = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: Object.keys(mapa),
        datasets: [{
          data: Object.values(mapa)
        }]
      }
    });
  },

graficoMeta(gastos, metas, faturamento) {

  const ctx = document.getElementById("chartMetaCategoria");
  if (!ctx) return;

  const gastosMap = this.agruparCategorias(gastos);

  const categorias = metas.map(m => m.categoria.toUpperCase());

  const metaValores = metas.map(m => {
    return (this.numero(m.percentual_meta) / 100) * faturamento;
  });

  const realValores = categorias.map(cat => gastosMap[cat] || 0);

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
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top"
        }
      }
    }
  });
},

  graficoEvolucao() {
    const ctx = document.getElementById("chartEvolucao");

    const mesesOrdem = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

    const faturamento = [];
    const gastos = [];
    const lucro = [];

    mesesOrdem.forEach((m, i) => {

      const mesNome = [
        "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
        "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"
      ][i];

      const g = this.gastos.filter(x => x.mes === mesNome)
        .reduce((a,b)=>a+this.numero(b.valor),0);

      const f = this.meses.filter(x => x.mes === mesNome)
        .reduce((a,b)=>a+this.numero(b.faturamento),0);

      faturamento.push(f);
      gastos.push(g);
      lucro.push(f-g);
    });

    if (this.chartEvolucao) this.chartEvolucao.destroy();

    this.chartEvolucao = new Chart(ctx, {
      data: {
        labels: mesesOrdem,
        datasets: [
          { type:"bar", label:"Faturamento", data:faturamento },
          { type:"bar", label:"Gastos", data:gastos },
          { type:"line", label:"Lucro", data:lucro }
        ]
      }
    });
  },

  tabelaCategorias(gastos) {
    const tbody = document.getElementById("tabelaTopCategorias");

    const mapa = this.agruparCategorias(gastos);

    const lista = Object.entries(mapa).sort((a,b)=>b[1]-a[1]);

    tbody.innerHTML = lista.map(([cat,val])=>`
      <tr>
        <td>${cat}</td>
        <td>${this.moeda(val)}</td>
      </tr>
    `).join("");
  }

};

window.carregarDashboard = () => dashboardModule.carregar();
