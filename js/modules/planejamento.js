window.planejamentoModule = {
  async carregar() {
    try {
      const saldos = await api.restGet("saldos_bancarios", "select=*");
      const pagar = await api.restGet("contas_pagar", "select=*");
      const receber = await api.restGet("contas_receber", "select=*");

      console.log("SALDOS:", saldos);
      console.log("PAGAR:", pagar);
      console.log("RECEBER:", receber);

      const tabelaSaldos = document.getElementById("tabelaSaldosBancarios");

      if (tabelaSaldos) {
        tabelaSaldos.innerHTML = saldos.map(s => `
          <tr>
            <td>${s.conta}</td>
            <td>R$ ${Number(s.saldo).toFixed(2)}</td>
            <td>-</td>
          </tr>
        `).join("");
      }

    } catch (e) {
      console.error(e);
      alert("Erro ao carregar planejamento");
    }
  }
};

window.carregarPlanejamento = () => planejamentoModule.carregar();
