window.planejamentoModule = {
  chart: null,

  async init() {
    this.bindEvents();
    await this.carregarSaldosBancarios();
    await this.carregarPlanejamento();
  },

  bindEvents() {
    const btnSalvar = document.getElementById("btnSalvarSaldosBancarios");

    if (btnSalvar && btnSalvar.dataset.binded !== "1") {
      btnSalvar.addEventListener("click", async () => {
        await this.salvarSaldosBancarios();
      });
      btnSalvar.dataset.binded = "1";
    }
  },

  getSaldoInputs() {
    return Array.from(document.querySelectorAll(".saldo-conta"));
  },

  normalizarConta(conta) {
    return String(conta || "").trim();
  },

  async salvarSaldosBancarios() {
    try {
      window.loading?.show?.();

      const inputs = this.getSaldoInputs();

      if (!inputs.length) {
        utils.setAppMsg("Nenhum campo de saldo encontrado.", "err");
        return;
      }

      for (const input of inputs) {
        const conta = this.normalizarConta(input.dataset.conta);
        const saldo = utils.numero(input.value || 0);

        if (!conta) continue;

        const existente = await api.restGet(
          "saldos_bancarios",
          `select=id,conta&conta=eq.${encodeURIComponent(conta)}&limit=1`
        );

        const payload = {
          conta,
          saldo,
          updated_at: new Date().toISOString()
        };

        if (existente && existente.length > 0) {
          await api.restPatch(
            "saldos_bancarios",
            `id=eq.${existente[0].id}`,
            payload
          );
        } else {
          await api.restInsert("saldos_bancarios", [payload]);
        }
      }

      await this.carregarSaldosBancarios();
      await this.carregarPlanejamento();

      utils.setAppMsg("Saldos bancários salvos com sucesso.", "ok");
    } catch (e) {
      console.error("Erro ao salvar saldos bancários:", e);
      utils.setAppMsg("Erro ao salvar saldos bancários: " + e.message, "err");
    } finally {
      window.loading?.hide?.();
    }
  },

  async carregarSaldosBancarios() {
    try {
      const registros = await api.restGet("saldos_bancarios", "select=*");

      const mapa = {};
      (registros || []).forEach(item => {
        mapa[this.normalizarConta(item.conta)] = utils.numero(item.saldo);
      });

      let total = 0;

      this.getSaldoInputs().forEach(input => {
        const conta = this.normalizarConta(input.dataset.conta);
        const saldo = utils.numero(mapa[conta] || 0);

        input.value = saldo ? saldo : "";
        total += saldo;
      });

      const totalDisponivelBadge = document.getElementById("totalDisponivelBadge");
      const saldoInicial = document.getElementById("cxSaldoInicial");

      if (totalDisponivelBadge) {
        totalDisponivelBadge.textContent = `Total disponível: ${utils.moeda(total)}`;
      }

      if (saldoInicial) {
        saldoInicial.textContent = utils.moeda(total);
      }

      return total;
    } catch (e) {
      console.error("Erro ao carregar saldos bancários:", e);
      return 0;
    }
  },

  async carregarPlanejamento() {
    try {
      const saldoInicial = await this.carregarSaldosBancarios();

      const contasReceber = await api.restGet("contas_receber", "select=*");
      const contasPagar = await api.restGet("contas_pagar", "select=*");

      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const semanas = [];
      let saldoAtual = utils.numero(saldoInicial);
      let menorSaldo = saldoAtual;
      let semanasNegativas = 0;
      let maiorSaida = 0;
      let totalEntradas = 0;
      let totalSaidas = 0;

      for (let i = 0; i < 12; i++) {
        const inicio = new Date(hoje);
        inicio.setDate(hoje.getDate() + i * 7);

        const fim = new Date(inicio);
        fim.setDate(inicio.getDate() + 6);

        const entradasSemana = (contasReceber || [])
          .filter(item => {
            if (!item.vencimento) return false;
            if (String(item.status || "").toLowerCase() === "recebido") return false;
            const d = new Date(item.vencimento + "T00:00:00");
            return d >= inicio && d <= fim;
          })
          .reduce((acc, item) => acc + utils.numero(item.valor), 0);

        const saidasSemana = (contasPagar || [])
          .filter(item => {
            if (!item.vencimento) return false;
            if (String(item.status || "").toLowerCase() === "pago") return false;
            const d = new Date(item.vencimento + "T00:00:00");
            return d >= inicio && d <= fim;
          })
          .reduce((acc, item) => acc + utils.numero(item.valor), 0);

        saldoAtual = saldoAtual + entradasSemana - saidasSemana;

        if (saldoAtual < menorSaldo) menorSaldo = saldoAtual;
        if (saldoAtual < 0) semanasNegativas++;
        if (saidasSemana > maiorSaida) maiorSaida = saidasSemana;

        totalEntradas += entradasSemana;
        totalSaidas += saidasSemana;

        semanas.push({
          semana: `Semana ${i + 1}`,
          entradas: entradasSemana,
          saidas: saidasSemana,
          saldo: saldoAtual
        });
      }

      this.renderTabelaPlanejamento(semanas);
      this.renderGraficoPlanejamento(semanas);
      this.renderRiscos(semanas, menorSaldo, semanasNegativas, maiorSaida);

      const cxEntradasPrevistas = document.getElementById("cxEntradasPrevistas");
      const cxSaidasPrevistas = document.getElementById("cxSaidasPrevistas");
      const cxSaldoFinal = document.getElementById("cxSaldoFinal");
      const cxMenorSaldo = document.getElementById("cxMenorSaldo");

      if (cxEntradasPrevistas) cxEntradasPrevistas.textContent = utils.moeda(totalEntradas);
      if (cxSaidasPrevistas) cxSaidasPrevistas.textContent = utils.moeda(totalSaidas);
      if (cxSaldoFinal) cxSaldoFinal.textContent = utils.moeda(saldoAtual);
      if (cxMenorSaldo) cxMenorSaldo.textContent = utils.moeda(menorSaldo);
    } catch (e) {
      console.error("Erro ao carregar planejamento:", e);
      utils.setAppMsg("Erro ao carregar planejamento: " + e.message, "err");
    }
  },

  renderTabelaPlanejamento(semanas) {
    const tbody = document.getElementById("tabelaPlanejamento");
    if (!tbody) return;

    tbody.innerHTML = (semanas || []).length
      ? semanas.map(item => `
          <tr>
            <td>${item.semana}</td>
            <td>${utils.moeda(item.entradas)}</td>
            <td>${utils.moeda(item.saidas)}</td>
            <td class="${item.saldo < 0 ? "err" : "ok"}">${utils.moeda(item.saldo)}</td>
          </tr>
        `).join("")
      : `<tr><td colspan="4" class="muted">Nenhum planejamento disponível.</td></tr>`;
  },

  renderGraficoPlanejamento(semanas) {
    const canvas = document.getElementById("planejamentoChart");
    if (!canvas) return;

    if (this.chart) this.chart.destroy();

    this.chart = new Chart(canvas, {
      type: "line",
      data: {
        labels: (semanas || []).map(item => item.semana),
        datasets: [
          {
            label: "Entradas",
            data: (semanas || []).map(item => item.entradas),
            borderWidth: 3,
            tension: 0.35
          },
          {
            label: "Saídas",
            data: (semanas || []).map(item => item.saidas),
            borderWidth: 3,
            tension: 0.35
          },
          {
            label: "Saldo Projetado",
            data: (semanas || []).map(item => item.saldo),
            borderWidth: 3,
            tension: 0.35
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });
  },

  renderRiscos(semanas, menorSaldo, semanasNegativas, maiorSaida) {
    const riskMenorSaldo = document.getElementById("riskMenorSaldo");
    const riskSemanasNegativas = document.getElementById("riskSemanasNegativas");
    const riskMaiorSaida = document.getElementById("riskMaiorSaida");
    const riskList = document.getElementById("riskList");

    if (riskMenorSaldo) riskMenorSaldo.textContent = utils.moeda(menorSaldo);
    if (riskSemanasNegativas) riskSemanasNegativas.textContent = String(semanasNegativas);
    if (riskMaiorSaida) riskMaiorSaida.textContent = utils.moeda(maiorSaida);

    if (!riskList) return;

    const negativas = (semanas || []).filter(item => item.saldo < 0);

    riskList.innerHTML = negativas.length
      ? negativas.map(item => `
          <div class="alert-item critico">
            <strong>${item.semana}</strong><br>
            Saldo projetado negativo em ${utils.moeda(item.saldo)}
          </div>
        `).join("")
      : `<div class="alert-item ok">Nenhum risco crítico projetado.</div>`;
  }
};
