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

      const faturamentoValor = utils.numero(faturamento?.valor || 0);
      const totalGastos = utils.totalizar(gastosMes, "valor");
      const saldo = faturamentoValor - totalGastos;
      const metaAtingida = faturamentoValor > 0
        ? (totalGastos / faturamentoValor) * 100
        : 0;

      const metasMap = this.montarMapaMetas(metasAno);
      const gastosPorCategoria = utils.somarPorCategoria(gastosMes, "categoria", "valor");

      this.preencherCards({
        faturamento: faturamentoValor,
        gastos: totalGastos,
        saldo,
        metaAtingida
      });

      this.renderComparativo(mes, ano, faturamentoValor);
      this.renderVencimentos(contasPagar || []);
      this.renderTopContas(contasPagar || [], contasReceber || []);
      this.renderTabelaResumo(gastosPorCategoria, metasMap, faturamentoValor);
      this.renderAlertas(gastosPorCategoria, metasMap, faturamentoValor, saldo, contasPagar || []);
      this.renderCentroInteligencia({
        mes,
        ano,
        faturamentoValor,
        totalGastos,
        saldo,
        contasPagar: contasPagar || [],
        contasReceber: contasReceber || [],
        gastosPorCategoria,
        metasMap,
        gastosAno,
        mesesAno: this.cacheMeses || []
      });

      this.renderBarChart(gastosPorCategoria, metasMap, faturamentoValor);
      this.renderPieChart(gastosPorCategoria);
      this.renderLineChart(gastosAno, this.cacheMeses);
      this.renderRankingChart(gastosAno);
      this.registrarEventosFullscreen();
    } catch (e) {
      console.error("Erro no dashboard:", e);
      utils.setAppMsg("Erro no dashboard: " + e.message, "err");
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
    varFatEl.className = variacao < 0 ? "err" : "ok";
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
      if (!c.vencimento || String(c.status || "").toLowerCase() === "pago") return false;
      const d = new Date(c.vencimento + "T00:00:00");
      return d < hoje;
    });

    const hojeLista = (contas || []).filter(c => {
      if (!c.vencimento || String(c.status || "").toLowerCase() === "pago") return false;
      const d = new Date(c.vencimento + "T00:00:00");
      return d.getTime() === hoje.getTime();
    });

    const proximas = (contas || []).filter(c => {
      if (!c.vencimento || String(c.status || "").toLowerCase() === "pago") return false;
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
        .filter(i => String(i.status || "").toLowerCase() !== "pago")
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
        .filter(i => String(i.status || "").toLowerCase() !== "recebido")
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

    if (saldo < 0) {
      alertas.push({
        tipo: "critico",
        titulo: "Saldo negativo",
        texto: `Saldo atual: ${utils.moeda(saldo)}`,
        acao: ""
      });
    }

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const em7 = new Date(hoje);
    em7.setDate(hoje.getDate() + 7);

    let vencidas = 0;
    let hojeCount = 0;
    let proximas = 0;

    (contasPagar || []).forEach(c => {
      if (!c.vencimento || String(c.status || "").toLowerCase() === "pago") return;

      const data = new Date(c.vencimento + "T00:00:00");

      if (data < hoje) vencidas++;
      else if (data.getTime() === hoje.getTime()) hojeCount++;
      else if (data <= em7) proximas++;
    });

    if (vencidas > 0) {
      alertas.push({
        tipo: "critico",
        titulo: "Contas vencidas",
        texto: `${vencidas} contas em atraso`,
        acao: "vencidas"
      });
    }

    if (hojeCount > 0) {
      alertas.push({
        tipo: "atencao",
        titulo: "Vencem hoje",
        texto: `${hojeCount} contas vencem hoje`,
        acao: "hoje"
      });
    }

    if (proximas > 0) {
      alertas.push({
        tipo: "atencao",
        titulo: "Próximos 7 dias",
        texto: `${proximas} contas a vencer`,
        acao: "7dias"
      });
    }

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
            texto: `${utils.arredondar(perc, 1)}% da meta`,
            acao: `categoria:${cat}`
          });
        } else if (perc >= 80) {
          alertas.push({
            tipo: "atencao",
            titulo: `${cat} em atenção`,
            texto: `${utils.arredondar(perc, 1)}% da meta`,
            acao: `categoria:${cat}`
          });
        }
      }
    });

    const varFatEl = document.getElementById("varFat");
    if (varFatEl) {
      const txt = String(varFatEl.textContent || "").replace("%", "").replace(",", ".");
      const val = Number(txt);

      if (!isNaN(val) && val < 0) {
        alertas.push({
          tipo: "atencao",
          titulo: "Faturamento em queda",
          texto: `${utils.arredondar(val, 1)}% vs mês anterior`,
          acao: "faturamento"
        });
      }
    }

    if (!alertas.length) {
      el.innerHTML = `<div class="alert-item ok"><strong>Tudo sob controle</strong><br>Sem alertas críticos no momento.</div>`;
      return;
    }

    el.innerHTML = alertas.map((a, i) => `
      <button
        type="button"
        class="alert-item ${a.tipo} alert-clickable"
        data-alerta="${a.acao || ""}"
        data-index="${i}"
      >
        <strong>${a.titulo}</strong><br>
        ${a.texto}
      </button>
    `).join("");

    this.registrarEventosAlerta();
  },

  registrarEventosAlerta() {
    document.querySelectorAll(".alert-clickable").forEach(btn => {
      if (btn.dataset.binded) return;

      btn.addEventListener("click", () => {
        const acao = btn.dataset.alerta || "";
        this.executarAcaoAlerta(acao);
      });

      btn.dataset.binded = "1";
    });
  },

  executarAcaoAlerta(acao) {
    if (!acao) return;

    if (acao === "vencidas") {
      this.abrirContasPagarComFiltro({ status: "vencido" });
      return;
    }

    if (acao === "hoje") {
      const hoje = new Date().toISOString().slice(0, 10);
      this.abrirContasPagarComFiltro({ dataInicio: hoje, dataFim: hoje });
      return;
    }

    if (acao === "7dias") {
      const hoje = new Date();
      const inicio = hoje.toISOString().slice(0, 10);

      const em7 = new Date();
      em7.setDate(hoje.getDate() + 7);
      const fim = em7.toISOString().slice(0, 10);

      this.abrirContasPagarComFiltro({ dataInicio: inicio, dataFim: fim });
      return;
    }

    if (acao.startsWith("categoria:")) {
      const categoria = acao.split(":")[1] || "";
      this.abrirImportacaoOuCategoria(categoria);
      return;
    }

    if (acao === "faturamento") {
      this.irParaAba("faturamento");
    }
  },

  irParaAba(nomeAba) {
    document.querySelectorAll(".menu-btn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.tab === nomeAba);
    });

    document.querySelectorAll(".tab-section").forEach(sec => {
      sec.classList.remove("active");
    });

    const alvo = document.getElementById(`tab-${nomeAba}`);
    if (alvo) alvo.classList.add("active");

    if (window.navigation?.atualizarVisibilidadeFiltroMesAno) {
      navigation.atualizarVisibilidadeFiltroMesAno();
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  },

  abrirContasPagarComFiltro({ status = "", dataInicio = "", dataFim = "" }) {
    this.irParaAba("contas-pagar");

    const filtroStatus = document.getElementById("filtroStatus");
    const filtroDataInicio = document.getElementById("filtroDataInicio");
    const filtroDataFim = document.getElementById("filtroDataFim");

    if (filtroStatus) filtroStatus.value = status || "";
    if (filtroDataInicio) filtroDataInicio.value = dataInicio || "";
    if (filtroDataFim) filtroDataFim.value = dataFim || "";

    if (window.contasPagarModule) {
      window.contasPagarModule.filtros.status = status || "";
      window.contasPagarModule.filtros.dataInicio = dataInicio || "";
      window.contasPagarModule.filtros.dataFim = dataFim || "";
      window.contasPagarModule.render?.();
    }
  },

  abrirImportacaoOuCategoria(categoria) {
    this.irParaAba("importar");
    utils.setAppMsg(`Categoria em alerta: ${categoria}`, "info");
  },

  renderCentroInteligencia({
    mes,
    ano,
    faturamentoValor,
    totalGastos,
    saldo,
    contasPagar,
    contasReceber,
    gastosPorCategoria,
    metasMap,
    gastosAno,
    mesesAno
  }) {
    const elScore = document.getElementById("intelScore");
    const elScoreFill = document.getElementById("intelScoreFill");
    const elScoreDesc = document.getElementById("intelScoreDesc");

    const elSaude = document.getElementById("intelSaude");
    const elSaudeDesc = document.getElementById("intelSaudeDesc");
    const elSaldoProjetado = document.getElementById("intelSaldoProjetado");
    const elTendencia = document.getElementById("intelTendencia");
    const elTendenciaDesc = document.getElementById("intelTendenciaDesc");
    const elRisco = document.getElementById("intelRisco");
    const elRiscoDesc = document.getElementById("intelRiscoDesc");
    const elPressao = document.getElementById("intelPressao");
    const elPressaoDesc = document.getElementById("intelPressaoDesc");
    const elAlertas = document.getElementById("intelAlertas");
    const elRecomendacoes = document.getElementById("intelRecomendacoes");
    const elComparativo = document.getElementById("intelComparativo");
    const elImpactos = document.getElementById("intelImpactos");
    const elCategorias = document.getElementById("intelCategorias");

    const pendentesPagar = (contasPagar || []).filter(i => String(i.status || "").toLowerCase() !== "pago");
    const pendentesReceber = (contasReceber || []).filter(i => String(i.status || "").toLowerCase() !== "recebido");

    const totalPagar = pendentesPagar.reduce((acc, i) => acc + utils.numero(i.valor), 0);
    const totalReceber = pendentesReceber.reduce((acc, i) => acc + utils.numero(i.valor), 0);

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const indiceMes = this.mesesOrdem.indexOf(this.nomeMesCanonico(mes));
    const diasNoMes = new Date(Number(ano), indiceMes + 1, 0).getDate();
    const hojeReal = new Date();
    const diaAtual = Math.min(hojeReal.getDate(), diasNoMes);
    const ritmoReceitaDia = diaAtual > 0 ? faturamentoValor / diaAtual : 0;
    const projetadoReceitaFimMes = ritmoReceitaDia * diasNoMes;

    const contasVencidasLista = pendentesPagar.filter(i => {
      if (!i.vencimento) return false;
      const d = new Date(i.vencimento + "T00:00:00");
      return d < hoje;
    });

    const contasVencidas = contasVencidasLista.length;

    const maiorContaPagarObj = [...pendentesPagar].sort((a, b) => utils.numero(b.valor) - utils.numero(a.valor))[0];
    const maiorContaPagar = maiorContaPagarObj ? utils.numero(maiorContaPagarObj.valor) : 0;

    const maiorReceberObj = [...pendentesReceber].sort((a, b) => utils.numero(b.valor) - utils.numero(a.valor))[0];
    const maiorReceber = maiorReceberObj ? utils.numero(maiorReceberObj.valor) : 0;

    const saldoProjetado = saldo + totalReceber - totalPagar;

    const categoriasAcimaMeta = Object.keys(gastosPorCategoria || {}).filter(cat => {
      const gasto = utils.numero(gastosPorCategoria[cat] || 0);
      const meta = utils.numero(metasMap[cat] || 0);
      if (!meta || !faturamentoValor) return false;
      const limite = faturamentoValor * (meta / 100);
      return gasto > limite;
    });

    const categoriasEmAtencao = Object.keys(gastosPorCategoria || {}).filter(cat => {
      const gasto = utils.numero(gastosPorCategoria[cat] || 0);
      const meta = utils.numero(metasMap[cat] || 0);
      if (!meta || !faturamentoValor) return false;
      const limite = faturamentoValor * (meta / 100);
      return gasto >= limite * 0.8 && gasto <= limite;
    });

    let score = 100;
    if (saldoProjetado < 0) score -= 35;
    if (saldo < 0) score -= 20;
    if (contasVencidas > 0) score -= Math.min(20, contasVencidas * 5);
    if (totalPagar > totalReceber) score -= 10;
    if (categoriasAcimaMeta.length) score -= Math.min(20, categoriasAcimaMeta.length * 6);
    if (categoriasEmAtencao.length) score -= Math.min(10, categoriasEmAtencao.length * 3);
    score = Math.max(0, Math.min(100, score));

    let scoreTexto = "Excelente";
    let scoreClass = "ok";

    if (score < 40) {
      scoreTexto = "Crítico";
      scoreClass = "err";
    } else if (score < 60) {
      scoreTexto = "Atenção";
      scoreClass = "";
    } else if (score < 80) {
      scoreTexto = "Bom";
      scoreClass = "ok";
    }

    if (elScore) {
      elScore.textContent = score;
      elScore.className = `intel-score-value ${scoreClass}`.trim();
    }
    if (elScoreFill) elScoreFill.style.width = `${score}%`;
    if (elScoreDesc) elScoreDesc.textContent = `Classificação: ${scoreTexto}`;

    let saude = "Saudável";
    let saudeDesc = "Situação equilibrada do caixa.";
    let saudeClass = "ok";

    if (saldoProjetado < 0) {
      saude = "Crítico";
      saudeDesc = "O saldo projetado do mês está negativo.";
      saudeClass = "err";
    } else if (contasVencidas > 0 || totalPagar > totalReceber || categoriasAcimaMeta.length) {
      saude = "Atenção";
      saudeDesc = "Há pressão financeira no período.";
      saudeClass = "";
    }

    if (elSaude) {
      elSaude.textContent = saude;
      elSaude.className = `intel-value ${saudeClass}`.trim();
    }
    if (elSaudeDesc) elSaudeDesc.textContent = saudeDesc;

    if (elSaldoProjetado) {
      elSaldoProjetado.textContent = utils.moeda(saldoProjetado);
      elSaldoProjetado.className = `intel-value ${saldoProjetado < 0 ? "err" : "ok"}`;
    }

    let tendencia = "Estável";
    let tendenciaDesc = "Sem mudança brusca em relação ao ritmo atual.";

    const idx = this.mesesOrdem.indexOf(this.nomeMesCanonico(mes));
    let fatAnterior = 0;
    let gastosAnterior = 0;

    if (idx > 0) {
      const mesAnterior = this.mesesOrdem[idx - 1];

      const itemFatAnterior = (mesesAno || []).find(row =>
        this.nomeMesCanonico(row.mes || row.nome_mes || "") === mesAnterior &&
        Number(row.ano || row.exercicio || 0) === Number(ano)
      );
      fatAnterior = itemFatAnterior ? this.extrairValorMes(itemFatAnterior) : 0;

      gastosAnterior = utils.totalizar(
        (gastosAno || []).filter(item => this.nomeMesCanonico(item.mes) === mesAnterior),
        "valor"
      );
    }

    if (faturamentoValor > fatAnterior && totalGastos <= gastosAnterior) {
      tendencia = "Melhora";
      tendenciaDesc = "Receita subiu e gastos estão controlados.";
    } else if (faturamentoValor < fatAnterior && totalGastos > gastosAnterior) {
      tendencia = "Piora";
      tendenciaDesc = "Receita caiu e gastos cresceram.";
    } else if (faturamentoValor > fatAnterior) {
      tendencia = "Receita em alta";
      tendenciaDesc = "Faturamento acima do mês anterior.";
    }

    if (elTendencia) {
      elTendencia.textContent = tendencia;
      elTendencia.className = `intel-value ${tendencia === "Piora" ? "err" : tendencia === "Melhora" ? "ok" : ""}`.trim();
    }
    if (elTendenciaDesc) elTendenciaDesc.textContent = tendenciaDesc;

    let risco = "Controlado";
    let riscoDesc = "Sem risco financeiro dominante.";

    if (contasVencidas > 0) {
      risco = "Contas vencidas";
      riscoDesc = `${contasVencidas} conta(s) em atraso exigem atenção imediata.`;
    } else if (categoriasAcimaMeta.length) {
      risco = "Meta estourada";
      riscoDesc = `Categoria(s) acima da meta: ${categoriasAcimaMeta.join(", ")}.`;
    } else if (maiorContaPagar > 0) {
      risco = "Alta saída";
      riscoDesc = `Maior conta pendente: ${utils.moeda(maiorContaPagar)}.`;
    }

    if (elRisco) elRisco.textContent = risco;
    if (elRiscoDesc) elRiscoDesc.textContent = riscoDesc;

    let pressao = "Baixa";
    let pressaoDesc = "Entradas cobrem bem as saídas.";

    if (totalPagar > totalReceber) {
      pressao = "Alta";
      pressaoDesc = "Saídas pendentes maiores que recebimentos pendentes.";
    } else if (totalPagar >= totalReceber * 0.85 && totalPagar > 0) {
      pressao = "Moderada";
      pressaoDesc = "Margem de caixa reduzida para o período.";
    }

    if (elPressao) elPressao.textContent = pressao;
    if (elPressaoDesc) elPressaoDesc.textContent = pressaoDesc;

    const alertas = [];

    if (contasVencidas > 0) {
      alertas.push(`
        <button type="button" class="intel-item critico alert-clickable" onclick="dashboardModule.executarAcaoAlerta('vencidas')">
          Existem ${contasVencidas} conta(s) vencida(s).
        </button>
      `);
    }

    if (saldoProjetado < 0) {
      alertas.push(`<div class="intel-item critico">O saldo projetado do mês pode fechar negativo.</div>`);
    }

    if (totalPagar > totalReceber) {
      alertas.push(`<div class="intel-item alerta">As saídas pendentes superam os recebimentos pendentes.</div>`);
    }

    categoriasAcimaMeta.forEach(cat => {
      alertas.push(`
        <button type="button" class="intel-item alerta alert-clickable" onclick="dashboardModule.executarAcaoAlerta('categoria:${cat}')">
          ${cat} está acima da meta.
        </button>
      `);
    });

    if (!alertas.length) {
      alertas.push(`<div class="intel-item ok">Nenhum alerta crítico identificado no momento.</div>`);
    }

    if (elAlertas) elAlertas.innerHTML = alertas.join("");

    const recomendacoes = [];

    if (saldoProjetado < 0) {
      recomendacoes.push(`<div class="intel-item alerta">Revise gastos e antecipe recebimentos para evitar fechamento negativo.</div>`);
    }

    if (contasVencidas > 0) {
      recomendacoes.push(`
        <button type="button" class="intel-item alerta alert-clickable" onclick="dashboardModule.executarAcaoAlerta('vencidas')">
          Priorize o pagamento das contas vencidas imediatamente.
        </button>
      `);
    }

    if (categoriasAcimaMeta.length) {
      recomendacoes.push(`<div class="intel-item alerta">Reveja despesas das categorias acima da meta para aliviar o caixa.</div>`);
    }

    if (projetadoReceitaFimMes > faturamentoValor && saldoProjetado > 0) {
      recomendacoes.push(`<div class="intel-item ok">O ritmo atual sugere fechamento melhor até o fim do mês.</div>`);
    }

    if (!recomendacoes.length) {
      recomendacoes.push(`<div class="intel-item ok">Mantenha o ritmo atual e continue monitorando metas e vencimentos.</div>`);
    }

    if (elRecomendacoes) elRecomendacoes.innerHTML = recomendacoes.join("");

    if (elComparativo) {
      const variacaoFat = fatAnterior > 0 ? ((faturamentoValor - fatAnterior) / fatAnterior) * 100 : 0;
      const variacaoGastos = gastosAnterior > 0 ? ((totalGastos - gastosAnterior) / gastosAnterior) * 100 : 0;

      elComparativo.innerHTML = `
        <div class="intel-mini">
          <div>
            <strong>Faturamento</strong><br>
            <span>${utils.moeda(faturamentoValor)}</span>
          </div>
          <span class="intel-tag ${variacaoFat < 0 ? "err" : "ok"}">${utils.arredondar(variacaoFat, 1)}%</span>
        </div>

        <div class="intel-mini">
          <div>
            <strong>Gastos</strong><br>
            <span>${utils.moeda(totalGastos)}</span>
          </div>
          <span class="intel-tag ${variacaoGastos > 0 ? "err" : "ok"}">${utils.arredondar(variacaoGastos, 1)}%</span>
        </div>

        <div class="intel-mini">
          <div>
            <strong>Receita projetada</strong><br>
            <span>${utils.moeda(projetadoReceitaFimMes)}</span>
          </div>
          <span class="intel-tag">Ritmo diário</span>
        </div>
      `;
    }

    if (elImpactos) {
      const fornecedorNome = maiorContaPagarObj?.fornecedor || "-";
      const clienteNome = maiorReceberObj?.cliente || "-";

      elImpactos.innerHTML = `
        <div class="intel-mini">
          <div>
            <strong>Maior fornecedor</strong><br>
            <span>${fornecedorNome}</span>
          </div>
          <span class="intel-tag">${utils.moeda(maiorContaPagar)}</span>
        </div>

        <div class="intel-mini">
          <div>
            <strong>Maior cliente</strong><br>
            <span>${clienteNome}</span>
          </div>
          <span class="intel-tag">${utils.moeda(maiorReceber)}</span>
        </div>

        <div class="intel-mini">
          <div>
            <strong>Saldo projetado</strong><br>
            <span>${saldoProjetado < 0 ? "Risco de fechamento negativo" : "Fechamento positivo"}</span>
          </div>
          <span class="intel-tag">${utils.moeda(saldoProjetado)}</span>
        </div>
      `;
    }

    if (elCategorias) {
      const categoriasOrdenadas = Object.keys(gastosPorCategoria || {})
        .map(cat => {
          const gasto = utils.numero(gastosPorCategoria[cat] || 0);
          const metaPerc = utils.numero(metasMap[cat] || 0);
          const limite = faturamentoValor > 0 ? faturamentoValor * (metaPerc / 100) : 0;
          const uso = limite > 0 ? (gasto / limite) * 100 : 0;
          return { cat, gasto, uso };
        })
        .filter(item => item.gasto > 0)
        .sort((a, b) => b.uso - a.uso)
        .slice(0, 3);

      elCategorias.innerHTML = categoriasOrdenadas.length
        ? categoriasOrdenadas.map(item => `
            <div class="intel-mini">
              <div>
                <strong>${item.cat}</strong><br>
                <span>${utils.moeda(item.gasto)}</span>
              </div>
              <span class="intel-tag ${item.uso > 100 ? "err" : item.uso >= 80 ? "" : "ok"}">
                ${item.uso ? `${utils.arredondar(item.uso, 0)}%` : "Sem meta"}
              </span>
            </div>
          `).join("")
        : `<div class="intel-item ok">Sem categorias relevantes para análise no período.</div>`;
    }
  },

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
