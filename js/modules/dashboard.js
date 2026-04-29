window.dashboardModule = {
  dados: [],
  chartMensal: null,
  chartCategoria: null,

  get(id) {
    return document.getElementById(id);
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

  mesNumero(nome) {
    const meses = {
      Janeiro: "01",
      Fevereiro: "02",
      Março: "03",
      Abril: "04",
      Maio: "05",
      Junho: "06",
      Julho: "07",
      Agosto: "08",
      Setembro: "09",
      Outubro: "10",
      Novembro: "11",
      Dezembro: "12"
    };

    return meses[nome] || String(new Date().getMonth() + 1).padStart(2, "0");
  },

  getMesAno() {
    return {
      mes: this.get("mesSelect")?.value || "Janeiro",
      ano: String(this.get("anoSelect")?.value || new Date().getFullYear())
    };
  },

  async carregar() {
    try {
      const dados = await api.restGet("contas_pagar", "select=*");

      this.dados = Array.isArray(dados) ? dados : [];

      this.renderizarCards();
      this.renderizarGraficoMensal();
      this.renderizarGraficoCategoria();

    } catch (error) {
      console.error(error);
      alert("Erro ao carregar dashboard.");
    }
  },

  renderizarCards() {
    const { mes, ano } = this.getMesAno();
    const mesNum = this.mesNumero(mes);

    const contasMes = this.dados.filter(item => {
      const data = item.vencimento || item.data_pagamento || "";
      return data.startsWith(`${ano}-${mesNum}`);
    });

    const despesas = contasMes.reduce(
      (acc, item) => acc + this.numero(item.valor),
      0
    );

    const pagas = contasMes.filter(
      item => String(item.status || "").toLowerCase() === "pago"
    );

    const totalPago = pagas.reduce(
      (acc, item) => acc + this.numero(item.valor),
      0
    );

    const abertas = contasMes.filter(
      item => String(item.status || "pendente").toLowerCase() !== "pago"
    );

    const totalAberto = abertas.reduce(
      (acc, item) => acc + this.numero(item.valor),
      0
    );

    if (this.get("dashFaturamento")) this.get("dashFaturamento").textContent = this.moeda(0);
    if (this.get("dashGastos")) this.get("dashGastos").textContent = this.moeda(despesas);
    if (this.get("dashLucro")) this.get("dashLucro").textContent = this.moeda(0 - despesas);
    if (this.get("dashMargem")) this.get("dashMargem").textContent = "0%";

    if (this.get("dashTotalAberto")) this.get("dashTotalAberto").textContent = this.moeda(totalAberto);
    if (this.get("dashPagasMes")) this.get("dashPagasMes").textContent = this.moeda(totalPago);
  },

  montarMesesAno() {
    const { ano } = this.getMesAno();

    const meses = [
      ["01", "Jan"],
      ["02", "Fev"],
      ["03", "Mar"],
      ["04", "Abr"],
      ["05", "Mai"],
      ["06", "Jun"],
      ["07", "Jul"],
      ["08", "Ago"],
      ["09", "Set"],
      ["10", "Out"],
      ["11", "Nov"],
      ["12", "Dez"]
    ];

    return meses.map(([num, nome]) => {
      const contas = this.dados.filter(item => {
        const data = item.vencimento || item.data_pagamento || "";
        return data.startsWith(`${ano}-${num}`);
      });

      const despesas = contas.reduce(
        (acc, item) => acc + this.numero(item.valor),
        0
      );

      return {
        mes: nome,
        faturamento: 0,
        despesas,
        lucro: 0 - despesas
      };
    });
  },

  renderizarGraficoMensal() {
    const canvas = this.get("chartGastosMeta") || this.get("chartEvolucaoMensal");
    if (!canvas || typeof Chart === "undefined") return;

    const dados = this.montarMesesAno();

    if (this.chartMensal) {
      this.chartMensal.destroy();
    }

    this.chartMensal = new Chart(canvas, {
      type: "bar",
      data: {
        labels: dados.map(item => item.mes),
        datasets: [
          {
            label: "Faturamento",
            data: dados.map(item => item.faturamento),
            type: "line",
            borderWidth: 3,
            tension: 0.35
          },
          {
            label: "Despesas",
            data: dados.map(item => item.despesas),
            borderWidth: 1
          },
          {
            label: "Lucro",
            data: dados.map(item => item.lucro),
            type: "line",
            borderWidth: 3,
            tension: 0.35
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "top"
          },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${this.moeda(ctx.raw)}`
            }
          }
        },
        scales: {
          y: {
            ticks: {
              callback: (value) => this.moeda(value)
            }
          }
        }
      }
    });
  },

  renderizarGraficoCategoria() {
    const canvas = this.get("chartCategorias");
    if (!canvas || typeof Chart === "undefined") return;

    const { mes, ano } = this.getMesAno();
    const mesNum = this.mesNumero(mes);

    const mapa = {};

    this.dados.forEach(item => {
      const data = item.vencimento || item.data_pagamento || "";

      if (!data.startsWith(`${ano}-${mesNum}`)) return;

      const categoria = item.categoria || "Sem categoria";
      mapa[categoria] = (mapa[categoria] || 0) + this.numero(item.valor);
    });

    const ranking = Object.entries(mapa)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12);

    if (this.chartCategoria) {
      this.chartCategoria.destroy();
    }

    this.chartCategoria = new Chart(canvas, {
      type: "doughnut",
      data: {
        labels: ranking.map(item => item[0]),
        datasets: [
          {
            label: "Despesas",
            data: ranking.map(item => item[1]),
            borderWidth: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom"
          },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.label}: ${this.moeda(ctx.raw)}`
            }
          }
        }
      }
    });
  }
};

window.carregarDashboard = () => dashboardModule.carregar();
