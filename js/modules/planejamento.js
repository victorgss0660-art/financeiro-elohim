window.planejamentoModule = {
  planejamentoChart: null,

  saldos: {
    sicoob: 0,
    nubank: 0,
    metos: 0,
    portal: 0,
    monkey: 0,
    citibank: 0,
    dinheiro: 0
  },

  async carregarSaldosBancarios() {
    try {
      const data = await api.restGet(
        "saldos_bancarios",
        "select=*"
      );

      const mapa = {
        sicoob: 0,
        nubank: 0,
        metos: 0,
        portal: 0,
        monkey: 0,
        citibank: 0,
        dinheiro: 0
      };

      (data || []).forEach(item => {
        const conta = String(item.conta || "").trim().toLowerCase();
        if (conta in mapa) {
          mapa[conta] = utils.numero(item.saldo || 0);
        }
      });

      this.saldos = mapa;
      this.preencherCamposSaldos();
      this.atualizarTotalDisponivel();
    } catch (e) {
      console.error("Erro ao carregar saldos bancários:", e);
      utils.setAppMsg("Erro ao carregar saldos bancários: " + e.message, "err");
    }
  },

  preencherCamposSaldos() {
    document.querySelectorAll(".saldo-conta").forEach(input => {
      const conta = input.dataset.conta;
      if (!conta) return;
      input.value = this.saldos[conta] ?? 0;
    });
  },

  lerCamposSaldos() {
    const novos = {
      sicoob: 0,
      nubank: 0,
      metos: 0,
      portal: 0,
      monkey: 0,
      citibank: 0,
      dinheiro: 0
    };

    document.querySelectorAll(".saldo-conta").forEach(input => {
      const conta = input.dataset.conta;
      if (!conta) return;
      novos[conta] = utils.numero(input.value || 0);
    });

    this.saldos = novos;
  },

  getSaldoInicial() {
    return Object.values(this.saldos).reduce((acc, val) => acc + utils.numero(val), 0);
  },

  atualizarTotalDisponivel() {
    const badge = document.getElementById("totalDisponivelBadge");
    if (badge) {
      badge.textContent = `Total disponível: ${utils.moeda(this.getSaldoInicial())}`;
    }
  },

  async salvarSaldosBancarios() {
    try {
      this.lerCamposSaldos();
      this.atualizarTotalDisponivel();

      const existentes = await api.restGet("saldos_bancarios", "select=*");

      for (const [conta, saldo] of Object.entries(this.saldos)) {
        const registroExistente = (existentes || []).find(item =>
          String(item.conta || "").trim().toLowerCase() === conta
        );

        const payload = {
          conta,
          saldo: utils.numero(saldo)
        };

        if (registroExistente?.id) {
          await api.restPatch("saldos_bancarios", `id=eq.${registroExistente.id}`, payload);
        } else {
          await api.restInsert("saldos_bancarios", [payload]);
        }
      }

      utils.setAppMsg("Saldos bancários salvos com sucesso.", "ok");
      await this.carregarSaldosBancarios();
      await this.carregarPlanejamento();
    } catch (e) {
      console.error("Erro ao salvar saldos bancários:", e);
      utils.setAppMsg("Erro ao salvar saldos bancários: " + e.message, "err");
    }
  },

  async carregarPlanejamento() {
    try {
      const tab = document.getElementById("tab-planejamento");
      if (!tab || !tab.classList.contains("active")) return;

      const saldoInicial = this.getSaldoInicial();

      const [contasPagar, contasReceber] = await Promise.all([
        this.buscarContasPagarPendentes(),
        this.buscarContasReceberPendentes()
      ]);

      const semanas = this.montarPlanejamento12Semanas(
        contasPagar,
        contasReceber,
        saldoInicial
      );

      this.renderResumoPlanejamento(semanas, saldoInicial);
      this.renderTabelaPlanejamento(semanas);
      this.renderRiscos(semanas);

      if (typeof Chart !== "undefined") {
        this.renderPlanejamentoChart(semanas);
      } else {
        console.warn("Chart.js não carregado no planejamento.");
      }
    } catch (e) {
      console.error("Erro ao carregar planejamento:", e);
      utils.setAppMsg("Erro ao carregar planejamento: " + e.message, "err");
    }
  },

  async buscarContasPagarPendentes() {
    try {
      const data = await api.restGet(
        "contas_pagar",
        "select=*&status=neq.pago&order=vencimento.asc"
      );
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.error("Erro ao buscar contas a pagar:", e);
      return [];
    }
  },

  async buscarContasReceberPendentes() {
    try {
      const data = await api.restGet(
        "contas_receber",
        "select=*&status=neq.recebido&order=vencimento.asc"
      );
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.error("Erro ao buscar contas a receber:", e);
      return [];
    }
  },

  montarPlanejamento12Semanas(contasPagar, contasReceber, saldoInicial) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const semanas = [];
    let saldoCorrente = utils.numero(saldoInicial);

    for (let i = 0; i < 12; i++) {
      const inicio = new Date(hoje);
      inicio.setDate(hoje.getDate() + i * 7);

      const fim = new Date(inicio);
      fim.setDate(inicio.getDate() + 6);

      const entradasLista = (contasReceber || []).filter(item => {
        if (!item.vencimento) return false;
        const d = new Date(item.vencimento + "T00:00:00");
        return d >= inicio && d <= fim;
      });

      const saidasLista = (contasPagar || []).filter(item => {
        if (!item.vencimento) return false;
        const d = new Date(item.vencimento + "T00:00:00");
        return d >= inicio && d <= fim;
      });

      const entradas = entradasLista.reduce(
        (acc, item) => acc + utils.numero(item.valor || 0),
        0
      );

      const saidas = saidasLista.reduce(
        (acc, item) => acc + utils.numero(item.valor || 0),
        0
      );

      saldoCorrente = saldoCorrente + entradas - saidas;

      semanas.push({
        numero: i + 1,
        entradas,
        saidas,
        saldo: saldoCorrente
      });
    }

    return semanas;
  },

  renderResumoPlanejamento(semanas, saldoInicial) {
    const elSaldoInicial = document.getElementById("cxSaldoInicial");
    const elEntradas = document.getElementById("cxEntradasPrevistas");
    const elSaidas = document.getElementById("cxSaidasPrevistas");
    const elSaldoFinal = document.getElementById("cxSaldoFinal");
    const elMenorSaldo = document.getElementById("cxMenorSaldo");

    const totalEntradas = semanas.reduce((acc, s) => acc + utils.numero(s.entradas), 0);
    const totalSaidas = semanas.reduce((acc, s) => acc + utils.numero(s.saidas), 0);
    const saldoFinal = semanas.length
      ? utils.numero(semanas[semanas.length - 1].saldo)
      : utils.numero(saldoInicial);
    const menorSaldo = semanas.length
      ? Math.min(...semanas.map(s => utils.numero(s.saldo)))
      : utils.numero(saldoInicial);

    if (elSaldoInicial) elSaldoInicial.textContent = utils.moeda(saldoInicial);
    if (elEntradas) elEntradas.textContent = utils.moeda(totalEntradas);
    if (elSaidas) elSaidas.textContent = utils.moeda(totalSaidas);
    if (elSaldoFinal) elSaldoFinal.textContent = utils.moeda(saldoFinal);
    if (elMenorSaldo) elMenorSaldo.textContent = utils.moeda(menorSaldo);
  },

  renderTabelaPlanejamento(semanas) {
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
        <td>Semana ${semana.numero}</td>
        <td>${utils.moeda(semana.entradas)}</td>
        <td>${utils.moeda(semana.saidas)}</td>
        <td class="${semana.saldo < 0 ? "err" : "ok"}">${utils.moeda(semana.saldo)}</td>
      </tr>
    `).join("");
  },

  renderRiscos(semanas) {
    const elMenorSaldo = document.getElementById("riskMenorSaldo");
    const elSemanasNegativas = document.getElementById("riskSemanasNegativas");
    const elMaiorSaida = document.getElementById("riskMaiorSaida");
    const riskList = document.getElementById("riskList");

    if (!semanas.length) {
      if (riskList) {
        riskList.innerHTML = `<div class="muted">Nenhum risco calculado.</div>`;
      }
      return;
    }

    const menorSaldo = Math.min(...semanas.map(s => utils.numero(s.saldo)));
    const semanasNegativas = semanas.filter(s => utils.numero(s.saldo) < 0);
    const maiorSaida = Math.max(...semanas.map(s => utils.numero(s.saidas)));

    if (elMenorSaldo) elMenorSaldo.textContent = utils.moeda(menorSaldo);
    if (elSemanasNegativas) elSemanasNegativas.textContent = String(semanasNegativas.length);
    if (elMaiorSaida) elMaiorSaida.textContent = utils.moeda(maiorSaida);

    if (riskList) {
      const riscos = [];

      semanasNegativas.forEach(semana => {
        riscos.push(`
          <div class="alert-item critico">
            <strong>Semana ${semana.numero}</strong><br>
            Saldo projetado negativo em ${utils.moeda(semana.saldo)}
          </div>
        `);
      });

      if (!riscos.length) {
        riscos.push(`
          <div class="alert-item ok">
            <strong>Planejamento saudável</strong><br>
            Nenhum risco relevante identificado.
          </div>
        `);
      }

      riskList.innerHTML = riscos.join("");
    }
  },

  renderPlanejamentoChart(semanas) {
    const canvas = document.getElementById("planejamentoChart");
    if (!canvas || typeof Chart === "undefined") return;

    if (this.planejamentoChart) {
      this.planejamentoChart.destroy();
      this.planejamentoChart = null;
    }

    const labels = semanas.map(s => `Semana ${s.numero}`);
    const entradas = semanas.map(s => utils.numero(s.entradas));
    const saidas = semanas.map(s => utils.numero(s.saidas));
    const saldos = semanas.map(s => utils.numero(s.saldo));

    this.planejamentoChart = new Chart(canvas, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Entradas",
            data: entradas,
            borderColor: "#22c55e",
            backgroundColor: "rgba(34,197,94,0.15)",
            fill: true,
            tension: 0.35
          },
          {
            label: "Saídas",
            data: saidas,
            borderColor: "#ef4444",
            backgroundColor: "rgba(239,68,68,0.15)",
            fill: true,
            tension: 0.35
          },
          {
            label: "Saldo Projetado",
            data: saldos,
            borderColor: "#facc15",
            backgroundColor: "rgba(250,204,21,0)",
            fill: false,
            tension: 0.35
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });
  }
};
