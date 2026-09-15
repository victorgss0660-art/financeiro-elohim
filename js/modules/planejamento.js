window.planejamentoModule = {

  contasPagar: [],
  contasReceber: [],
  saldos: [],
  chart: null,

  get(id) {
    return document.getElementById(id);
  },

  // ======================================================
  // HELPERS
  // ======================================================

  numero(v) {
    if (v === null || v === undefined || v === "") {
      return 0;
    }

    if (typeof v === "number") {
      return Number.isFinite(v) ? v : 0;
    }

    let txt = String(v)
      .trim()
      .replace(/R\$/gi, "")
      .replace(/\s/g, "")
      .replace(/[^\d,.-]/g, "");

    if (!txt) return 0;

    // Ex.: 1.234,56
    if (txt.includes(".") && txt.includes(",")) {
      txt = txt
        .replace(/\./g, "")
        .replace(",", ".");
    }

    // Ex.: 1234,56
    else if (txt.includes(",")) {
      txt = txt.replace(",", ".");
    }

    const n = Number(txt);

    return Number.isFinite(n) ? n : 0;
  },

  moeda(v) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(this.numero(v));
  },

  normalizarStatus(status) {
    return String(status || "")
      .trim()
      .toLowerCase();
  },

  // Converte qualquer formato aceitável para YYYY-MM-DD
  normalizarData(valor) {
    if (!valor) return "";

    // Caso já venha como YYYY-MM-DD
    const texto = String(valor).trim();

    const matchISO = texto.match(
      /^(\d{4})-(\d{2})-(\d{2})/
    );

    if (matchISO) {
      return `${matchISO[1]}-${matchISO[2]}-${matchISO[3]}`;
    }

    // Caso venha como DD/MM/YYYY
    const matchBR = texto.match(
      /^(\d{2})\/(\d{2})\/(\d{4})/
    );

    if (matchBR) {
      return `${matchBR[3]}-${matchBR[2]}-${matchBR[1]}`;
    }

    const data = new Date(valor);

    if (isNaN(data.getTime())) {
      return "";
    }

    return this.dataISO(data);
  },

  contaPendente(conta) {
    const status = this.normalizarStatus(conta?.status);

    // Mesmo princípio do Contas a Pagar:
    // tudo que NÃO está pago entra na projeção.
    return status !== "pago";
  },

  // ======================================================
  // CARREGAMENTO
  // ======================================================

  async carregar() {
    try {

      const [
        saldos,
        contasPagar,
        contasReceber
      ] = await Promise.all([

        api.restGet(
          "saldos_bancarios",
          "select=*&limit=20000"
        ),

        // IMPORTANTE:
        // Mesmo filtro usado pela aba Contas a Pagar.
        api.restGet(
          "contas_pagar",
          "select=*&status=neq.pago&order=vencimento.asc&limit=20000"
        ),

        api.restGet(
          "contas_receber",
          "select=*&order=vencimento.asc&limit=20000"
        )

      ]);

      this.saldos =
        Array.isArray(saldos)
          ? saldos
          : [];

      this.contasPagar =
        Array.isArray(contasPagar)
          ? contasPagar
          : [];

      this.contasReceber =
        Array.isArray(contasReceber)
          ? contasReceber
          : [];

      console.log(
        "[PLANEJAMENTO] Contas a pagar carregadas:",
        this.contasPagar.length
      );

      console.log(
        "[PLANEJAMENTO] Contas a receber carregadas:",
        this.contasReceber.length
      );

      this.renderizar();

    } catch (erro) {

      console.error(
        "Erro ao carregar planejamento:",
        erro
      );

      alert(
        "Erro ao carregar planejamento."
      );
    }
  },

  // ======================================================
  // SALDO INICIAL
  // ======================================================

  saldoInicial() {
    return this.saldos.reduce(
      (total, item) =>
        total + this.numero(item.saldo),
      0
    );
  },

  // ======================================================
  // SEMANA = SÁBADO → SEXTA
  // ======================================================

  inicioSemanaSabado(data = new Date()) {

    const d = new Date(data);

    d.setHours(0, 0, 0, 0);

    const diaSemana = d.getDay();

    // JS:
    // domingo = 0
    // ...
    // sexta = 5
    // sábado = 6

    const diasDesdeSabado =
      diaSemana === 6
        ? 0
        : diaSemana + 1;

    d.setDate(
      d.getDate() - diasDesdeSabado
    );

    return d;
  },

  formatarData(data) {
    return data.toLocaleDateString(
      "pt-BR",
      {
        day: "2-digit",
        month: "2-digit"
      }
    );
  },

  formatarPeriodo(inicio, fim) {
    return (
      `${this.formatarData(inicio)} a ` +
      `${this.formatarData(fim)}`
    );
  },

  dataISO(data) {

    const ano =
      data.getFullYear();

    const mes =
      String(
        data.getMonth() + 1
      ).padStart(2, "0");

    const dia =
      String(
        data.getDate()
      ).padStart(2, "0");

    return `${ano}-${mes}-${dia}`;
  },

  // ======================================================
  // CONTAS POR PERÍODO
  // ======================================================

  contasPagarPeriodo(inicioStr, fimStr) {

    return this.contasPagar.filter(conta => {

      const vencimento =
        this.normalizarData(
          conta.vencimento
        );

      if (!vencimento) {
        return false;
      }

      if (!this.contaPendente(conta)) {
        return false;
      }

      return (
        vencimento >= inicioStr &&
        vencimento <= fimStr
      );
    });
  },

  contasReceberPeriodo(inicioStr, fimStr) {

    return this.contasReceber.filter(conta => {

      const vencimento =
        this.normalizarData(
          conta.vencimento
        );

      if (!vencimento) {
        return false;
      }

      // Se existir status "recebido",
      // não deve entrar como recebimento futuro.
      const status =
        this.normalizarStatus(
          conta.status
        );

      if (status === "recebido") {
        return false;
      }

      return (
        vencimento >= inicioStr &&
        vencimento <= fimStr
      );
    });
  },

  totalContas(lista) {

    return lista.reduce(
      (total, conta) =>
        total + this.numero(conta.valor),
      0
    );
  },

  // ======================================================
  // RENDER
  // ======================================================

  renderizar() {

    // ====================================================
    // SALDOS BANCÁRIOS
    // ====================================================

    const tabelaSaldos =
      this.get("tabelaSaldosBancarios");

    if (tabelaSaldos) {

      if (!this.saldos.length) {

        tabelaSaldos.innerHTML = `
          <tr>
            <td colspan="3">
              Nenhum saldo cadastrado.
            </td>
          </tr>
        `;

      } else {

        tabelaSaldos.innerHTML =
          this.saldos
            .map(s => `
              <tr>

                <td>
                  ${s.conta || "-"}
                </td>

                <td>
                  ${this.moeda(s.saldo)}
                </td>

                <td>
                  <button
                    type="button"
                    onclick="planejamentoModule.editarSaldo(${Number(s.id)})"
                  >
                    Editar
                  </button>
                </td>

              </tr>
            `)
            .join("");
      }
    }

    // ====================================================
    // PLANEJAMENTO
    // ====================================================

    const tabela =
      this.get("tabelaPlanejamento");

    if (!tabela) {
      return;
    }

    const primeiraSemana =
      this.inicioSemanaSabado(
        new Date()
      );

    let saldo =
      this.saldoInicial();

    let totalReceber = 0;
    let totalPagar = 0;

    let menorSaldo =
      saldo;

    let semanaCritica =
      "-";

    const labels = [];
    const entradas = [];
    const saidas = [];
    const caixa = [];

    let html = "";

    // ====================================================
    // 12 SEMANAS
    // ====================================================

    for (let i = 0; i < 12; i++) {

      // --------------------------------------------------
      // INÍCIO
      // --------------------------------------------------

      const inicio =
        new Date(
          primeiraSemana
        );

      inicio.setDate(
        primeiraSemana.getDate() +
        (i * 7)
      );

      inicio.setHours(
        0,
        0,
        0,
        0
      );

      // --------------------------------------------------
      // FIM
      // --------------------------------------------------

      const fim =
        new Date(inicio);

      fim.setDate(
        inicio.getDate() + 6
      );

      fim.setHours(
        23,
        59,
        59,
        999
      );

      const inicioStr =
        this.dataISO(inicio);

      const fimStr =
        this.dataISO(fim);

      // ==================================================
      // CONTAS A RECEBER DA SEMANA
      // ==================================================

      const contasReceberSemana =
        this.contasReceberPeriodo(
          inicioStr,
          fimStr
        );

      const receber =
        this.totalContas(
          contasReceberSemana
        );

      // ==================================================
      // CONTAS A PAGAR DA SEMANA
      // ==================================================

      const contasPagarSemana =
        this.contasPagarPeriodo(
          inicioStr,
          fimStr
        );

      const pagar =
        this.totalContas(
          contasPagarSemana
        );

      // ==================================================
      // DEBUG
      // ==================================================

      console.group(
        `[PLANEJAMENTO] Semana ${i + 1} - ${inicioStr} até ${fimStr}`
      );

      console.log(
        "Quantidade a pagar:",
        contasPagarSemana.length
      );

      console.log(
        "Total a pagar:",
        pagar
      );

      console.table(
        contasPagarSemana.map(conta => ({
          id: conta.id,
          fornecedor: conta.fornecedor,
          vencimento: conta.vencimento,
          status: conta.status,
          valor_original: conta.valor,
          valor_convertido:
            this.numero(conta.valor)
        }))
      );

      console.groupEnd();

      // ==================================================
      // FLUXO DE CAIXA
      // ==================================================

      const saldoAntes =
        saldo;

      const resultado =
        receber - pagar;

      saldo =
        saldoAntes + resultado;

      totalReceber +=
        receber;

      totalPagar +=
        pagar;

      // ==================================================
      // MENOR SALDO
      // ==================================================

      if (saldo < menorSaldo) {

        menorSaldo =
          saldo;

        semanaCritica =
          this.formatarPeriodo(
            inicio,
            fim
          );
      }

      const risco =
        saldo < 0;

      // ==================================================
      // LINHA
      // ==================================================

      html += `
        <tr
          style="${
            risco
              ? "background:#fee2e2;"
              : ""
          }"
        >

          <td>
            ${i + 1}
          </td>

          <td>
            ${this.formatarPeriodo(
              inicio,
              fim
            )}
          </td>

          <td>
            ${this.moeda(
              saldoAntes
            )}
          </td>

          <td
            style="color:#22c55e;"
          >
            ${this.moeda(
              receber
            )}
          </td>

          <td
            style="color:#ef4444;"
          >
            ${this.moeda(
              pagar
            )}
          </td>

          <td
            style="font-weight:bold;"
          >
            ${this.moeda(
              resultado
            )}
          </td>

          <td
            style="
              font-weight:bold;
              color:${
                risco
                  ? "#ef4444"
                  : "#22c55e"
              };
            "
          >
            ${this.moeda(
              saldo
            )}
          </td>

          <td>
            ${
              risco
                ? "⚠️ Risco"
                : "OK"
            }
          </td>

        </tr>
      `;

      // ==================================================
      // GRÁFICO
      // ==================================================

      labels.push(
        this.formatarData(
          inicio
        )
      );

      entradas.push(
        receber
      );

      saidas.push(
        pagar
      );

      caixa.push(
        saldo
      );
    }

    tabela.innerHTML =
      html;

    // ====================================================
    // CARDS
    // ====================================================

    const cardSaldoInicial =
      this.get(
        "planejamentoSaldoInicial"
      );

    if (cardSaldoInicial) {
      cardSaldoInicial.textContent =
        this.moeda(
          this.saldoInicial()
        );
    }

    const cardReceber =
      this.get(
        "planejamentoTotalReceber"
      );

    if (cardReceber) {
      cardReceber.textContent =
        this.moeda(
          totalReceber
        );
    }

    const cardPagar =
      this.get(
        "planejamentoTotalPagar"
      );

    if (cardPagar) {
      cardPagar.textContent =
        this.moeda(
          totalPagar
        );
    }

    const cardSaldoFinal =
      this.get(
        "planejamentoSaldoFinal"
      );

    if (cardSaldoFinal) {
      cardSaldoFinal.textContent =
        this.moeda(
          saldo
        );
    }

    // ====================================================
    // STATUS CFO
    // ====================================================

    const cardMenorSaldo =
      this.get(
        "planejamentoMenorSaldo"
      );

    if (cardMenorSaldo) {
      cardMenorSaldo.textContent =
        this.moeda(
          menorSaldo
        );
    }

    const cardSemanaCritica =
      this.get(
        "planejamentoSemanaCritica"
      );

    if (cardSemanaCritica) {
      cardSemanaCritica.textContent =
        semanaCritica;
    }

    const statusCaixa =
      this.get(
        "planejamentoStatusCaixa"
      );

    const necessidadeCaixa =
      this.get(
        "planejamentoNecessidadeCaixa"
      );

    if (menorSaldo < 0) {

      if (statusCaixa) {

        statusCaixa.textContent =
          "CRÍTICO";

        statusCaixa.style.color =
          "#ef4444";
      }

      if (necessidadeCaixa) {

        necessidadeCaixa.textContent =
          this.moeda(
            Math.abs(
              menorSaldo
            )
          );
      }

    } else {

      if (statusCaixa) {

        statusCaixa.textContent =
          "SAUDÁVEL";

        statusCaixa.style.color =
          "#22c55e";
      }

      if (necessidadeCaixa) {

        necessidadeCaixa.textContent =
          "R$ 0,00";
      }
    }

    // ====================================================
    // GRÁFICO
    // ====================================================

    this.renderizarGrafico(
      labels,
      entradas,
      saidas,
      caixa
    );
  },

  // ======================================================
  // GRÁFICO
  // ======================================================

  renderizarGrafico(
    labels,
    entradas,
    saidas,
    caixa
  ) {

    const canvas =
      this.get(
        "chartPlanejamento"
      );

    if (
      !canvas ||
      typeof Chart === "undefined"
    ) {
      return;
    }

    if (this.chart) {
      this.chart.destroy();
    }

    this.chart =
      new Chart(
        canvas,
        {

          data: {

            labels,

            datasets: [

              {
                type: "bar",
                label: "Entradas",
                data: entradas,
                backgroundColor:
                  "#22c55e"
              },

              {
                type: "bar",
                label: "Saídas",
                data: saidas,
                backgroundColor:
                  "#ef4444"
              },

              {
                type: "line",
                label: "Saldo",
                data: caixa,
                borderColor:
                  "#38bdf8",
                borderWidth: 3,
                tension: 0.4
              }

            ]
          },

          options: {

            responsive: true,

            maintainAspectRatio:
              false

          }
        }
      );
  },

  // ======================================================
  // EDITAR SALDO
  // ======================================================

  async editarSaldo(id) {

    const item =
      this.saldos.find(
        s =>
          Number(s.id) ===
          Number(id)
      );

    if (!item) {
      return;
    }

    const novo =
      prompt(
        "Novo saldo:",
        item.saldo
      );

    if (novo === null) {
      return;
    }

    const valorNovo =
      this.numero(novo);

    try {

      await api.update(
        "saldos_bancarios",
        id,
        {
          saldo:
            valorNovo
        }
      );

      await this.carregar();

    } catch (erro) {

      console.error(
        "Erro ao editar saldo:",
        erro
      );

      alert(
        "Erro ao editar saldo."
      );
    }
  }
};


// ========================================================
// INIT
// ========================================================

window.carregarPlanejamento =
  () =>
    planejamentoModule.carregar();
