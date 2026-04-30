window.planejamentoModule = {

  contasPagar: [],
  contasReceber: [],
  saldos: [],

  get(id){
    return document.getElementById(id);
  },

  numero(v){
    if(!v) return 0;
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
      </tr>
    `).join("");

    // ===== FLUXO =====
    const tabela = this.get("tabelaPlanejamento");

    let hoje = new Date();
    let saldo = this.saldoInicial();

    let totalReceber = 0;
    let totalPagar = 0;

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

      saldo += (receber - pagar);

      totalReceber += receber;
      totalPagar += pagar;

      html += `
        <tr>
          <td>${i+1}</td>
          <td>${inicioStr} até ${fimStr}</td>
          <td>${this.moeda(receber)}</td>
          <td>${this.moeda(pagar)}</td>
          <td>${this.moeda(saldo)}</td>
        </tr>
      `;
    }

    tabela.innerHTML = html;

    // ===== CARDS =====
    this.get("planejamentoSaldoInicial").textContent = this.moeda(this.saldoInicial());
    this.get("planejamentoTotalReceber").textContent = this.moeda(totalReceber);
    this.get("planejamentoTotalPagar").textContent = this.moeda(totalPagar);
    this.get("planejamentoSaldoFinal").textContent = this.moeda(saldo);
  }

};

window.carregarPlanejamento = () => planejamentoModule.carregar();
