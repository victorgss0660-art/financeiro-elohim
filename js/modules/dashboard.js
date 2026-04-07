window.dashboardModule = {
  barChart: null,
  pieChart: null,
  lineChart: null,
  rankingChart: null,
  fullscreenChart: null,

  extrairValorMes(item) {
    return utils.numero(
      item?.valor ??
      item?.faturamento ??
      item?.receita ??
      0
    );
  },

  extrairMeta(item) {
    return utils.numero(
      item?.percentual_meta ??
      item?.percentual ??
      item?.meta ??
      item?.valor ??
      0
    );
  },

  async carregarDashboard() {
    try {
      const { mes, ano } = utils.getMesAno();

      const [faturamento, gastosMes, metasAno, gastosAno] = await Promise.all([
        this.buscarFaturamentoMes(mes, ano),
        this.buscarGastosMes(mes, ano),
        this.buscarMetasAno(ano),
        this.buscarGastosAno(ano)
      ]);

      const faturamentoValor = faturamento?.valor || 0;
      const totalGastos = utils.totalizar(gastosMes, "valor");
      const saldo = faturamentoValor - totalGastos;
      const metaAtingida = faturamentoValor > 0
        ? (totalGastos / faturamentoValor) * 100
        : 0;

      this.preencherCards({
        faturamento: faturamentoValor,
        gastos: totalGastos,
        saldo,
        metaAtingida
      });

      const metasMap = this.montarMapaMetas(metasAno);
      const gastosPorCategoria = utils.somarPorCategoria(gastosMes, "categoria", "valor");

      this.renderTabelaResumo(gastosPorCategoria, metasMap, faturamentoValor);
      this.renderBarChart(gastosPorCategoria, metasMap, faturamentoValor);
      this.renderPieChart(gastosPorCategoria);
      this.renderLineChart(gastosAno);
      this.renderRankingChart(gastosAno);
      this.renderAlertas(gastosPorCategoria, metasMap, faturamentoValor, saldo);
      this.registrarEventosFullscreen();
    } catch (e) {
      utils.setAppMsg("Erro ao carregar dashboard: " + e.message, "err");
    }
  },

  async buscarFaturamentoMes(mes, ano) {
    try {
      const data = await api.restGet("meses", "select=*");

      const item = (data || []).find(row =>
        String(row.mes || row.nome_mes || "").trim() === String(mes).trim() &&
        Number(row.ano || row.exercicio || 0) === Number(ano)
      );

      return { valor: item ? this.extrairValorMes(item) : 0 };
    } catch {
      return { valor: 0 };
    }
  },

  async buscarGastosMes(mes, ano) {
    const data = await api.restGet("gastos", "select=*");

    return (data || [])
      .filter(item =>
        String(item.mes || "").trim() === String(mes).trim() &&
        Number(item.ano || 0) === Number(ano)
      )
      .map(item => ({
        ...item,
        categoria: utils.categoriaCanonica(item.categoria),
        valor: utils.numero(item.valor)
      }));
  },

  async buscarMetasAno(ano) {
    try {
      const data = await api.restGet("metas", "select=*");

      return (data || [])
        .filter(item => Number(item.ano || item.exercicio || 0) === Number(ano))
        .map(item => ({
          ...item,
          categoria: utils.categoriaCanonica(item.categoria || item.nome || ""),
          percentual_meta: this.extrairMeta(item)
        }));
    } catch {
      return [];
    }
  },

  async buscarGastosAno(ano) {
    const data = await api.restGet("gastos", "select=*");

    return (data || [])
      .filter(item => Number(item.ano || 0) === Number(ano))
      .map(item => ({
        ...item,
        categoria: utils.categoriaCanonica(item.categoria),
        valor: utils.numero(item.valor)
      }));
  },

  montarMapaMetas(metas) {
    const mapa = {};
    (metas || []).forEach(item => {
      mapa[utils.categoriaCanonica(item.categoria)] = utils.numero(item.percentual_meta);
    });
    return mapa;
  },

  preencherCards({ faturamento, gastos, saldo, metaAtingida }) {
    const fat = document.getElementById("fat");
    const gas = document.getElementById("gas");
    const saldoEl = document.getElementById("saldo");
    const metaEl = document.getElementById("metaAtingida");

    if (fat) fat.textContent = utils.moeda(faturamento);
    if (gas) gas.textContent = utils.moeda(gastos);
    if (saldoEl) saldoEl.textContent = utils.moeda(saldo);
    if (metaEl) metaEl.textContent = `${utils.arredondar(metaAtingida, 0)}%`;
  },

  renderTabelaResumo(gastosPorCategoria, metasMap, faturamento) {
    const tbody = document.getElementById("tabelaResumo");
    if (!tbody) return;

    const categorias = utils.getCategorias();

    tbody.innerHTML = categorias.map(cat => {
      const gasto = utils.numero(gastosPorCategoria[cat] || 0);
      const metaPerc = utils.numero(metasMap[cat] || 0);
      const metaValor = faturamento > 0 ? faturamento * (metaPerc / 100) : 0;
      const diferenca = metaValor - gasto;
      const dentroMeta = metaPerc <= 0 ? null : gasto <= metaValor;
      const consumoMeta = metaValor > 0 ? (gasto / metaValor) * 100 : 0;

      return `
        <tr>
          <td>${cat}</td>
          <td>${utils.moeda(gasto)}</td>
          <td>${utils.arredondar(metaPerc, 2)}%</td>
          <td>${utils.moeda(metaValor)}</td>
          <td>${utils.moeda(diferenca)}</td>
          <td class="${dentroMeta === null ? "muted" : dentroMeta ? "ok" : "err"}">
            ${
              dentroMeta === null
                ? "Sem meta"
                : dentroMeta
                  ? `OK (${utils.arredondar(consumoMeta, 1)}%)`
                  : `Acima (${utils.arredondar(consumoMeta, 1)}%)`
            }
          </td>
        </tr>
      `;
    }).join("");
  },

  renderAlertas(gastos, metas, faturamento, saldo) {
    const el = document.getElementById("alertList");
    if (!el) return;

    const alertas = [];

    if (saldo < 0) {
      alertas.push({
        tipo: "err",
        titulo: "Saldo negativo",
        texto: `O período está com saldo de ${utils.moeda(saldo)}.`
      });
    }

    Object.keys(gastos).forEach(cat => {
      const gasto = utils.numero(gastos[cat]);
      const meta = utils.numero(metas[cat] || 0);

      if (meta > 0 && faturamento > 0) {
        const limite = faturamento * (meta / 100);
        const zonaAtencao = limite * 0.8;

        if (gasto > limite) {
          alertas.push({
            tipo: "err",
            titulo: `${cat} acima da meta`,
            texto: `Gasto de ${utils.moeda(gasto)} para uma meta de ${utils.moeda(limite)}.`
          });
        } else if (gasto >= zonaAtencao) {
          alertas.push({
            tipo: "warn",
            titulo: `${cat} em zona de atenção`,
            texto: `A categoria já consumiu ${utils.arredondar((gasto / limite) * 100, 1)}% da meta.`
          });
        }
      }
    });

    if (!alertas.length) {
      el.innerHTML = `<div class="alert-item ok">Tudo sob controle</div>`;
      return;
    }

    el.innerHTML = alertas.map(alerta => `
      <div class="alert-item ${alerta.tipo === "ok" ? "ok" : ""}">
        <strong>${alerta.titulo}</strong><br>
        ${alerta.texto}
      </div>
    `).join("");
  },

  renderBarChart(gastos, metas, faturamento) {
    const ctx = document.getElementById("barChart");
    if (!ctx) return;

    if (this.barChart) this.barChart.destroy();

    const categorias = utils.getCategorias();

    const dadosGastos = categorias.map(c => utils.numero(gastos[c] || 0));
    const dadosMeta = categorias.map(c =>
      faturamento * (utils.numero(metas[c] || 0) / 100)
    );
    const dadosAlerta = dadosMeta.map(v => v * 0.8);

    const pontosStatus = categorias.map((c, i) => dadosGastos[i]);

    const coresPontos = categorias.map((c, i) => {
      const gasto = dadosGastos[i];
      const meta = dadosMeta[i];
      if (meta <= 0) return "#94a3b8";
      return gasto > meta ? "#ef4444" : "#22c55e";
    });

    const consumoTexto = categorias.map((c, i) => {
      const gasto = dadosGastos[i];
      const meta = dadosMeta[i];
      if (meta <= 0) return "";
      return `${utils.arredondar((gasto / meta) * 100, 0)}%`;
    });

    const labelPlugin = {
      id: "metaPercentLabels",
      afterDatasetsDraw: (chart) => {
        const { ctx } = chart;
        ctx.save();
        ctx.font = "bold 11px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";

        const metaDatasetIndex = chart.data.datasets.findIndex(ds => ds.label === "Status");
        if (metaDatasetIndex === -1) {
          ctx.restore();
          return;
        }

        const metaMeta = chart.getDatasetMeta(metaDatasetIndex);

        metaMeta.data.forEach((point, index) => {
          const texto = consumoTexto[index];
          if (!texto) return;

          ctx.fillStyle = coresPontos[index];
          ctx.fillText(texto, point.x, point.y - 10);
        });

        ctx.restore();
      }
    };

    this.barChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: categorias,
        datasets: [
          {
            type: "bar",
            label: "Gastos",
            data: dadosGastos,
            backgroundColor: "rgba(59,130,246,0.45)",
            borderColor: "rgba(59,130,246,0.95)",
            borderWidth: 1.5,
            borderRadius: 10,
            maxBarThickness: 40
          },
          {
            type: "line",
            label: "Meta",
            data: dadosMeta,
            borderColor: "#f43f5e",
            backgroundColor: "#f43f5e",
            tension: 0.35,
            borderWidth: 3,
            pointRadius: 0,
            fill: false
          },
          {
            type: "line",
            label: "Zona de atenção",
            data: dadosAlerta,
            borderColor: "#f59e0b",
            backgroundColor: "#f59e0b",
            tension: 0.35,
            borderWidth: 2,
            borderDash: [8, 6],
            pointRadius: 0,
            fill: false
          },
          {
            type: "line",
            label: "Status",
            data: pontosStatus,
            borderColor: "transparent",
            backgroundColor: coresPontos,
            pointBackgroundColor: coresPontos,
            pointBorderColor: "#ffffff",
            pointBorderWidth: 2,
            pointRadius: 5,
            pointHoverRadius: 7,
            showLine: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: "index",
          intersect: false
        },
        plugins: {
          legend: {
            position: "top",
            labels: {
              color: "#334155",
              usePointStyle: true,
              boxWidth: 12
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const label = context.dataset.label || "";
                const valor = context.raw || 0;
                return `${label}: ${utils.moeda(valor)}`;
              },
              afterBody: function(items) {
                if (!items.length) return "";

                const index = items[0].dataIndex;
                const gasto = dadosGastos[index];
                const meta = dadosMeta[index];

                if (meta <= 0) {
                  return "Sem meta definida";
                }

                const percentual = (gasto / meta) * 100;
                const status = gasto > meta ? "Acima da meta" : "Dentro da meta";

                return [
                  `Status: ${status}`,
                  `Consumo da meta: ${utils.arredondar(percentual, 1)}%`
                ];
              }
            }
          }
        },
        scales: {
          x: {
            ticks: {
              color: "#475569",
              font: {
                weight: "600"
              }
            },
            grid: {
              display: false
            }
          },
          y: {
            beginAtZero: true,
            ticks: {
              color: "#475569",
              callback: function(value) {
                return Number(value).toLocaleString("pt-BR");
              }
            },
            grid: {
              color: "rgba(148,163,184,0.18)"
            }
          }
        }
      },
      plugins: [labelPlugin]
    });
  },

 renderPieChart(gastos) {
  const ctx = document.getElementById("pieChart");
  if (!ctx) return;

  if (this.pieChart) this.pieChart.destroy();

  const categorias = Object.keys(gastos).filter(c => utils.numero(gastos[c]) > 0);
  const valores = categorias.map(c => utils.numero(gastos[c]));

  const total = valores.reduce((a, b) => a + b, 0);

  const cores = [
    "#3b82f6", "#22c55e", "#f59e0b", "#ef4444",
    "#8b5cf6", "#06b6d4", "#84cc16", "#f97316",
    "#ec4899", "#14b8a6", "#6366f1", "#a855f7"
  ];

  this.pieChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: categorias,
      datasets: [{
        data: valores,
        backgroundColor: cores,
        borderWidth: 2,
        borderColor: "#ffffff"
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "60%",
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: "#334155",
            padding: 15,
            usePointStyle: true
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const valor = context.raw;
              const percentual = ((valor / total) * 100).toFixed(1);

              return `${context.label}: ${utils.moeda(valor)} (${percentual}%)`;
            }
          }
        }
      }
    }
  });
}

  renderLineChart(gastosAno) {
    const ctx = document.getElementById("lineChart");
    if (!ctx) return;
    if (this.lineChart) this.lineChart.destroy();

    const meses = [
      "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
      "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"
    ];

    const valores = meses.map(m =>
      utils.totalizar(gastosAno.filter(x => x.mes === m), "valor")
    );

    this.lineChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: meses,
        datasets: [
          {
            label: "Gastos",
            data: valores,
            borderWidth: 3,
            tension: 0.35,
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });
  },

  renderRankingChart(gastosAno) {
    const ctx = document.getElementById("rankingChart");
    if (!ctx) return;
    if (this.rankingChart) this.rankingChart.destroy();

    const mapa = utils.somarPorCategoria(gastosAno, "categoria", "valor");
    const ranking = Object.entries(mapa).sort((a, b) => b[1] - a[1]);

    this.rankingChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: ranking.map(r => r[0]),
        datasets: [
          {
            label: "Gasto anual",
            data: ranking.map(r => r[1]),
            borderWidth: 1
          }
        ]
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false
      }
    });
  },

  registrarEventosFullscreen() {
    document.querySelectorAll(".chart-expand-btn").forEach(btn => {
      if (btn.dataset.binded) return;
      btn.addEventListener("click", () => this.abrirGraficoFullscreen(btn.dataset.chart));
      btn.dataset.binded = "1";
    });

    const closeBtn = document.getElementById("closeChartFullscreen");
    if (closeBtn && !closeBtn.dataset.binded) {
      closeBtn.addEventListener("click", () => this.fecharGraficoFullscreen());
      closeBtn.dataset.binded = "1";
    }
  },

  abrirGraficoFullscreen(chartType) {
    const modal = document.getElementById("chartFullscreenModal");
    const title = document.getElementById("chartFullscreenTitle");
    const canvas = document.getElementById("chartFullscreenCanvas");
    if (!modal || !title || !canvas) return;

    if (this.fullscreenChart) {
      this.fullscreenChart.destroy();
      this.fullscreenChart = null;
    }

    let sourceChart = null;
    let chartTitle = "";

    if (chartType === "bar") {
      sourceChart = this.barChart;
      chartTitle = "Gastos x Meta por Categoria";
    } else if (chartType === "pie") {
      sourceChart = this.pieChart;
      chartTitle = "Distribuição dos Gastos";
    } else if (chartType === "line") {
      sourceChart = this.lineChart;
      chartTitle = "Evolução Mensal";
    } else if (chartType === "ranking") {
      sourceChart = this.rankingChart;
      chartTitle = "Ranking Anual de Categorias";
    }

    if (!sourceChart) return;

    title.textContent = chartTitle;
    modal.classList.remove("hidden");

    const clonedData = JSON.parse(JSON.stringify(sourceChart.data));
    const clonedOptions = JSON.parse(JSON.stringify(sourceChart.options || {}));
    clonedOptions.responsive = true;
    clonedOptions.maintainAspectRatio = false;

    this.fullscreenChart = new Chart(canvas, {
      type: sourceChart.config.type,
      data: clonedData,
      options: clonedOptions
    });
  },

  fecharGraficoFullscreen() {
    const modal = document.getElementById("chartFullscreenModal");
    if (modal) modal.classList.add("hidden");

    if (this.fullscreenChart) {
      this.fullscreenChart.destroy();
      this.fullscreenChart = null;
    }
  }
};
