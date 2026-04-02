window.planejamentoModule = {

  async carregarPlanejamento() {
    const tbody = document.getElementById("tabelaPlanejamento");

    tbody.innerHTML = `
      <tr><td>Semana 1</td><td>R$ 0</td><td>R$ 0</td><td>R$ 0</td></tr>
    `;
  }

};
