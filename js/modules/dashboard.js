window.dashboardModule = {

  contasPagar: [],
  contasReceber: [],

  async carregar() {
    try {

      const pagar = await api.restGet("contas_pagar","select=*");
      const receber = await api.restGet("contas_receber","select=*");

      this.contasPagar = pagar || [];
      this.contasReceber = receber || [];

      this.renderKPIs();
      this.renderInteligencia();

    } catch (e) {
      console.error("Erro dashboard:", e);
    }
  },

  numero(v){
    return parseFloat(v || 0) || 0;
  },

  moeda(v){
    return v.toLocaleString("pt-BR", {
      style:"currency",
      currency:"BRL"
    });
  },

  hoje(){
    return new Date().toISOString().slice(0,10);
  },

  // ===== BASE =====
  contasAbertas(){
    return this.contasPagar.filter(c => c.status !== "pago");
  },

  receberAberto(){
    return this.contasReceber.filter(c => c.status !== "recebido");
  },

  soma(lista){
    return lista.reduce((t,c)=>t+this.numero(c.valor),0);
  },

  // ===== KPI =====
  renderKPIs(){

    const pagar = this.contasAbertas();
    const receber = this.receberAberto();

    const totalPagar = this.soma(pagar);
    const totalReceber = this.soma(receber);

    const saldo = totalReceber - totalPagar;

    this.set("dashCEOReceberAberto", this.moeda(totalReceber));
    this.set("dashCEOPagarAberto", this.moeda(totalPagar));
    this.set("dashCEOSaldoProjetado", this.moeda(saldo));

  },

  // ===== INTELIGÊNCIA =====
  renderInteligencia(){

    const pagar = this.contasAbertas();
    const receber = this.receberAberto();

    const totalPagar = this.soma(pagar);
    const totalReceber = this.soma(receber);

    const saldo = totalReceber - totalPagar;

    const hoje = new Date();

    // ===== FLUXO MÉDIO =====
    const saidaMensal = totalPagar / 3; // aproximação
    const entradaMensal = totalReceber / 3;

    const fluxoMensal = entradaMensal - saidaMensal;

    // ===== DIAS DE CAIXA =====
    let diasCaixa = 999;

    if (saidaMensal > 0) {
      diasCaixa = (saldo / saidaMensal) * 30;
    }

    // ===== STATUS =====
    let status = "SAUDÁVEL";
    let detalhe = "Situação financeira controlada";

    if (saldo < 0) {
      status = "CRÍTICO";
      detalhe = "Você irá ficar sem caixa com os compromissos atuais";
    }
    else if (diasCaixa < 30) {
      status = "ATENÇÃO";
      detalhe = "Caixa cobre menos de 30 dias";
    }
    else if (diasCaixa < 60) {
      status = "MODERADO";
      detalhe = "Situação exige monitoramento";
    }

    // ===== OUTPUT =====
    this.set("dashCEOStatus", status);
    this.set("dashCEOStatusDetalhe", detalhe);

    this.set("dashCEODiasCaixa", Math.floor(diasCaixa) + " dias");
    this.set("dashCEOFluxoMensal", this.moeda(fluxoMensal));

    const el = document.getElementById("dashCEOStatus");
    if (el) {
      el.className =
        status === "CRÍTICO" ? "status-critico" :
        status === "ATENÇÃO" ? "status-alerta" :
        "status-ok";
    }
  },

  set(id,val){
    const el = document.getElementById(id);
    if(el) el.textContent = val;
  }

};
