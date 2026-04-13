window.dreModule = {
  dreChart: null,
  dreCategoriaChart: null,

  categoriasCusto: [
    "MC",
    "MP",
    "TERC",
    "FRETE"
  ],

  categoriasDespesa: [
    "DESP",
    "TAR",
    "PREST",
    "FOLHA",
    "COMIS",
    "IMPOS",
    "RESC",
    "MANUT"
  ],

  async carregarDRE() {
    try {
      const { mes, ano } = utils.getMesAno();

      const [receita, contasPagas] = await Promise.all([
        this.buscarReceitaMes(mes, ano),
        this.buscarContasPagasMes(mes, ano)
      ]);

      const analise = this.processarDRE(receita, contasPagas);

      this.renderCards(analise, mes, ano);
      this.renderTabelaPrincipal(analise, receita);
      this.renderTabelaCategorias(analise, receita);
      this.renderGraficoEstrutura(analise);
      this.renderGraficoCategorias(analise);
    } catch (e) {
      console.error("Erro ao carregar DRE:", e);
      utils.setAppMsg("Erro ao carregar DRE: " + e.message, "err");
    }
  },

  async buscarReceitaMes(mes, ano) {
    try {
      const data = await api.restGet("meses", "select=*");

      const item = (data || []).find(row => {
        const mesLinha = String(row.mes || row.nome_mes || "").trim().toLowerCase();
        const mesAtual = String(mes || "").trim().toLowerCase();
        const anoLinha = Number(row.ano || row.exercicio || 0);
        return mesLinha === mesAtual && anoLinha === Number(ano);
      });

      return utils.numero(
        item?.valor ??
        item?.faturamento ??
        item?.receita ??
        0
      );
    } catch (e) {
      console.error("Erro buscarReceitaMes:", e);
      return 0;
    }
  },

  async buscarContasPagasMes(mes, ano) {
    try {
      const data = await api.restGet(
        "contas_pagar",
        "select=*&status=eq.pago&order=data_pagamento.desc"
      );

      const mesNumero = this.getNumeroMes(mes);

      return (data || []).filter(item => {
        if (!item.data_pagamento) return false;

        const d = new Date(item.data_pagamento + "T00:00:00");
        if (Number.isNaN(d.getTime())) return false;

        return d.getFullYear() === Number(ano) && (d.getMonth() + 1) === mesNumero;
      });
    } catch (e) {
      console.error("Erro buscarContasPagasMes:", e);
      return [];
    }
  },

  getNumeroMes(mesNome) {
    const meses = {
      janeiro: 1,
      fevereiro: 2,
      março: 3,
      marco: 3,
      abril: 4,
      maio: 5,
      junho: 6,
      julho: 7,
      agosto: 8,
      setembro: 9,
      outubro: 10,
      novembro: 11,
      dezembro: 12
    };

    return meses[String(mesNome || "").trim().toLowerCase()] || 1;
  },

  classificarCategoria(categoria) {
    const cat = String(categoria || "").trim().toUpperCase();

    if (this.categoriasCusto.includes(cat)) return "Custo";
    if (this.categoriasDespesa.includes(cat)) return "Despesa";

    return "Despesa";
  },

  processarDRE(receita, contasPagas) {
    const categorias = {};
    let totalCustos = 0;
    let totalDespesas = 0;

    (contasPagas || []).forEach(item => {
      const categoria = String(item.categoria || "Sem categoria").trim().toUpperCase();
      const valorBase = Number(item.valor || 0);
      const multa = Number(item.multa || 0);
      const desconto = Number(item.desconto || 0);
      const valorFinal = valorBase + multa - desconto;

      const tipo = this.classificarCategoria(categoria);

      if (!categorias[categoria]) {
        categorias[categoria] = {
          categoria,
          tipo,
          valor: 0
        };
      }

      categorias[categoria].valor += valorFinal;

      if (tipo === "Custo") totalCustos += valorFinal;
      else totalDespesas += valorFinal;
    });

    const lucroBruto = receita - totalCustos;
    const lucroLiquido = receita - totalCustos - totalDespesas;
    const margemLiquida = receita > 0 ? (lucroLiquido / receita) * 100 : 0;

    return {
      receita,
      totalCustos,
      totalDespesas,
      lucroBruto,
      lucroLiquido,
      margemLiquida,
      quantidadeLancamentos: (contasPagas || []).length,
      categorias: Object.values(categorias).sort((a, b) => b.valor - a.valor)
    };
  },

  renderCards(analise, mes, ano) {
    const receitaEl = document.getElementById("dreReceitaBruta");
    const custosEl = document.getElementById("dreCustos");
    const despesasEl = document.getElementById("dreDespesas");
    const lucroLiquidoEl = document.getElementById("dreLucroLiquido");
    const lucroBrutoEl = document.getElementById("dreLucroBruto");
    const margemEl = document.getElementById("dreMargemLiquida");
    const qtdEl = document.getElementById("dreQtdLancamentos");
    const situacaoEl = document.getElementById("dreSituacao");
    const periodoBadge = document.getElementById("drePeriodoBadge");

    if (receitaEl) receitaEl.textContent = utils.moeda(analise.receita);
    if (custosEl) custosEl.textContent = utils.moeda(analise.totalCustos);
    if (despesasEl) despesasEl.textContent = utils.moeda(analise.totalDespesas);
    if (lucroLiquidoEl) {
      lucroLiquidoEl.textContent = utils.moeda(analise.lucroLiquido);
      lucroLiquidoEl.classList.remove("ok", "err");
      lucroLiquidoEl.classList.add(analise.lucroLiquido >= 0 ? "ok" : "err");
    }

    if (lucroBrutoEl) {
      lucroBrutoEl.textContent = utils.moeda(analise.lucroBruto);
      lucroBrutoEl.classList.remove("ok", "err");
      lucroBrutoEl.classList.add(analise.lucroBruto >= 0 ? "ok" : "err");
    }

    if (margemEl) {
      margemEl.textContent = `${utils.arredondar(analise.margemLiquida, 2)}%`;
      margemEl.classList.remove("ok", "err");
      margemEl.classList.add(analise.margemLiquida >= 0 ? "ok" : "err");
    }

    if (qtdEl) qtdEl.textContent = String(analise.quantidadeLancamentos);

    if (situacaoEl) {
      situacaoEl.classList.remove("ok", "err");
      if (analise.lucroLiquido > 0) {
        situacaoEl.textContent = "Lucro";
        situacaoEl.classList.add("ok");
      } else if (analise.lucroLiquido < 0) {
        situacaoEl.textContent = "Prejuízo";
        situacaoEl.classList.add("err");
      } else {
        situacaoEl.textContent = "Empate";
      }
    }

    if (periodoBadge) {
      periodoBadge.textContent = `${mes}/${ano}`;
    }
  },

  renderTabelaPrincipal(analise, receita) {
    const tbody = document.getElementById("tabelaDRE");
    if (!tbody) return;

    const perc = valor => receita > 0 ? `${utils.arredondar((valor / receita) * 100, 2)}%` : "0%";

    tbody.innerHTML = `
      <tr>
        <td>Receita</td>
        <td>Receita Bruta</td>
        <td>${utils.moeda(analise.receita)}</td>
        <td>100%</td>
      </tr>
      <tr>
        <td>Custos</td>
        <td>(-) Custos Operacionais</td>
        <td>${utils.moeda(analise.totalCustos)}</td>
        <td>${perc(analise.totalCustos)}</td>
      </tr>
      <tr>
        <td>Resultado</td>
        <td>(=) Lucro Bruto</td>
        <td class="${analise.lucroBruto >= 0 ? "ok" : "err"}">${utils.moeda(analise.lucroBruto)}</td>
        <td>${perc(analise.lucroBruto)}</td>
      </tr>
      <tr>
        <td>Despesas</td>
        <td>(-) Despesas Operacionais</td>
        <td>${utils.moeda(analise.totalDespesas)}</td>
        <td>${perc(analise.totalDespesas)}</td>
      </tr>
      <tr>
        <td>Resultado</td>
        <td>(=) Lucro Líquido</td>
        <td class="${analise.lucroLiquido >= 0 ? "ok" : "err"}">${utils.moeda(analise.lucroLiquido)}</td>
        <td>${perc(analise.lucroLiquido)}</td>
      </tr>
    `;
  },

  renderTabelaCategorias(analise, receita) {
    const tbody = document.getElementById("tabelaDRECategorias");
    if (!tbody) return;

    if (!analise.categorias.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" class="muted">Nenhum dado carregado.</td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = analise.categorias.map(item => `
      <tr>
        <td>${item.categoria}</td>
        <td>${item.tipo}</td>
        <td>${utils.moeda(item.valor)}</td>
        <td>${receita > 0 ? `${utils.arredondar((item.valor / receita) * 100, 2)}%` : "0%"}</td>
      </tr>
    `).join("");
  },

  renderGraficoEstrutura(analise) {
    const ctx = document.getElementById("dreChart");
    if (!ctx || typeof Chart === "undefined") return;

    if (this.dreChart) this.dreChart.destroy();

    this.dreChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: ["Receita", "Custos", "Despesas", "Lucro Líquido"],
        datasets: [{
          label: "Valor",
          data: [
            analise.receita,
            analise.totalCustos,
            analise.totalDespesas,
            analise.lucroLiquido
          ]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });
  },

  renderGraficoCategorias(analise) {
    const ctx = document.getElementById("dreCategoriaChart");
    if (!ctx || typeof Chart === "undefined") return;

    if (this.dreCategoriaChart) this.dreCategoriaChart.destroy();

    this.dreCategoriaChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: analise.categorias.map(i => i.categoria),
        datasets: [{
          data: analise.categorias.map(i => i.valor)
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });
  }
};
