window.resumoModule = {

  async carregarResumoAnual() {
    const tbody = document.getElementById("tabelaResumoAnual");

    tbody.innerHTML = `
      <tr><td>Janeiro</td><td>R$ 0</td><td>R$ 0</td><td>R$ 0</td></tr>
    `;
  }

};
