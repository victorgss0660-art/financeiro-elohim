window.dashboardModule = {
  barChart: null,
  pieChart: null,
  lineChart: null,
  rankingChart: null,
  popupChart: null,

  categoriasPadrao: [
    "MC",
    "MP",
    "TERC",
    "FRETE",
    "DESP",
    "TAR",
    "PREST",
    "FOLHA",
    "COMIS",
    "IMPOS",
    "RESC",
    "MANUT"
  ],

  ultimoAnalise: null,

  palette: [
    "#dc2626",
    "#f97316",
    "#fbbf24",
    "#22c55e",
    "#14b8a6",
    "#3b82f6",
    "#6366f1",
    "#8b5cf6",
    "#c026d3",
    "#ec4899",
    "#94a3b8",
    "#64748b"
  ],

  doughnutCenterTextPlugin: {
    id: "doughnutCenterTextPlugin",
    afterDraw(chart, args, pluginOptions) {
      if (chart.config.type !== "doughnut") return;
      const meta = chart.getDatasetMeta(0);
      if (!meta || !meta.data || !meta.data.length) return;

      const { ctx } = chart;
      const x = meta.data[0].x;
      const y = meta.data[0].y;

      const title = pluginOptions?.title || "TOTAL";
      const value = pluginOptions?.value || "";

      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      ctx.fillStyle = "#475569";
      ctx.font = "700 13px Inter, sans-serif";
      ctx.fillText(title, x, y - 14);

      ctx.fillStyle = "#0f172a";
      ctx.font = "800 22px Inter, sans-serif";
      ctx.fillText(value, x, y + 12);
      ctx.restore();
    }
  },

  async carregarDashboard() {
    try {
      const { mes, ano } = this.getMesAnoSeguro();

      const [
        faturamentoMes,
        faturamentoAno,
        gastosMes,
        metasMes,
        gastosAno,
        contasPagar,
        contasReceber
      ] = await Promise.all([
        this.buscarFaturamentoMes(mes, ano),
        this.buscarFaturamentoAno(ano),
        this.buscarGastosMes(mes, ano),
        this.buscarMetasMes(mes, ano),
        this.buscarGastosAno(ano),
        this.buscarContasPagar(),
        this.buscarContasReceber()
      ]);

      const analise = this.processarDados({
        faturamentoMes,
        faturamentoAno,
        gastosMes,
        metasMes,
        gastosAno,
        contasPagar,
        contasReceber,
        mes,
        ano
      });

      this.ultimoAnalise = analise;

      this.renderCards(analise);
      this.renderResumoTabela(analise);
      this.renderTopListas(analise);
      this.renderAlertas(analise);
      this.renderBarChart(analise);
      this.renderPieChart(analise);
      this.renderLineChart(analise);
      this.renderRankingChart(analise);
      this.renderSummaryStrip(analise);
    } catch (error) {
      console.error("Erro ao carregar dashboard:", error);
      if (window.utils?.setAppMsg) {
        utils.setAppMsg("Erro ao carregar dashboard: " + error.message, "err");
      }
    }
  },

  getMesAnoSeguro() {
    if (window.utils?.getMesAno) {
      return utils.getMesAno();
    }

    const mes = document.getElementById("mesSelect")?.value || "Janeiro";
    const ano = Number(document.getElementById("anoSelect")?.value || new Date().getFullYear());
    return { mes, ano };
  },

  numeroParaMes(numero) {
    const meses = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];
    return meses[(Number(numero) || 1) - 1] || "Janeiro";
  },

  normalizarTexto(valor) {
    return String(valor || "").trim().toUpperCase();
  },

  normalizarNumero(valor) {
    if (typeof valor === "number") return Number.isFinite(valor) ? valor : 0;
    if (valor == null) return 0;

    let texto = String(valor).trim();
    if (!texto) return 0;

    texto = texto.replace(/R\$/gi, "").replace(/\s/g, "");

    const temVirgula = texto.includes(",");
    const temPonto = texto.includes(".");

    if (temVirgula && temPonto) {
      texto = texto.replace(/\./g, "").replace(",", ".");
    } else if (temVirgula) {
      texto = texto.replace(",", ".");
    }

    const numero = Number(texto);
    return Number.isFinite(numero) ? numero : 0;
  },

  formatarMoeda(valor) {
    if (window.utils?.moeda) return utils.moeda(valor);
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 2
    }).format(Number(valor || 0));
  },

  formatarMoedaCompacta(valor) {
    const numero = Number(valor || 0);

    if (Math.abs(numero) >= 1000000) {
      return `R$ ${(numero / 1000000).toFixed(2)} mi`;
    }

    if (Math.abs(numero) >= 1000) {
      return `R$ ${(numero / 1000).toFixed(1)} mil`;
    }

    return this.formatarMoeda(numero);
  },

  arredondar(valor, casas = 2) {
    if (window.utils?.arredondar) return utils.arredondar(valor, casas);
    return Number(Number(valor || 0).toFixed(casas));
  },

  getChartBaseOptions() {
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 850,
        easing: "easeOutQuart"
      },
      interaction: {
        mode: "index",
        intersect: false
      },
      plugins: {
        legend: {
          position: "top",
          labels: {
            boxWidth: 12,
            boxHeight: 12,
            usePointStyle: true,
            pointStyle: "circle",
            padding: 18,
            color: "#334155",
            font: {
              size: 12,
              weight: "700"
            }
          }
        },
        tooltip: {
          backgroundColor: "rgba(15,23,42,0.96)",
          titleColor: "#ffffff",
          bodyColor: "#e5e7eb",
          borderColor: "rgba(255,255,255,0.08)",
          borderWidth: 1,
          padding: 12,
          displayColors: true,
          callbacks: {
            label: (context) => {
              const label = context.dataset?.label || "";
              const value = Number(context.parsed?.y ?? context.parsed ?? 0);
              return `${label}: ${this.formatarMoeda(value)}`;
            }
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: "#64748b",
            font: {
              size: 11,
              weight: "700"
            }
          },
          grid: {
            display: false
          },
          border: {
            display: false
          }
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: "#64748b",
            font: {
              size: 11
            },
            callback: (value) => this.formatarMoedaCompacta(value)
          },
          grid: {
            color: "rgba(148,163,184,0.18)"
          },
          border: {
            display: false
          }
        }
      }
    };
  },

  async buscarFaturamentoMes(mes, ano) {
    const data = await api.select("meses", { ano });

    const alvo = (data || []).find(item => {
      const mesItem = String(item.mes || item.nome_mes || "").trim().toLowerCase();
      return mesItem === String(mes).trim().toLowerCase();
    });

    return this.normalizarNumero(
      alvo?.faturamento ??
      alvo?.valor ??
      alvo?.receita ??
      0
    );
  },

  async buscarFaturamentoAno(ano) {
    const data = await api.select("meses", { ano });
    return Array.isArray(data) ? data : [];
  },

  async buscarGastosMes(mes, ano) {
    const data = await api.select("gastos", { ano });
    return (data || []).filter(item => {
      const mesItem = String(item.mes || "").trim().toLowerCase();
      return mesItem === String(mes).trim().toLowerCase();
    });
  },

  async buscarMetasMes(mes, ano) {
    const data = await api.select("metas", { ano });
    return (data || []).filter(item => {
      const mesItem = String(item.mes || "").trim().toLowerCase();
      return mesItem === String(mes).trim().toLowerCase();
    });
  },

  async buscarGastosAno(ano) {
    return await api.select("gastos", { ano });
  },

  async buscarContasPagar() {
    const data = await api.restGet("contas_pagar", "select=*&order=vencimento.asc");
    return Array.isArray(data) ? data : [];
  },

  async buscarContasReceber() {
    const data = await api.restGet("contas_receber", "select=*&order=vencimento.asc");
    return Array.isArray(data) ? data : [];
  },

  processarDados({
    faturamentoMes,
    faturamentoAno,
    gastosMes,
    metasMes,
    gastosAno,
    contasPagar,
    contasReceber,
    mes,
    ano
  }) {
    const categorias = {};

    this.categoriasPadrao.forEach(cat => {
      categorias[cat] = {
        categoria: cat,
        gasto: 0,
        tipoMeta: "percentual",
        percentualMeta: 0,
        valorMeta: 0,
        metaValor: 0,
        diferenca: 0,
        situacao: "Dentro da meta"
      };
    });

    (gastosMes || []).forEach(item => {
      const categoria = this.normalizarTexto(item.categoria || "DESP");
      if (!categorias[categoria]) {
        categorias[categoria] = {
          categoria,
          gasto: 0,
          tipoMeta: "percentual",
          percentualMeta: 0,
          valorMeta: 0,
          metaValor: 0,
          diferenca: 0,
          situacao: "Sem meta"
        };
      }
      categorias[categoria].gasto += this.normalizarNumero(item.valor || 0);
    });

    (metasMes || []).forEach(item => {
      const categoria = this.normalizarTexto(item.categoria || "");
      if (!categoria) return;

      if (!categorias[categoria]) {
        categorias[categoria] = {
          categoria,
          gasto: 0,
          tipoMeta: "percentual",
          percentualMeta: 0,
          valorMeta: 0,
          metaValor: 0,
          diferenca: 0,
          situacao: "Sem meta"
        };
      }

      categorias[categoria].tipoMeta = item.tipo_meta || "percentual";
      categorias[categoria].percentualMeta = this.normalizarNumero(item.percentual_meta || 0);
      categorias[categoria].valorMeta = this.normalizarNumero(item.valor_meta || 0);
    });

    Object.values(categorias).forEach(item => {
      if (item.tipoMeta === "valor") {
        item.metaValor = this.normalizarNumero(item.valorMeta || 0);
      } else {
        item.metaValor = faturamentoMes * (this.normalizarNumero(item.percentualMeta || 0) / 100);
      }

      item.diferenca = item.metaValor - item.gasto;

      if (item.metaValor <= 0) {
        item.situacao = item.gasto > 0 ? "Sem meta cadastrada" : "Sem movimentação";
      } else if (item.gasto > item.metaValor) {
        item.situacao = "Acima da meta";
      } else {
        item.situacao = "Dentro da meta";
      }
    });

    const totalGastosMes = Object.values(categorias).reduce((acc, item) => acc + item.gasto, 0);
    const saldoMes = faturamentoMes - totalGastosMes;
    const metaAtingida = faturamentoMes > 0 ? (saldoMes / faturamentoMes) * 100 : 0;

    const gastosPorMes = {};
    const faturamentoPorMes = {};
    const lucroPorMes = {};

    for (let i = 1; i <= 12; i++) {
      const nomeMes = this.numeroParaMes(i);
      gastosPorMes[nomeMes] = 0;
      faturamentoPorMes[nomeMes] = 0;
      lucroPorMes[nomeMes] = 0;
    }

    (gastosAno || []).forEach(item => {
      const nomeMes = String(item.mes || "").trim();
      if (!nomeMes) return;
      if (!(nomeMes in gastosPorMes)) return;
      gastosPorMes[nomeMes] += this.normalizarNumero(item.valor || 0);
    });

    (faturamentoAno || []).forEach(item => {
      const nomeMes = String(item.mes || item.nome_mes || "").trim();
      if (!nomeMes) return;
      if (!(nomeMes in faturamentoPorMes)) return;
      faturamentoPorMes[nomeMes] += this.normalizarNumero(
        item.faturamento ?? item.valor ?? item.receita ?? 0
      );
    });

    Object.keys(gastosPorMes).forEach(nomeMes => {
      lucroPorMes[nomeMes] = faturamentoPorMes[nomeMes] - gastosPorMes[nomeMes];
    });

    const rankingAnualCategorias = {};
    (gastosAno || []).forEach(item => {
      const categoria = this.normalizarTexto(item.categoria || "DESP");
      rankingAnualCategorias[categoria] = (rankingAnualCategorias[categoria] || 0) + this.normalizarNumero(item.valor || 0);
    });

    const totalFatAno = Object.values(faturamentoPorMes).reduce((a, b) => a + b, 0);
    const totalGasAno = Object.values(gastosPorMes).reduce((a, b) => a + b, 0);
    const totalLucroAno = totalFatAno - totalGasAno;
    const margemAno = totalFatAno > 0 ? (totalLucroAno / totalFatAno) * 100 : 0;

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const contasPagarPendentes = (contasPagar || []).filter(item => {
      return String(item.status || "").toLowerCase() !== "pago";
    });

    const contasReceberPendentes = (contasReceber || []).filter(item => {
      return !["recebido", "pago", "baixado"].includes(String(item.status || "").toLowerCase());
    });

    const contasVencidas = contasPagarPendentes.filter(item => {
      if (!item.vencimento) return false;
      const data = new Date(String(item.vencimento) + "T00:00:00");
      return data < hoje;
    });

    const vencemHoje = contasPagarPendentes.filter(item => {
      if (!item.vencimento) return false;
      const data = new Date(String(item.vencimento) + "T00:00:00");
      return data.getTime() === hoje.getTime();
    });

    const proximos7Dias = contasPagarPendentes.filter(item => {
      if (!item.vencimento) return false;
      const data = new Date(String(item.vencimento) + "T00:00:00");
      const diff = Math.ceil((data - hoje) / 86400000);
      return diff >= 1 && diff <= 7;
    });

    const topPagar = [...contasPagarPendentes]
      .sort((a, b) => this.normalizarNumero(b.valor) - this.normalizarNumero(a.valor))
      .slice(0, 5);

    const topReceber = [...contasReceberPendentes]
      .sort((a, b) => this.normalizarNumero(b.valor) - this.normalizarNumero(a.valor))
      .slice(0, 5);

    const alertas = [];

    if (contasVencidas.length) {
      alertas.push({
        tipo: "critico",
        titulo: `${contasVencidas.length} conta(s) vencida(s)`,
        descricao: `Valor total vencido: ${this.formatarMoeda(contasVencidas.reduce((a, b) => a + this.normalizarNumero(b.valor), 0))}`
      });
    }

    if (vencemHoje.length) {
      alertas.push({
        tipo: "atencao",
        titulo: `${vencemHoje.length} conta(s) vencem hoje`,
        descricao: `Valor total: ${this.formatarMoeda(vencemHoje.reduce((a, b) => a + this.normalizarNumero(b.valor), 0))}`
      });
    }

    if (saldoMes < 0) {
      alertas.push({
        tipo: "critico",
        titulo: "Saldo do mês negativo",
        descricao: `Saldo atual: ${this.formatarMoeda(saldoMes)}`
      });
    }

    const categoriasAcimaMeta = Object.values(categorias).filter(item => item.situacao === "Acima da meta");
    if (categoriasAcimaMeta.length) {
      alertas.push({
        tipo: "atencao",
        titulo: `${categoriasAcimaMeta.length} categoria(s) acima da meta`,
        descricao: categoriasAcimaMeta.map(i => i.categoria).join(", ")
      });
    }

    if (!alertas.length) {
      alertas.push({
        tipo: "ok",
        titulo: "Tudo sob controle",
        descricao: "Nenhum alerta crítico para o período selecionado."
      });
    }

    return {
      mes,
      ano,
      faturamentoMes,
      totalGastosMes,
      saldoMes,
      metaAtingida,
      categorias: Object.values(categorias),
      gastosPorMes,
      faturamentoPorMes,
      lucroPorMes,
      rankingAnualCategorias,
      contasVencidas,
      vencemHoje,
      proximos7Dias,
      topPagar,
      topReceber,
      alertas,
      totalFatAno,
      totalGasAno,
      totalLucroAno,
      margemAno
    };
  },

  renderCards(analise) {
    this.setText("fat", this.formatarMoeda(analise.faturamentoMes));
    this.setText("gas", this.formatarMoeda(analise.totalGastosMes));
    this.setText("saldo", this.formatarMoeda(analise.saldoMes));
    this.setText("metaAtingida", `${this.arredondar(analise.metaAtingida, 2)}%`);
    this.setText("cardVencidas", String(analise.contasVencidas.length));
    this.setText("cardHoje", String(analise.vencemHoje.length));
    this.setText("card7dias", String(analise.proximos7Dias.length));

    const variacao = analise.faturamentoMes > 0
      ? ((analise.saldoMes / analise.faturamentoMes) * 100)
      : 0;

    this.setText("varFat", `${this.arredondar(variacao, 2)}%`);
  },

  renderSummaryStrip(analise) {
    this.setText("dashFatYtd", this.formatarMoeda(analise.totalFatAno));
    this.setText("dashGasYtd", this.formatarMoeda(analise.totalGasAno));
    this.setText("dashLucroYtd", this.formatarMoeda(analise.totalLucroAno));
    this.setText("dashMargemYtd", `${this.arredondar(analise.margemAno, 2)}%`);
  },

  renderResumoTabela(analise) {
    const tbody = document.getElementById("tabelaResumo");
    if (!tbody) return;

    const linhas = analise.categorias
      .filter(item => item.gasto > 0 || item.metaValor > 0)
      .sort((a, b) => b.gasto - a.gasto);

    if (!linhas.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="muted">Nenhum dado carregado.</td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = linhas.map(item => `
      <tr>
        <td>${item.categoria}</td>
        <td>${this.formatarMoeda(item.gasto)}</td>
        <td>${item.tipoMeta === "valor" ? "Valor fixo" : `${this.arredondar(item.percentualMeta, 2)}%`}</td>
        <td>${this.formatarMoeda(item.metaValor)}</td>
        <td class="${item.diferenca >= 0 ? "ok" : "err"}">${this.formatarMoeda(item.diferenca)}</td>
        <td class="${item.situacao === "Acima da meta" ? "err" : "ok"}">${item.situacao}</td>
      </tr>
    `).join("");
  },

  renderTopListas(analise) {
    this.renderListaTop("topPagar", analise.topPagar, "fornecedor", "vencimento");
    this.renderListaTop("topReceber", analise.topReceber, "cliente", "vencimento");
  },

  renderListaTop(elementId, lista, campoNome, campoData) {
    const el = document.getElementById(elementId);
    if (!el) return;

    if (!lista.length) {
      el.innerHTML = `<div class="muted">Nenhum dado disponível.</div>`;
      return;
    }

    el.innerHTML = lista.map(item => `
      <div class="alert-item">
        <strong>${item[campoNome] || "-"}</strong><br>
        ${item.documento || "-"} · ${item.categoria || "-"}<br>
        ${this.formatarMoeda(item.valor || 0)} · ${item[campoData] || "-"}
      </div>
    `).join("");
  },

renderAlertas(analise) {
  const el = document.getElementById("alertList");
  if (!el) return;

  const prioridade = {
    critico: 1,
    atencao: 2,
    ok: 3
  };

  const ordenados = [...analise.alertas].sort(
    (a, b) => prioridade[a.tipo] - prioridade[b.tipo]
  );

  el.innerHTML = ordenados.map(a => `
    <div class="alert-item ${a.tipo}">
      <strong>${a.tipo === "critico" ? "🔴" : a.tipo === "atencao" ? "🟠" : "🟢"} ${a.titulo}</strong><br>
      ${a.descricao}
    </div>
  `).join("");
}

renderBarChart(analise) {
  const canvas = document.getElementById("barChart");
  if (!canvas || typeof Chart === "undefined") return;

  const linhas = this.getSortedCategoryData(analise);

  const labels = linhas.map(i => i.categoria);
  const gastos = linhas.map(i => this.arredondar(i.gasto, 2));
  const metas = linhas.map(i => this.arredondar(i.metaValor, 2));

  const cores = linhas.map(i =>
    i.gasto > i.metaValor ? "#dc2626" : "#22c55e"
  );

  if (this.barChart) this.barChart.destroy();

  this.barChart = new Chart(canvas, {
    data: {
      labels,
      datasets: [
        {
          type: "bar",
          label: "Gasto",
          data: gastos,
          backgroundColor: cores,
          borderRadius: 14,
          maxBarThickness: 38
        },
        {
          type: "line",
          label: "Meta",
          data: metas,
          borderColor: "#2563eb",
          borderWidth: 3,
          tension: 0.4,
          pointRadius: 3
        }
      ]
    },
    options: {
      ...this.getChartBaseOptions(),
      plugins: {
        ...this.getChartBaseOptions().plugins,
        tooltip: {
          callbacks: {
            label: (ctx) => {
              return `${ctx.dataset.label}: ${this.formatarMoeda(ctx.parsed.y)}`;
            }
          }
        }
      }
    }
  });
}

  renderPieChart(analise) {
    const canvas = document.getElementById("pieChart");
    if (!canvas || typeof Chart === "undefined") return;

    const linhas = analise.categorias
      .filter(item => item.gasto > 0)
      .sort((a, b) => b.gasto - a.gasto);

    const labels = linhas.map(item => item.categoria);
    const valores = linhas.map(item => this.arredondar(item.gasto, 2));
    const total = valores.reduce((a, b) => a + b, 0);

    if (this.pieChart) this.pieChart.destroy();

    this.pieChart = new Chart(canvas, {
      type: "doughnut",
      data: {
        labels,
        datasets: [{
          data: valores,
          backgroundColor: labels.map((_, i) => this.palette[i % this.palette.length]),
          borderColor: "#ffffff",
          borderWidth: 3,
          hoverOffset: 10
        }]
      },
      plugins: [this.doughnutCenterTextPlugin],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "66%",
        plugins: {
          legend: {
            position: "right",
            labels: {
              boxWidth: 12,
              boxHeight: 12,
              usePointStyle: true,
              pointStyle: "circle",
              color: "#334155",
              font: {
                size: 12,
                weight: "700"
              }
            }
          },
          tooltip: {
            backgroundColor: "rgba(15,23,42,0.96)",
            titleColor: "#ffffff",
            bodyColor: "#e5e7eb",
            borderColor: "rgba(255,255,255,0.08)",
            borderWidth: 1,
            callbacks: {
              label: (context) => {
                const value = Number(context.parsed || 0);
                const perc = total > 0 ? ((value / total) * 100) : 0;
                return `${context.label}: ${this.formatarMoeda(value)} (${this.arredondar(perc, 2)}%)`;
              }
            }
          },
          doughnutCenterTextPlugin: {
            title: "TOTAL",
            value: this.formatarMoedaCompacta(total)
          }
        }
      }
    });
  },

renderLineChart(analise) {
  const canvas = document.getElementById("lineChart");
  if (!canvas || typeof Chart === "undefined") return;

  const meses = [
    "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
    "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"
  ];

  const gastos = meses.map(m => analise.gastosPorMes[m] || 0);
  const faturamento = meses.map(m => analise.faturamentoPorMes[m] || 0);
  const lucro = meses.map(m => analise.lucroPorMes[m] || 0);

  const mesAtual = new Date().getMonth();

  if (this.lineChart) this.lineChart.destroy();

  this.lineChart = new Chart(canvas, {
    type: "line",
    data: {
      labels: meses,
      datasets: [
        {
          label: "Faturamento",
          data: faturamento,
          borderColor: "#2563eb",
          borderWidth: 3,
          tension: 0.4
        },
        {
          label: "Gastos",
          data: gastos,
          borderColor: "#dc2626",
          borderWidth: 3,
          tension: 0.4
        },
        {
          label: "Lucro",
          data: lucro,
          borderColor: "#16a34a",
          borderWidth: 4,
          tension: 0.4,
          pointRadius: (ctx) => ctx.dataIndex === mesAtual ? 6 : 3
        }
      ]
    },
    options: this.getChartBaseOptions()
  });
}

  renderRankingChart(analise) {
    const canvas = document.getElementById("rankingChart");
    if (!canvas || typeof Chart === "undefined") return;

    const ranking = Object.entries(analise.rankingAnualCategorias)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    const labels = ranking.map(item => item[0]);
    const valores = ranking.map(item => this.arredondar(item[1], 2));

    if (this.rankingChart) this.rankingChart.destroy();

    const options = this.getChartBaseOptions();
    options.indexAxis = "y";
    options.scales.x.ticks.callback = (value) => this.formatarMoedaCompacta(value);

    this.rankingChart = new Chart(canvas, {
      type: "bar",
      data: {
        labels,
        datasets: [{
          label: "Gastos no ano",
          data: valores,
          backgroundColor: labels.map((_, i) => this.palette[i % this.palette.length]),
          borderRadius: 12,
          borderSkipped: false,
          maxBarThickness: 28
        }]
      },
      options
    });
  },

  abrirGraficoFullscreen(chartId, titulo) {
    const popup = document.getElementById("popupGrafico");
    const popupTitulo = document.getElementById("popupGraficoTitulo");
    const popupCanvas = document.getElementById("popupGraficoCanvas");

    if (!popup || !popupTitulo || !popupCanvas || !this.ultimoAnalise) return;

    popupTitulo.textContent = titulo;
    popup.classList.remove("hidden");

    if (this.popupChart) {
      this.popupChart.destroy();
      this.popupChart = null;
    }

    if (chartId === "barChart") {
      const linhas = this.getSortedCategoryData(this.ultimoAnalise);

      this.popupChart = new Chart(popupCanvas, {
        data: {
          labels: linhas.map(item => item.categoria),
          datasets: [
            {
              type: "bar",
              label: "Gasto",
              data: linhas.map(item => this.arredondar(item.gasto, 2)),
              backgroundColor: "rgba(220, 38, 38, 0.82)",
              borderColor: "rgba(153, 27, 27, 1)",
              borderWidth: 1,
              borderRadius: 12,
              borderSkipped: false,
              maxBarThickness: 42
            },
            {
              type: "line",
              label: "Meta",
              data: linhas.map(item => this.arredondar(item.metaValor, 2)),
              borderColor: "rgba(37, 99, 235, 1)",
              backgroundColor: "rgba(37, 99, 235, 0.08)",
              pointBackgroundColor: "rgba(37, 99, 235, 1)",
              pointBorderColor: "#ffffff",
              pointBorderWidth: 2,
              pointRadius: 5,
              borderWidth: 3,
              tension: 0.35
            }
          ]
        },
        options: this.getChartBaseOptions()
      });
      return;
    }

    if (chartId === "pieChart") {
      const linhas = this.ultimoAnalise.categorias
        .filter(item => item.gasto > 0)
        .sort((a, b) => b.gasto - a.gasto);

      const valores = linhas.map(item => this.arredondar(item.gasto, 2));
      const total = valores.reduce((a, b) => a + b, 0);

      this.popupChart = new Chart(popupCanvas, {
        type: "doughnut",
        data: {
          labels: linhas.map(item => item.categoria),
          datasets: [{
            data: valores,
            backgroundColor: linhas.map((_, i) => this.palette[i % this.palette.length]),
            borderColor: "#ffffff",
            borderWidth: 3,
            hoverOffset: 10
          }]
        },
        plugins: [this.doughnutCenterTextPlugin],
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: "68%",
          plugins: {
            legend: {
              position: "right",
              labels: {
                boxWidth: 12,
                boxHeight: 12,
                usePointStyle: true,
                pointStyle: "circle",
                color: "#334155",
                font: {
                  size: 12,
                  weight: "700"
                }
              }
            },
            tooltip: {
              backgroundColor: "rgba(15,23,42,0.96)",
              titleColor: "#ffffff",
              bodyColor: "#e5e7eb",
              callbacks: {
                label: (context) => {
                  const value = Number(context.parsed || 0);
                  const perc = total > 0 ? ((value / total) * 100) : 0;
                  return `${context.label}: ${this.formatarMoeda(value)} (${this.arredondar(perc, 2)}%)`;
                }
              }
            },
            doughnutCenterTextPlugin: {
              title: "TOTAL",
              value: this.formatarMoedaCompacta(total)
            }
          }
        }
      });
      return;
    }

    if (chartId === "lineChart") {
      const ordemMeses = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
      ];

      const options = this.getChartBaseOptions();

      this.popupChart = new Chart(popupCanvas, {
        type: "line",
        data: {
          labels: ordemMeses,
          datasets: [
            {
              label: "Gastos",
              data: ordemMeses.map(m => this.arredondar(this.ultimoAnalise.gastosPorMes[m] || 0, 2)),
              borderColor: "#dc2626",
              backgroundColor: "rgba(220,38,38,0.10)",
              fill: true,
              tension: 0.35,
              pointRadius: 5,
              pointHoverRadius: 7,
              pointBackgroundColor: "#dc2626",
              pointBorderColor: "#fff",
              pointBorderWidth: 2,
              borderWidth: 3
            },
            {
              label: "Faturamento",
              data: ordemMeses.map(m => this.arredondar(this.ultimoAnalise.faturamentoPorMes[m] || 0, 2)),
              borderColor: "#2563eb",
              backgroundColor: "rgba(37,99,235,0.05)",
              fill: false,
              tension: 0.35,
              pointRadius: 5,
              pointHoverRadius: 7,
              pointBackgroundColor: "#2563eb",
              pointBorderColor: "#fff",
              pointBorderWidth: 2,
              borderWidth: 3
            },
            {
              label: "Lucro",
              data: ordemMeses.map(m => this.arredondar(this.ultimoAnalise.lucroPorMes[m] || 0, 2)),
              borderColor: "#16a34a",
              backgroundColor: "rgba(22,163,74,0.10)",
              fill: true,
              tension: 0.35,
              pointRadius: 5,
              pointHoverRadius: 7,
              pointBackgroundColor: "#16a34a",
              pointBorderColor: "#fff",
              pointBorderWidth: 2,
              borderWidth: 3
            }
          ]
        },
        options
      });
      return;
    }

    if (chartId === "rankingChart") {
      const ranking = Object.entries(this.ultimoAnalise.rankingAnualCategorias)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      const options = this.getChartBaseOptions();
      options.indexAxis = "y";
      options.scales.x.ticks.callback = (value) => this.formatarMoedaCompacta(value);

      this.popupChart = new Chart(popupCanvas, {
        type: "bar",
        data: {
          labels: ranking.map(item => item[0]),
          datasets: [{
            label: "Gastos no ano",
            data: ranking.map(item => this.arredondar(item[1], 2)),
            backgroundColor: ranking.map((_, i) => this.palette[i % this.palette.length]),
            borderRadius: 12,
            borderSkipped: false,
            maxBarThickness: 34
          }]
        },
        options
      });
    }
  },

  fecharGraficoFullscreen() {
    const popup = document.getElementById("popupGrafico");
    if (popup) popup.classList.add("hidden");

    if (this.popupChart) {
      this.popupChart.destroy();
      this.popupChart = null;
    }
  },

  setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }
};
