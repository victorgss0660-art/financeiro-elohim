window.dashboardModule = {
  dados: [],
  chartFinanceiro: null,
  chartCategorias: null,

  get(id) {
    return document.getElementById(id);
  },

  numero(valor) {
    if (typeof valor === "number") return valor;
    if (!valor) return 0;

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

  moeda(v) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(this.numero(v));
  },

  async carregar() {
    try {
      const dados = await api.restGet("contas_pagar", "select=*");

      this.dados = Array.isArray(dados) ? dados : [];

      this.cards();
      this.graficoFinanceiro();
      this.graficoCategorias();

    } catch (e) {
      console.error(e);
      alert("Erro ao carregar dashboard.");
    }
  },

  cards() {
    const hoje = new Date().toISOString().slice(0,10);

    const abertas = this.dados.filter(x =>
      String(x.status || "pendente").toLowerCase() !== "pago"
    );

    const pagas = this.dados.filter(x =>
      String(x.status || "").toLowerCase() === "pago"
    );

    const vencidas = abertas.filter(x =>
      x.vencimento && x.vencimento < hoje
    );

    const totalAberto = abertas.reduce((a,b)=>a+this.numero(b.valor),0);
    const totalPago = pagas.reduce((a,b)=>a+this.numero(b.valor),0);
    const totalVencido = vencidas.reduce((a,b)=>a+this.numero(b.valor),0);

    if(this.get("dashFaturamento")) this.get("dashFaturamento").textContent = this.moeda(totalPago);
    if(this.get("dashGastos")) this.get("dashGastos").textContent = this.moeda(totalAberto);
    if(this.get("dashLucro")) this.get("dashLucro").textContent = this.moeda(totalPago-totalAberto);

    const margem = totalPago > 0
      ? (((totalPago-totalAberto)/totalPago)*100).toFixed(1)
      : 0;

    if(this.get("dashMargem")) this.get("dashMargem").textContent = margem + "%";

    if(this.get("dashVencidas")) this.get("dashVencidas").textContent = this.moeda(totalVencido);
  },

  graficoFinanceiro() {
    const canvas = this.get("chartGastosMeta");
    if (!canvas || typeof Chart === "undefined") return;

    const meses = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

    const pagos = Array(12).fill(0);
    const abertos = Array(12).fill(0);

    this.dados.forEach(item => {
      const data = item.data_pagamento || item.vencimento;
      if (!data) return;

      const mes = Number(data.slice(5,7)) - 1;
      if (mes < 0) return;

      const valor = this.numero(item.valor);

      if(String(item.status || "").toLowerCase()==="pago"){
        pagos[mes]+=valor;
      } else {
        abertos[mes]+=valor;
      }
    });

    if (this.chartFinanceiro) this.chartFinanceiro.destroy();

    this.chartFinanceiro = new Chart(canvas,{
      type:"bar",
      data:{
        labels:meses,
        datasets:[
          {
            label:"Pagas",
            data:pagos
          },
          {
            label:"Em Aberto",
            data:abertos
          }
        ]
      },
      options:{
        responsive:true,
        maintainAspectRatio:false
      }
    });
  },

  graficoCategorias() {
    const canvas = this.get("chartCategorias");
    if (!canvas || typeof Chart === "undefined") return;

    const mapa = {};

    this.dados.forEach(item => {
      const cat = item.categoria || "Outros";
      mapa[cat] = (mapa[cat] || 0) + this.numero(item.valor);
    });

    const labels = Object.keys(mapa);
    const valores = Object.values(mapa);

    if (this.chartCategorias) this.chartCategorias.destroy();

    this.chartCategorias = new Chart(canvas,{
      type:"doughnut",
      data:{
        labels,
        datasets:[
          {
            data:valores
          }
        ]
      },
      options:{
        responsive:true,
        maintainAspectRatio:false
      }
    });
  }
};

window.carregarDashboard = () => dashboardModule.carregar();
