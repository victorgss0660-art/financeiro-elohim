window.planejamentoModule = {

  contasPagar: [],
  contasReceber: [],
  saldos: [],
  chart: null,

  get(id){
    return document.getElementById(id);
  },

  numero(v){
    if (!v) return 0;
    return parseFloat(String(v).replace(",", ".")) || 0;
  },

  moeda(v){
    return new Intl.NumberFormat("pt-BR", {
      style:"currency",
      currency:"BRL"
    }).format(this.numero(v));
  },

  async carregar(){
    try{
      this.saldos = await api.restGet("saldos_bancarios","select=*");
      this.contasPagar = await api.restGet("contas_pagar","select=*");
      this.contasReceber = await api.restGet("contas_receber","select=*");

      this.renderizar();

    }catch(e){
      console.error(e);
      alert("Erro ao carregar planejamento");
    }
  },

  saldoInicial(){
    return this.saldos.reduce((t,s)=>t+this.numero(s.saldo),0);
  },

  renderizar(){

    // ===== SALDOS =====
    const tabelaSaldos = this.get("tabelaSaldosBancarios");

    tabelaSaldos.innerHTML = this.saldos.map(s => `
      <tr>
        <td>${s.conta}</td>
        <td>${this.moeda(s.saldo)}</td>
        <td>
          <button onclick="planejamentoModule.editarSaldo(${s.id})">
            Editar
          </button>
        </td>
      </tr>
    `).join("");

    // ===== FLUXO =====
    const tabela = this.get("tabelaPlanejamento");

    let hoje = new Date();
    let saldo = this.saldoInicial();

    let totalReceber = 0;
    let totalPagar = 0;

    let menorSaldo = saldo;
    let semanaCritica = "-";

    let labels = [];
    let entradas = [];
    let saidas = [];
    let caixa = [];

    let html = "";

    for(let i=0;i<12;i++){

      const inicio = new Date(hoje);
      inicio.setDate(inicio.getDate() + (i*7));

      const fim = new Date(inicio);
      fim.setDate(fim.getDate() + 6);

      const inicioStr = inicio.toISOString().slice(0,10);
      const fimStr = fim.toISOString().slice(0,10);

      const receber = this.contasReceber
        .filter(c => c.vencimento >= inicioStr && c.vencimento <= fimStr)
        .reduce((t,c)=>t+this.numero(c.valor),0);

      const pagar = this.contasPagar
        .filter(c => c.vencimento >= inicioStr && c.vencimento <= fimStr && c.status !== "pago")
        .reduce((t,c)=>t+this.numero(c.valor),0);

      const saldoAntes = saldo;
      const resultado = receber - pagar;

      saldo += resultado;

      totalReceber += receber;
      totalPagar += pagar;

      if(saldo < menorSaldo){
        menorSaldo = saldo;
        semanaCritica = i+1;
      }

      const risco = saldo < 0;

      html += `
        <tr style="${risco ? 'background:#fee2e2' : ''}">
          <td>${i+1}</td>
          <td>${inicioStr} até ${fimStr}</td>
          <td>${this.moeda(saldoAntes)}</td>
          <td style="color:#22c55e">${this.moeda(receber)}</td>
          <td style="color:#ef4444">${this.moeda(pagar)}</td>
          <td style="font-weight:bold">${this.moeda(resultado)}</td>
          <td style="font-weight:bold;color:${risco ? '#ef4444' : '#22c55e'}">
            ${this.moeda(saldo)}
          </td>
          <td>${risco ? "⚠️ Risco" : "OK"}</td>
        </tr>
      `;

      labels.push("S"+(i+1));
      entradas.push(receber);
      saidas.push(pagar);
      caixa.push(saldo);
    }

    tabela.innerHTML = html;

    // ===== CARDS =====
    this.get("planejamentoSaldoInicial").textContent = this.moeda(this.saldoInicial());
    this.get("planejamentoTotalReceber").textContent = this.moeda(totalReceber);
    this.get("planejamentoTotalPagar").textContent = this.moeda(totalPagar);
    this.get("planejamentoSaldoFinal").textContent = this.moeda(saldo);

    // ===== INDICADORES CFO =====
    this.get("planejamentoMenorSaldo").textContent = this.moeda(menorSaldo);
    this.get("planejamentoSemanaCritica").textContent = semanaCritica;

    if(menorSaldo < 0){
      this.get("planejamentoStatusCaixa").textContent = "CRÍTICO";
      this.get("planejamentoStatusCaixa").style.color = "#ef4444";
      this.get("planejamentoNecessidadeCaixa").textContent = this.moeda(Math.abs(menorSaldo));
    } else {
      this.get("planejamentoStatusCaixa").textContent = "SAUDÁVEL";
      this.get("planejamentoStatusCaixa").style.color = "#22c55e";
      this.get("planejamentoNecessidadeCaixa").textContent = "R$ 0,00";
    }

    // ===== GRÁFICO =====
    this.renderizarGrafico(labels, entradas, saidas, caixa);
  },

  renderizarGrafico(labels, entradas, saidas, caixa){

    const canvas = this.get("chartPlanejamento");
    if(!canvas || typeof Chart === "undefined") return;

    if(this.chart) this.chart.destroy();

    this.chart = new Chart(canvas,{
      data:{
        labels,
        datasets:[
          {
            type:"bar",
            label:"Entradas",
            data:entradas,
            backgroundColor:"#22c55e"
          },
          {
            type:"bar",
            label:"Saídas",
            data:saidas,
            backgroundColor:"#ef4444"
          },
          {
            type:"line",
            label:"Saldo",
            data:caixa,
            borderColor:"#38bdf8",
            borderWidth:3,
            tension:0.4
          }
        ]
      },
      options:{
        responsive:true,
        maintainAspectRatio:false
      }
    });
  },

  async editarSaldo(id){

    const item = this.saldos.find(s => s.id == id);
    if(!item) return;

    const novo = prompt("Novo saldo:", item.saldo);
    if(novo === null) return;

    await api.update("saldos_bancarios", id, {
      saldo: this.numero(novo)
    });

    this.carregar();
  }

};

window.carregarPlanejamento = () => planejamentoModule.carregar();
