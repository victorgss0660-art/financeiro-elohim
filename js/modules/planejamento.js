window.planejamentoModule = {
  planejamentoChart: null,

  gerarSemanas() {
    const semanas = [];
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    for (let i = 0; i < 12; i++) {
      const inicio = new Date(hoje);
      inicio.setDate(hoje.getDate() + (i * 7));

      const fim = new Date(inicio);
      fim.setDate(inicio.getDate() + 6);
      fim.setHours(23, 59, 59, 999);

      semanas.push({
        numero: i + 1,
        inicio,
        fim,
        entradas: 0,
        saidas: 0,
        saldo: 0
      });
    }

    return semanas;
  },

  calcularSaldoInicial() {
    let total = 0;
    document.querySelectorAll(".saldo-conta").forEach(input => {
      total += Number(input.value || 0);
    });

    const badge = document.getElementById("totalDisponivelBadge");
    if (badge) {
      badge.textContent = `Total disponível: ${utils.moeda(total)}`;
    }

    return total;
  },

  async buscarPagamentosPendentes() {
    return await api.restGet(
      "contas_pagar",
      `select=*&status=eq.pendente&order=vencimento.asc`
    );
  },

  async buscarRecebimentosPendentes() {
    return await api.restGet(
      "contas_receber",
      `select=*&status=eq.pendente&order=vencimento.asc`
    );
  },

  encaixarMovimentosNasSemanas(semanas, contasPagar, contasReceber) {
    contasPagar.forEach(conta => {
      if (!conta.vencimento) return;
      const venc = new Date(conta.vencimento + "T00:00:00");

      semanas.forEach(semana => {
        if (venc >= semana.inicio && venc <= semana.fim) {
          semana.saidas += Number(conta.valor || 0);
        }
      });
    });

    contasReceber.forEach(conta => {
      if (!conta.vencimento) return;
      const venc = new Date(conta.vencimento + "T00:00:00");

      semanas.forEach(semana => {
        if (venc >= semana.inicio && venc <= semana.fim) {
          semana.entradas += Number(conta.valor || 0);
        }
      });
    });
  },

  calcularSaldos(semanas) {
    let saldoRodando = this.calcularSaldoInicial();

    semanas.forEach(semana => {
      saldoRodando += Number(semana.entradas || 0) - Number(semana.saidas || 0);
      semana.saldo = saldoRodando;
    });

    return semanas;
  },

  renderTabela(semanas) {
    const tbody = document.getElementById("tabelaPlanejamento");
    if (!tbody) return;

    if (!semanas.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" class="muted">Nenhum planejamento disponível.</td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = semanas.map(semana => `
      <tr>
        <td>
          <strong>Semana ${semana.numero}</strong><br>
          <span class="muted">
            ${semana.inicio.toLocaleDateString("pt-BR")} até ${semana.fim.toLocaleDateString("pt-BR")}
          </span>
        </td>
        <td>${utils.moeda(semana.entradas)}</td>
        <td>${utils.moeda(semana.saidas)}</td>
        <td class="${semana.saldo >= 0 ? "ok" : "err"}">${utils.moeda(semana.saldo)}</td>
      </tr>
    `).join("");
  },

  renderIndicadores(semanas) {
    if (!semanas.length) return;

    const menorSaldo = Math.min(...semanas.map(s => s.saldo));
    const semanasNegativas = semanas.filter(s => s.saldo < 0).length;
    const maiorSaida = Math.max(...semanas.map(s => s.saidas));

    const riskMenorSaldo = document.getElementById("riskMenorSaldo");
    const riskSemanasNegativas = document.getElementById("riskSemanasNegativas");
    const riskMaiorSaida = document.getElementById("riskMaiorSaida");

    if (riskMenorSaldo) riskMenorSaldo.textContent = utils.moeda(menorSaldo);
    if (riskSemanasNegativas) riskSemanasNegativas.textContent = String(semanasNegativas);
    if (riskMaiorSaida) riskMaiorSaida.textContent = utils.moeda(maiorSaida);
  },

  renderRiscos(semanas) {
    const riskList = document.getElementById("riskList");
    if (!riskList) return;

    const negativos = semanas.filter(s => s.saldo < 0);

    if (!negativos.length) {
      riskList.innerHTML = `
        <div class="alert-item ok">
          <strong>Sem risco crítico.</strong><br>
          O fluxo projetado está saudável nas próximas 12 semanas.
        </div>
      `;
      return;
    }

    riskList.innerHTML = negativos.map(semana => `
      <div class="alert-item">
        <strong>Semana ${semana.numero}</strong><br>
        Saldo projetado negativo em ${utils.moeda(semana.saldo)}
      </div>
    `).join("");
  },

  desenharGrafico(semanas) {
    const canvas = document.getElementById("planejamentoChart");
    if (!canvas) return;

    const labels = semanas.map(s => `S${s.numero}`);
    const entradas = semanas.map(s => s.entradas);
    const saidas = semanas.map(s => s.saidas);
    const saldos = semanas.map(s => s.saldo);

    if (this.planejamentoChart) {
      this.planejamentoChart.destroy();
    }

    this.planejamentoChart = new Chart(canvas, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Entradas",
            data: entradas,
            borderWidth: 2,
            tension: 0.35,
            fill: false
          },
          {
            label: "Saídas",
            data: saidas,
            borderWidth: 2,
            tension: 0.35,
            fill: false
          },
          {
            label: "Saldo Projetado",
            data: saldos,
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

  async carregarPlanejamento() {
    try {
      const semanas = this.gerarSemanas();
      const contasPagar = await this.buscarPagamentosPendentes();
      const contasReceber = await this.buscarRecebimentosPendentes();

      this.encaixarMovimentosNasSemanas(semanas, contasPagar, contasReceber);
      this.calcularSaldos(semanas);
      this.renderTabela(semanas);
      this.renderIndicadores(semanas);
      this.renderRiscos(semanas);
      this.desenharGrafico(semanas);
    } catch (e) {
      utils.setAppMsg("Erro ao carregar planejamento: " + e.message, "err");
    }
  }
};
