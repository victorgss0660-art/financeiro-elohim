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

  async salvarSaldoConta(conta, valor) {
    try {
      const existente = await api.restGet(
        "saldos_bancarios",
        `select=id,conta,valor&conta=eq.${encodeURIComponent(conta)}&limit=1`
      );

      if (existente.length) {
        await api.restPatch(
          "saldos_bancarios",
          `conta=eq.${encodeURIComponent(conta)}`,
          {
            valor: Number(valor || 0),
            updated_at: new Date().toISOString()
          }
        );
      } else {
        await api.restInsert("saldos_bancarios", [{
          conta,
          valor: Number(valor || 0),
          updated_at: new Date().toISOString()
        }]);
      }
    } catch (e) {
      console.error("Erro ao salvar saldo da conta:", conta, e);
      utils.setAppMsg("Erro ao salvar saldo bancário: " + e.message, "err");
    }
  },

  async carregarSaldosSalvos() {
    try {
      const data = await api.restGet(
        "saldos_bancarios",
        `select=conta,valor`
      );

      const mapa = {};
      data.forEach(item => {
        mapa[item.conta] = Number(item.valor || 0);
      });

      document.querySelectorAll(".saldo-conta").forEach(input => {
        const conta = input.dataset.conta;
        if (!conta) return;

        if (mapa[conta] !== undefined) {
          input.value = mapa[conta];
        }
      });
    } catch (e) {
      console.error("Erro ao carregar saldos bancários:", e);
      utils.setAppMsg("Erro ao carregar saldos bancários: " + e.message, "err");
    }
  },

  registrarEventosSaldos() {
    document.querySelectorAll(".saldo-conta").forEach(input => {
      if (!input.dataset.bindedSaldo) {
        input.addEventListener("change", async () => {
          const conta = input.dataset.conta;
          const valor = Number(input.value || 0);

          if (!conta) return;

          await this.salvarSaldoConta(conta, valor);
          await this.carregarPlanejamento();
        });

        input.dataset.bindedSaldo = "1";
      }
    });
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

  calcularSaldos(semanas, saldoInicial) {
    let saldoRodando = Number(saldoInicial || 0);

    semanas.forEach(semana => {
      saldoRodando += Number(semana.entradas || 0) - Number(semana.saidas || 0);
      semana.saldo = saldoRodando;
    });

    return semanas;
  },

  atualizarResumoCaixa(semanas, saldoInicial) {
    const entradasTotais = semanas.reduce((acc, s) => acc + Number(s.entradas || 0), 0);
    const saidasTotais = semanas.reduce((acc, s) => acc + Number(s.saidas || 0), 0);
    const saldoFinal = saldoInicial + entradasTotais - saidasTotais;
    const menorSaldo = semanas.length
      ? Math.min(...semanas.map(s => Number(s.saldo || 0)))
      : saldoInicial;

    const elSaldoInicial = document.getElementById("cxSaldoInicial");
    const elEntradas = document.getElementById("cxEntradasPrevistas");
    const elSaidas = document.getElementById("cxSaidasPrevistas");
    const elSaldoFinal = document.getElementById("cxSaldoFinal");
    const elMenorSaldo = document.getElementById("cxMenorSaldo");

    if (elSaldoInicial) elSaldoInicial.textContent = utils.moeda(saldoInicial);
    if (elEntradas) elEntradas.textContent = utils.moeda(entradasTotais);
    if (elSaidas) elSaidas.textContent = utils.moeda(saidasTotais);
    if (elSaldoFinal) elSaldoFinal.textContent = utils.moeda(saldoFinal);
    if (elMenorSaldo) elMenorSaldo.textContent = utils.moeda(menorSaldo);
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
      await this.carregarSaldosSalvos();
      this.registrarEventosSaldos();

      const semanas = this.gerarSemanas();
      const saldoInicial = this.calcularSaldoInicial();
      const contasPagar = await this.buscarPagamentosPendentes();
      const contasReceber = await this.buscarRecebimentosPendentes();

      this.encaixarMovimentosNasSemanas(semanas, contasPagar, contasReceber);
      this.calcularSaldos(semanas, saldoInicial);
      this.atualizarResumoCaixa(semanas, saldoInicial);
      this.renderTabela(semanas);
      this.renderIndicadores(semanas);
      this.renderRiscos(semanas);
      this.desenharGrafico(semanas);
    } catch (e) {
      utils.setAppMsg("Erro ao carregar planejamento: " + e.message, "err");
    }
  }
};
