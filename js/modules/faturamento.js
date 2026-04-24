window.faturamentoModule = {
  async carregar() {
    await this.listar();
  },

  async salvar() {
    const mes = document.getElementById("fatMes").value;
    const ano = Number(document.getElementById("fatAno").value);

    const faturado = this.numero(
      document.getElementById("fatReal").value
    );

    const aFaturar = this.numero(
      document.getElementById("fatPrevisto").value
    );

    const faturamento = faturado + aFaturar;

    const existente = await api.select("meses", { mes, ano });

    if (existente.length) {
      await api.update(
        "meses",
        existente[0].id,
        {
          mes,
          ano,
          faturado,
          a_faturar: aFaturar,
          faturamento
        }
      );
    } else {
      await api.insert("meses", {
        mes,
        ano,
        faturado,
        a_faturar: aFaturar,
        faturamento
      });
    }

    alert("Faturamento salvo.");
    await this.listar();
  },

  async listar() {
    const ano = Number(document.getElementById("fatAno").value);

    const dados = await api.select("meses", { ano });

    const tbody = document.getElementById("fatTabela");

    tbody.innerHTML = dados
      .sort((a, b) => a.id - b.id)
      .map(item => `
        <tr>
          <td>${item.mes}</td>
          <td>${this.moeda(item.faturado || 0)}</td>
          <td>${this.moeda(item.a_faturar || 0)}</td>
          <td>${this.moeda(item.faturamento || 0)}</td>
        </tr>
      `).join("");
  },

  numero(v) {
    return Number(
      String(v || 0)
        .replace(/\./g, "")
        .replace(",", ".")
    ) || 0;
  },

  moeda(v) {
    return Number(v || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
  }
};
