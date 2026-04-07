window.dashboardModule = {
  barChart: null,
  pieChart: null,
  lineChart: null,
  rankingChart: null,
  fullscreenChart: null,
  cacheMeses: [],

  mesesOrdem: [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ],

  mesesCurtos: [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez"
  ],

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

  nomeMesCanonico(valor) {
    const texto = String(valor || "").trim().toLowerCase();

    const mapa = {
      janeiro: "Janeiro",
      fevereiro: "Fevereiro",
      março: "Março",
      marco: "Março",
      abril: "Abril",
      maio: "Maio",
      junho: "Junho",
      julho: "Julho",
      agosto: "Agosto",
      setembro: "Setembro",
      outubro: "Outubro",
      novembro: "Novembro",
      dezembro: "Dezembro",
      jan: "Janeiro",
      fev: "Fevereiro",
      mar: "Março",
      abr: "Abril",
      mai: "Maio",
      jun: "Junho",
      jul: "Julho",
      ago: "Agosto",
      set: "Setembro",
      out: "Outubro",
      nov: "Novembro",
      dez: "Dezembro"
    };

    return mapa[texto] || String(valor || "").trim();
  },

  async carregarDashboard() {
    try {
      const { mes, ano } = utils.getMesAno();

      const [
        faturamento,
        gastosMes,
        metasAno,
        gastosAno,
        mesesAno,
        contasPagar,
        contasReceber
      ] = await Promise.all([
        this.buscarFaturamentoMes(mes, ano),
        this.buscarGastosMes(mes, ano),
        this.buscarMetasAno(ano),
        this.buscarGastosAno(ano),
        this.buscarMesesAno(ano),
        this.buscarContasPagar(),
        this.buscarContasReceber()
      ]);

      this.cacheMeses = mesesAno || [];

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

      this.renderComparativo(mes, ano, faturamentoValor, totalGastos);
      this.renderVencimentos(contasPagar || []);
      this.renderTopContas(contasPagar || [], contasReceber || []);
      this.renderTabelaResumo(gastosPorCategoria, metasMap, faturamentoValor);
      this.renderAlertas(gastosPorCategoria, metasMap, faturamentoValor, saldo);
      this.renderBarChart(gastosPorCategoria, metasMap, faturamentoValor);
      this.renderPieChart(gastosPorCategoria);
      this.renderLineChart(gastosAno, this.cacheMeses);
      this.renderRankingChart(gastosAno);
      this.registrarEventosFullscreen();
    } catch (e) {
      utils.setAppMsg("Erro no dashboard: " + e.message, "err");
      console.error("Dashboard erro:", e);
    }
  },

  async buscarFaturamentoMes(mes, ano) {
    try {
      const data = await api.restGet("meses", "select=*");

      const item = (data || []).find(row =>
        this.nomeMesCanonico(row.mes || row.nome_mes || "") === this.nomeMesCanonico(mes) &&
        Number(row.ano || row.exercicio || 0) === Number(ano)
      );

      return { valor: item ? this.extrairValorMes(item) : 0 };
    } catch (e) {
      console.error("Erro buscarFaturamentoMes:", e);
      return { valor: 0 };
    }
  },

  async buscarMesesAno(ano) {
    try {
      const data = await api.restGet("meses", "select=*");
      return (data || []).filter(item =>
        Number(item.ano || item.exercicio || 0) === Number(ano)
      );
    } catch (e) {
      console.error("Erro buscarMesesAno:", e);
      return [];
    }
  },

  async buscarGastosMes(mes, ano) {
    try {
      const data = await api.restGet("gastos", "select=*");

      return (data || [])
        .filter(item =>
          this.nomeMesCanonico(item.mes || "") === this.nomeMesCanonico(mes) &&
          Number(item.ano || 0) === Number(ano)
        )
        .map(item => ({
          ...item,
          categoria: utils.categoriaCanonica(item.categoria),
          valor: utils.numero(item.valor)
        }));
    } catch (e) {
      console.error("Erro buscarGastosMes:", e);
      return [];
    }
  },

  async buscarGastosAno(ano) {
    try {
      const data = await api.restGet("gastos", "select=*");

      return (data || [])
        .filter(item => Number(item.ano || 0) === Number(ano))
        .map(item => ({
          ...item,
          categoria: utils.categoriaCanonica(item.categoria),
          valor: utils.numero(item.valor),
          mes: this.nomeMesCanonico(item.mes || "")
        }));
    } catch (e) {
      console.error("Erro buscarGastosAno:", e);
      return [];
    }
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
    } catch (e) {
      console.error("Erro buscarMetasAno:", e);
      return [];
    }
  },

  async buscarContasPagar() {
    try {
      const data = await api.restGet("contas_pagar", "select=*");
      return data || [];
    } catch (e) {
      console.error("Erro buscarContasPagar:", e);
      return [];
    }
  },

  async buscarContasReceber() {
    try {
      const data = await api.restGet("contas_receber", "select=*");
      return data || [];
    } catch (e) {
      console.error("Erro buscarContasReceber:", e);
      return [];
    }
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

  renderComparativo(mes, ano, fatAtual) {
    const varFatEl = document.getElementById("varFat");
    if (!varFatEl) return;

    const idx = this.mesesOrdem.indexOf(this.nomeMesCanonico(mes));
    if (idx <= 0) {
      varFatEl.textContent = "0%";
      return;
    }

    const mesAnterior = this.mesesOrdem[idx - 1];

    const registroAnterior = (this.cacheMeses || []).find(item =>
      this.nomeMesCanonico(item.mes || item.nome_mes || "") === mesAnterior &&
      Number(item.ano || item.exercicio || 0) === Number(ano)
    );

    const fatAnterior = registroAnterior ? this.extrairValorMes(registroAnterior) : 0;

    if (!fatAnterior) {
      varFatEl.textContent = "0%";
      return;
    }

    const variacao = ((fatAtual - fatAnterior) / fatAnterior) * 100;
    varFatEl.textContent = `${utils.arredondar(variacao, 1)}%`;
  },

  renderVencimentos(contas) {
    const elVencidas = document.getElementById("cardVencidas");
    const elHoje = document.getElementById("cardHoje");
    const el7dias = document.getElementById("card7dias");

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const em7 = new Date(hoje);
    em7.setDate(hoje.getDate() + 7);

    const vencidas = (contas || []).filter(c => {
      if (!c.vencimento || c.status === "pago") return false;
      const d = new Date(c.vencimento + "T00:00:00");
      return d < hoje;
    });

    const hojeLista = (contas || []).filter(c => {
      if (!c.vencimento || c.status === "pago") return false;
      const d = new Date(c.vencimento + "T00:00:00");
      return d.getTime() === hoje.getTime();
    });

    const proximas = (contas || []).filter(c => {
      if (!c.vencimento || c.status === "pago") return false;
      const d = new Date(c.vencimento + "T00:00:00");
      return d > hoje && d <= em7;
    });

    if (elVencidas) elVencidas.textContent = String(vencidas.length);
    if (elHoje) elHoje.textContent = String(hojeLista.length);
    if (el7dias) el7dias.textContent = String(proximas.length);
  },

  renderTopContas(pagar, receber) {
    const topPagarEl = document.getElementById("topPagar");
    const topReceberEl = document.getElementById("topReceber");

    if (topPagarEl) {
      const lista = [...(pagar || [])]
        .filter(i => i.status !== "pago")
        .sort((a, b) => utils.numero(b.valor) - utils.numero(a.valor))
        .slice(0, 5);

      topPagarEl.innerHTML = lista.length
        ? lista.map(i => `
            <div>
              <strong>${i.fornecedor || "-"}</strong><br>
              ${utils.moeda(i.valor || 0)} · ${i.vencimento || "-"}
            </div>
          `).join("")
        : `<div class="muted">Nenhuma conta encontrada.</div>`;
    }

    if (topReceberEl) {
      const lista = [...(receber || [])]
        .filter(i => i.status !== "recebido")
        .sort((a, b) => utils.numero(b.valor) - utils.numero(a.valor))
        .slice(0, 5);

      topReceberEl.innerHTML = lista.length
        ? lista.map(i => `
            <div>
              <strong>${i.cliente || "-"}</strong><br>
              ${utils.moeda(i.valor || 0)} · ${i.vencimento || "-"}
            </div>
          `).join("")
        : `<div class="muted">Nenhuma conta encontrada.</div>`;
    }
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

renderAlertas(gastos, metas, faturamento, saldo, contasPagar = []) {
  const el = document.getElementById("alertList");
  if (!el) return;

  const alertas = [];

  // 🔴 SALDO NEGATIVO
  if (saldo < 0) {
    alertas.push({
      tipo: "critico",
      titulo: "Saldo negativo",
      texto: `Saldo atual: ${utils.moeda(saldo)}`
    });
  }

  // 🔴 CONTAS VENCIDAS / HOJE / 7 DIAS
  const hoje = new Date();
  hoje.setHours(0,0,0,0);

  const em7 = new Date(hoje);
  em7.setDate(hoje.getDate() + 7);

  let vencidas = 0;
  let hojeCount = 0;
  let proximas = 0;

  (contasPagar || []).forEach(c => {
    if (!c.vencimento || c.status === "pago") return;

    const data = new Date(c.vencimento + "T00:00:00");

    if (data < hoje) vencidas++;
    else if (data.getTime() === hoje.getTime()) hojeCount++;
    else if (data <= em7) proximas++;
  });

  if (vencidas > 0) {
    alertas.push({
      tipo: "critico",
      titulo: "Contas vencidas",
      texto: `${vencidas} contas em atraso`
    });
  }

  if (hojeCount > 0) {
    alertas.push({
      tipo: "atencao",
      titulo: "Vencem hoje",
      texto: `${hojeCount} contas vencem hoje`
    });
  }

  if (proximas > 0) {
    alertas.push({
      tipo: "atencao",
      titulo: "Próximos 7 dias",
      texto: `${proximas} contas a vencer`
    });
  }

  // 📊 METAS
  Object.keys(gastos || {}).forEach(cat => {
    const gasto = utils.numero(gastos[cat]);
    const meta = utils.numero(metas[cat] || 0);

    if (meta > 0 && faturamento > 0) {
      const limite = faturamento * (meta / 100);
      const perc = (gasto / limite) * 100;

      if (perc > 100) {
        alertas.push({
          tipo: "critico",
          titulo: `${cat} acima da meta`,
          texto: `${utils.arredondar(perc,1)}% da meta`
        });
      } else if (perc >= 80) {
        alertas.push({
          tipo: "atencao",
          titulo: `${cat} em atenção`,
          texto: `${utils.arredondar(perc,1)}% da meta`
        });
      } else {
        alertas.push({
          tipo: "ok",
          titulo: `${cat} dentro da meta`,
          texto: `${utils.arredondar(perc,1)}%`
        });
      }
    }
  });

  // 📉 FATURAMENTO CAIU
  const varFatEl = document.getElementById("varFat");
  if (varFatEl) {
    const txt = varFatEl.textContent.replace("%","");
    const val = Number(txt);

    if (!isNaN(val) && val < 0) {
      alertas.push({
        tipo: "atencao",
        titulo: "Faturamento em queda",
        texto: `${val}% vs mês anterior`
      });
    }
  }

  // 🎯 RENDER
  el.innerHTML = alertas.map(a => {
    return `
      <div class="alert-item ${a.tipo}">
        <strong>${a.titulo}</strong><br>
        ${a.texto}
      </div>
    `;
  }).join("");
}
  renderBarChart(gastos, metas, faturamento) {
    const ctx = document.getElementById("barChart");
    if (!ctx) return;
    if (this.barChart) this.barChart.destroy();

    const categorias = utils.getCategorias();
    const dadosGastos = categorias.map(c => utils.numero(gastos[c] || 0));
    const dadosMeta = categorias.map(c => faturamento * (utils.numero(metas[c] || 0) / 100));
    const dadosAlerta = dadosMeta.map(v => v * 0.8);

    const coresPontos = categorias.map((c, i) => {
      const gasto = dadosGastos[i];
      const meta = dadosMeta[i];
      if (meta <= 0) return "#94a3b8";
      return gasto > meta ? "#ef4444" : gasto >= meta * 0.8 ? "#f59e0b" : "#22c55e";
    });

    const coresBarras = categorias.map((c, i) => {
      const gasto = dadosGastos[i];
      const meta = dadosMeta[i];
      if (meta <= 0) return "rgba(59,130,246,0.45)";
      if (gasto > meta) return "rgba(239,68,68,0.45)";
      if (gasto >= meta * 0.8) return "rgba(245,158,11,0.45)";
      return "rgba(59,130,246,0.45)";
    });

    const bordasBarras = categorias.map((c, i) => {
      const gasto = dadosGastos[i];
      const meta = dadosMeta[i];
      if (meta <= 0) return "rgba(59,130,246,0.95)";
      if (gasto > meta) return "rgba(239,68,68,0.95)";
      if (gasto >= meta * 0.8) return "rgba(245,158,11,0.95)";
      return "rgba(59,130,246,0.95)";
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

        const statusIndex = chart.data.datasets.findIndex(ds => ds.label === "Status");
        if (statusIndex === -1) {
          ctx.restore();
          return;
        }

        const metaStatus = chart.getDatasetMeta(statusIndex);
        metaStatus.data.forEach((point, index) => {
          const texto = consumoTexto[index];
          if (!texto) return;
          ctx.fillStyle = coresPontos[index];
          ctx.fillText(texto, point.x, point.y - 12);
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
            backgroundColor: coresBarras,
            borderColor: bordasBarras,
            borderWidth: 1.5,
            borderRadius: 12,
            maxBarThickness: 42
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
            data: dadosGastos,
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
        interaction: { mode: "index", intersect: false },
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
                return `${context.dataset.label}: ${utils.moeda(context.raw || 0)}`;
              }
            }
          }
        },
        scales: {
          x: {
            ticks: { color: "#475569", font: { weight: "600" } },
            grid: { display: false }
          },
          y: {
            beginAtZero: true,
            ticks: {
              color: "#475569",
              callback: value => Number(value).toLocaleString("pt-BR")
            },
            grid: { color: "rgba(148,163,184,0.18)" }
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

    const categorias = Object.keys(gastos || {}).filter(c => utils.numero(gastos[c]) > 0);
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
          borderWidth: 3,
          borderColor: "#ffffff",
          hoverOffset: 10
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "62%",
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              color: "#334155",
              padding: 16,
              usePointStyle: true,
              boxWidth: 12
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const valor = context.raw || 0;
                const percentual = total > 0 ? ((valor / total) * 100).toFixed(1) : "0.0";
                return `${context.label}: ${utils.moeda(valor)} (${percentual}%)`;
              }
            }
          }
        }
      }
    });
  },

  renderLineChart(gastosAno, mesesAno) {
    const ctx = document.getElementById("lineChart");
    if (!ctx) return;
    if (this.lineChart) this.lineChart.destroy();

    const chartCtx = ctx.getContext("2d");

    const gradGastos = chartCtx.createLinearGradient(0, 0, 0, 400);
    gradGastos.addColorStop(0, "rgba(239,68,68,0.30)");
    gradGastos.addColorStop(1, "rgba(239,68,68,0.02)");

    const gradFaturamento = chartCtx.createLinearGradient(0, 0, 0, 400);
    gradFaturamento.addColorStop(0, "rgba(34,197,94,0.22)");
    gradFaturamento.addColorStop(1, "rgba(34,197,94,0.02)");

    const gastosPorMes = this.mesesOrdem.map(mes =>
      utils.totalizar(
        (gastosAno || []).filter(item => this.nomeMesCanonico(item.mes) === mes),
        "valor"
      )
    );

    const faturamentosPorMes = this.mesesOrdem.map(mes => {
      const item = (mesesAno || []).find(row =>
        this.nomeMesCanonico(row.mes || row.nome_mes || "") === mes
      );
      return item ? this.extrairValorMes(item) : 0;
    });

    const lucrosPorMes = this.mesesOrdem.map((mes, i) =>
      utils.numero(faturamentosPorMes[i]) - utils.numero(gastosPorMes[i])
    );

    this.lineChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: this.mesesCurtos,
        datasets: [
          {
            label: "Faturamento",
            data: faturamentosPorMes,
            borderColor: "#22c55e",
            backgroundColor: gradFaturamento,
            fill: true,
            tension: 0.38,
            borderWidth: 3,
            pointRadius: 4,
            pointBackgroundColor: "#ffffff",
            pointBorderColor: "#22c55e",
            pointBorderWidth: 2,
            pointHoverRadius: 7
          },
          {
            label: "Gastos",
            data: gastosPorMes,
            borderColor: "#ef4444",
            backgroundColor: gradGastos,
            fill: true,
            tension: 0.38,
            borderWidth: 3,
            pointRadius: 4,
            pointBackgroundColor: "#ffffff",
            pointBorderColor: "#ef4444",
            pointBorderWidth: 2,
            pointHoverRadius: 7
          },
          {
            label: "Lucro / Saldo",
            data: lucrosPorMes,
            borderColor: "#3b82f6",
            backgroundColor: "rgba(59,130,246,0)",
            fill: false,
            tension: 0.38,
            borderWidth: 3,
            pointRadius: 4,
            pointBackgroundColor: "#ffffff",
            pointBorderColor: "#3b82f6",
            pointBorderWidth: 2,
            pointHoverRadius: 7
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: {
            display: true,
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
                return `${context.dataset.label}: ${utils.moeda(context.raw || 0)}`;
              }
            }
          }
        },
        scales: {
          x: {
            ticks: { color: "#475569", font: { weight: "600" } },
            grid: { display: false }
          },
          y: {
            beginAtZero: true,
            ticks: {
              color: "#475569",
              callback: value => Number(value).toLocaleString("pt-BR")
            },
            grid: { color: "rgba(148,163,184,0.15)" }
          }
        }
      }
    });
  },

  renderRankingChart(gastosAno) {
    const ctx = document.getElementById("rankingChart");
    if (!ctx) return;
    if (this.rankingChart) this.rankingChart.destroy();

    const mapa = utils.somarPorCategoria(gastosAno || [], "categoria", "valor");
    const ranking = Object.entries(mapa).sort((a, b) => b[1] - a[1]);

    this.rankingChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: ranking.map(r => r[0]),
        datasets: [{
          label: "Gasto anual",
          data: ranking.map(r => r[1]),
          borderWidth: 1,
          borderRadius: 10
        }]
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
