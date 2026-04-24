window.planejamentoModule = {
  chart12Semanas: null,
  chartForecast: null,

  meses: [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ],

  async carregar() {
    try {
      const { mes, ano } = this.getMesAno();
      const anoFiltro = String(ano);

      const [mesesData, gastosAno, contasPagar, contasReceber] = await Promise.all([
        api.select("meses", { ano: anoFiltro }),
        api.select("gastos", { ano: anoFiltro }),
        api.restGet("contas_pagar", "select=*&order=vencimento.asc"),
        api.restGet("contas_receber", "select=*&order=vencimento.asc")
      ]);

      const analise = this.processar({
        mes,
        ano: anoFiltro,
        mesesData: Array.isArray(mesesData) ? mesesData : [],
        gastosAno: Array.isArray(gastosAno) ? gastosAno : [],
        contasPagar: Array.isArray(contasPagar) ? contasPagar : [],
        contasReceber: Array.isArray(contasReceber) ? contasReceber : []
      });

      this.renderCards(analise);
      this.renderForecast(analise);
      this.renderForecastChart(analise);
      this.render12Semanas(analise);
      this.renderTabelaMeses(analise);
      this.renderRadar(analise);
    } catch (error) {
      console.error("Erro ao carregar planejamento:", error);
    }
  },

  getMesAno() {
    if (window.utils?.getMesAno) return utils.getMesAno();

    return {
      mes: document.getElementById("mesSelect")?.value || "Janeiro",
      ano: String(document.getElementById("anoSelect")?.value || new Date().getFullYear())
    };
  },

  numero(v) {
    if (typeof v === "number") return Number.isFinite(v) ? v : 0;
    if (v == null) return 0;

    let txt = String(v).trim();
    if (!txt || txt.toLowerCase() === "null") return 0;

    txt = txt.replace(/R\$/gi, "").replace(/\s/g, "");

    if (txt.includes(",") && txt.includes(".")) {
      txt = txt.replace(/\./g, "").replace(",", ".");
    } else if (txt.includes(",")) {
      txt = txt.replace(",", ".");
    }

    const n = Number(txt);
    return Number.isFinite(n) ? n : 0;
  },

  moeda(v) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(Number(v || 0));
  },

  percentual(v) {
    return `${Number(v || 0).toFixed(2)}%`;
  },

  setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  },

  normalizarMes(valor) {
    const txt = String(valor || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    const mapa = {
      "1": "Janeiro", "01": "Janeiro", jan: "Janeiro", janeiro: "Janeiro",
      "2": "Fevereiro", "02": "Fevereiro", fev: "Fevereiro", fevereiro: "Fevereiro",
      "3": "Março", "03": "Março", mar: "Março", marco: "Março",
      "4": "Abril", "04": "Abril", abr: "Abril", abril: "Abril",
      "5": "Maio", "05": "Maio", mai: "Maio", maio: "Maio",
      "6": "Junho", "06": "Junho", jun: "Junho", junho: "Junho",
      "7": "Julho", "07": "Julho", jul: "Julho", julho: "Julho",
      "8": "Agosto", "08": "Agosto", ago: "Agosto", agosto: "Agosto",
      "9": "Setembro", "09": "Setembro", set: "Setembro", setembro: "Setembro",
      "10": "Outubro", out: "Outubro", outubro: "Outubro",
      "11": "Novembro", nov: "Novembro", novembro: "Novembro",
      "12": "Dezembro", dez: "Dezembro", dezembro: "Dezembro"
    };

    return mapa[txt] || String(valor || "").trim();
  },

  processar({ mes, ano, mesesData, gastosAno, contasPagar, contasReceber }) {
    const mesAtual = this.normalizarMes(mes);

    const registroMes =
      mesesData.find(item =>
        this.normalizarMes(item.mes || item.nome_mes || item.mes_ref) === mesAtual
      ) || {};

    const faturado = this.numero(registroMes.faturado || 0);
    const aFaturar = this.numero(registroMes.a_faturar || 0);

    const previsaoTotal =
      faturado + aFaturar > 0
        ? faturado + aFaturar
        : this.numero(registroMes.faturamento || registroMes.valor || registroMes.receita || 0);

    const gastosMes = gastosAno
      .filter(item => this.normalizarMes(item.mes || item.nome_mes || item.mes_ref) === mesAtual)
      .reduce((acc, item) => acc + this.numero(item.valor), 0);

    const lucroPrevisto = previsaoTotal - gastosMes;
    const margemPrevista = previsaoTotal > 0 ? (lucroPrevisto / previsaoTotal) * 100 : 0;

    const pessimista = {
      faturamento: previsaoTotal * 0.92,
      despesas: gastosMes * 1.08
    };
    pessimista.lucro = pessimista.faturamento - pessimista.despesas;
    pessimista.margem = pessimista.faturamento > 0 ? (pessimista.lucro / pessimista.faturamento) * 100 : 0;

    const realista = {
      faturamento: previsaoTotal,
      despesas: gastosMes
    };
    realista.lucro = realista.faturamento - realista.despesas;
    realista.margem = realista.faturamento > 0 ? (realista.lucro / realista.faturamento) * 100 : 0;

    const otimista = {
      faturamento: previsaoTotal * 1.08,
      despesas: gastosMes * 0.96
    };
    otimista.lucro = otimista.faturamento - otimista.despesas;
    otimista.margem = otimista.faturamento > 0 ? (otimista.lucro / otimista.faturamento) * 100 : 0;

    const planejamentoMeses = this.montarPlanejamentoMeses({ mesesData, gastosAno });

    const fluxo12Semanas = this.montarFluxo12Semanas({
      contasPagar,
      contasReceber
    });

    const risco = this.calcularRisco({
      lucroPrevisto,
      margemPrevista,
      fluxo12Semanas
    });

    return {
      mes: mesAtual,
      ano,
      faturado,
      aFaturar,
      previsaoTotal,
      gastosMes,
      lucroPrevisto,
      margemPrevista,
      pessimista,
      realista,
      otimista,
      planejamentoMeses,
      fluxo12Semanas,
      risco
    };
  },

  montarPlanejamentoMeses({ mesesData, gastosAno }) {
    return this.meses.map(mes => {
      const registro =
        mesesData.find(item =>
          this.normalizarMes(item.mes || item.nome_mes || item.mes_ref) === mes
        ) || {};

      const faturado = this.numero(registro.faturado || 0);
      const aFaturar = this.numero(registro.a_faturar || 0);

      const receita =
        faturado + aFaturar > 0
          ? faturado + aFaturar
          : this.numero(registro.faturamento || registro.valor || registro.receita || 0);

      const despesa = gastosAno
        .filter(item => this.normalizarMes(item.mes || item.nome_mes || item.mes_ref) === mes)
        .reduce((acc, item) => acc + this.numero(item.valor), 0);

      const lucro = receita - despesa;
      const margem = receita > 0 ? (lucro / receita) * 100 : 0;

      return {
        mes,
        receita,
        despesa,
        lucro,
        margem
      };
    });
  },

  montarFluxo12Semanas({ contasPagar, contasReceber }) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const semanas = [];

    for (let i = 0; i < 12; i++) {
      const inicio = new Date(hoje);
      inicio.setDate(hoje.getDate() + i * 7);

      const fim = new Date(inicio);
      fim.setDate(inicio.getDate() + 6);

      const entradas = contasReceber
        .filter(item => this.estaNoPeriodo(item.vencimento, inicio, fim))
        .filter(item => !["recebido", "pago", "baixado"].includes(String(item.status || "").toLowerCase()))
        .reduce((acc, item) => acc + this.numero(item.valor), 0);

      const saidas = contasPagar
        .filter(item => this.estaNoPeriodo(item.vencimento, inicio, fim))
        .filter(item => String(item.status || "").toLowerCase() !== "pago")
        .reduce((acc, item) => acc + this.numero(item.valor), 0);

      semanas.push({
        nome: `S${i + 1}`,
        inicio,
        fim,
        entradas,
        saidas,
        saldo: entradas - saidas
      });
    }

    let acumulado = 0;

    return semanas.map(item => {
      acumulado += item.saldo;
      return {
        ...item,
        acumulado
      };
    });
  },

  estaNoPeriodo(dataValor, inicio, fim) {
    if (!dataValor) return false;

    const data = new Date(String(dataValor) + "T00:00:00");
    if (Number.isNaN(data.getTime())) return false;

    return data >= inicio && data <= fim;
  },

  calcularRisco({ lucroPrevisto, margemPrevista, fluxo12Semanas }) {
    const semanasNegativas = fluxo12Semanas.filter(s => s.acumulado < 0);
    const menorSaldo = fluxo12Semanas.reduce((min, s) => Math.min(min, s.acumulado), 0);

    if (lucroPrevisto < 0 || semanasNegativas.length >= 2) {
      return {
        nivel: "Crítico",
        classe: "forecast-danger",
        mensagem: "Há risco relevante de fechamento negativo ou pressão de caixa nas próximas semanas.",
        menorSaldo,
        semanasNegativas: semanasNegativas.length
      };
    }

    if (margemPrevista < 10 || semanasNegativas.length === 1) {
      return {
        nivel: "Atenção",
        classe: "forecast-warn",
        mensagem: "Margem apertada ou possível oscilação de caixa no curto prazo.",
        menorSaldo,
        semanasNegativas: semanasNegativas.length
      };
    }

    return {
      nivel: "Baixo",
      classe: "forecast-ok",
      mensagem: "Cenário financeiro projetado saudável para o período analisado.",
      menorSaldo,
      semanasNegativas: semanasNegativas.length
    };
  },

  renderCards(a) {
    this.setText("planFatReal", this.moeda(a.faturado));
    this.setText("planAFaturar", this.moeda(a.aFaturar));
    this.setText("planFatTotal", this.moeda(a.previsaoTotal));
    this.setText("planLucroPrev", this.moeda(a.lucroPrevisto));
    this.setText("planMargemPrev", this.percentual(a.margemPrevista));
  },

  renderForecast(a) {
    this.setText("forecastLucro", this.moeda(a.realista.lucro));
    this.setText("forecastMargem", this.percentual(a.realista.margem));
    this.setText("forecastRisco", a.risco.nivel);

    const riscoEl = document.getElementById("forecastRisco");
    if (riscoEl) {
      riscoEl.classList.remove("forecast-ok", "forecast-warn", "forecast-danger");
      riscoEl.classList.add(a.risco.classe);
    }

    this.setText("forecastPessimistaFat", this.moeda(a.pessimista.faturamento));
    this.setText("forecastPessimistaGas", this.moeda(a.pessimista.despesas));
    this.setText("forecastPessimistaLucro", this.moeda(a.pessimista.lucro));
    this.setText("forecastPessimistaMargem", this.percentual(a.pessimista.margem));

    this.setText("forecastRealistaFat", this.moeda(a.realista.faturamento));
    this.setText("forecastRealistaGas", this.moeda(a.realista.despesas));
    this.setText("forecastRealistaLucro", this.moeda(a.realista.lucro));
    this.setText("forecastRealistaMargem", this.percentual(a.realista.margem));

    this.setText("forecastOtimistaFat", this.moeda(a.otimista.faturamento));
    this.setText("forecastOtimistaGas", this.moeda(a.otimista.despesas));
    this.setText("forecastOtimistaLucro", this.moeda(a.otimista.lucro));
    this.setText("forecastOtimistaMargem", this.percentual(a.otimista.margem));
  },

  renderForecastChart(a) {
    const canvas = document.getElementById("forecastChart");
    if (!canvas || typeof Chart === "undefined") return;

    if (this.chartForecast) this.chartForecast.destroy();

    this.chartForecast = new Chart(canvas, {
      data: {
        labels: [a.mes],
        datasets: [
          {
            type: "bar",
            label: "Faturado",
            data: [a.faturado],
            backgroundColor: "#2563eb",
            borderRadius: 14,
            borderSkipped: false,
            stack: "faturamento"
          },
          {
            type: "bar",
            label: "A faturar",
            data: [a.aFaturar],
            backgroundColor: "#f97316",
            borderRadius: 14,
            borderSkipped: false,
            stack: "faturamento"
          },
          {
            type: "line",
            label: "Despesas",
            data: [a.gastosMes],
            borderColor: "#dc2626",
            backgroundColor: "rgba(220,38,38,0.10)",
            borderWidth: 4,
            pointRadius: 6,
            pointBackgroundColor: "#dc2626",
            pointBorderColor: "#fff",
            pointBorderWidth: 2
          },
          {
            type: "line",
            label: "Lucro previsto",
            data: [a.lucroPrevisto],
            borderColor: "#16a34a",
            backgroundColor: "rgba(22,163,74,0.10)",
            borderWidth: 4,
            pointRadius: 6,
            pointBackgroundColor: "#16a34a",
            pointBorderColor: "#fff",
            pointBorderWidth: 2
          }
        ]
      },
      options: this.chartOptions(true)
    });
  },

  render12Semanas(a) {
    const canvas = document.getElementById("planejamento12Semanas");
    if (!canvas || typeof Chart === "undefined") return;

    if (this.chart12Semanas) this.chart12Semanas.destroy();

    this.chart12Semanas = new Chart(canvas, {
      data: {
        labels: a.fluxo12Semanas.map(s => s.nome),
        datasets: [
          {
            type: "bar",
            label: "Entradas",
            data: a.fluxo12Semanas.map(s => s.entradas),
            backgroundColor: "#2563eb",
            borderRadius: 10
          },
          {
            type: "bar",
            label: "Saídas",
            data: a.fluxo12Semanas.map(s => s.saidas),
            backgroundColor: "#dc2626",
            borderRadius: 10
          },
          {
            type: "line",
            label: "Saldo acumulado",
            data: a.fluxo12Semanas.map(s => s.acumulado),
            borderColor: "#16a34a",
            borderWidth: 4,
            pointRadius: 4,
            pointBackgroundColor: "#16a34a",
            pointBorderColor: "#fff",
            pointBorderWidth: 2
          }
        ]
      },
      options: this.chartOptions(false)
    });
  },

  chartOptions(stacked = false) {
    return {
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
          titleColor: "#fff",
          bodyColor: "#e5e7eb",
          callbacks: {
            label: ctx => {
              const label = ctx.dataset.label || "";
              const value = Number(ctx.parsed?.y ?? ctx.parsed ?? 0);
              return `${label}: ${this.moeda(value)}`;
            }
          }
        }
      },
      scales: {
        x: {
          stacked,
          grid: {
            display: false
          }
        },
        y: {
          stacked,
          beginAtZero: true,
          ticks: {
            callback: value => this.moeda(value)
          },
          grid: {
            color: "rgba(148,163,184,0.18)"
          }
        }
      }
    };
  },

  renderTabelaMeses(a) {
    const tbody = document.getElementById("planejamentoTabela");
    if (!tbody) return;

    const linhas = a.planejamentoMeses.filter(item => item.receita > 0 || item.despesa > 0);

    if (!linhas.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="muted">Nenhum dado carregado.</td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = linhas.map(item => `
      <tr>
        <td>${item.mes}</td>
        <td>${this.moeda(item.receita)}</td>
        <td>${this.moeda(item.despesa)}</td>
        <td class="${item.lucro >= 0 ? "ok" : "err"}">${this.moeda(item.lucro)}</td>
        <td class="${item.margem >= 10 ? "ok" : "err"}">${this.percentual(item.margem)}</td>
      </tr>
    `).join("");
  },

  renderRadar(a) {
    const el = document.getElementById("radarFinanceiro");
    if (!el) return;

    const itens = [];

    itens.push({
      tipo: a.risco.nivel === "Crítico" ? "critico" : a.risco.nivel === "Atenção" ? "atencao" : "ok",
      titulo: `Risco ${a.risco.nivel}`,
      desc: a.risco.mensagem
    });

    if (a.risco.semanasNegativas > 0) {
      itens.push({
        tipo: "atencao",
        titulo: `${a.risco.semanasNegativas} semana(s) com saldo acumulado negativo`,
        desc: `Menor saldo projetado: ${this.moeda(a.risco.menorSaldo)}`
      });
    }

    const maiorSaida = a.fluxo12Semanas.reduce((max, s) => Math.max(max, s.saidas), 0);

    if (maiorSaida > 0) {
      itens.push({
        tipo: "ok",
        titulo: "Maior semana de saída prevista",
        desc: `Pico de pagamentos: ${this.moeda(maiorSaida)}`
      });
    }

    el.innerHTML = itens.map(item => `
      <div class="alert-item ${item.tipo}">
        <strong>${item.tipo === "critico" ? "🔴" : item.tipo === "atencao" ? "🟠" : "🟢"} ${item.titulo}</strong><br>
        ${item.desc}
      </div>
    `).join("");
  }
};
