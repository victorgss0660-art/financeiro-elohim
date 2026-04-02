window.planejamentoModule = {
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

  renderTabela(semanas) {
    const tbody = document.getElementById("tabelaPlanejamento");

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
          Semana ${semana.numero}<br>
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

  async carregarPlanejamento() {
    try {
      const semanas = this.gerarSemanas();
      const contasPagar = await this.buscarPagamentosPendentes();
      const contasReceber = await this.buscarRecebimentosPendentes();

      this.encaixarMovimentosNasSemanas(semanas, contasPagar, contasReceber);

      let saldoRodando = this.calcularSaldoInicial();
      semanas.forEach(semana => {
        saldoRodando += semana.entradas - semana.saidas;
        semana.saldo = saldoRodando;
      });

      this.renderTabela(semanas);
    } catch (e) {
      utils.setAppMsg("Erro ao carregar planejamento: " + e.message, "err");
    }
  }
};
