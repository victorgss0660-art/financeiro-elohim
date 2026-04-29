window.planejamentoModule = {
  contasPagar: [],
  contasReceber: [],
  saldos: [],

  get(id) {
    return document.getElementById(id);
  },

  numero(valor) {
    if (typeof valor === "number") return valor;
    if (valor === null || valor === undefined || valor === "") return 0;

    let txt = String(valor).trim().replace(/R\$/g, "").replace(/\s/g, "");

    const temVirgula = txt.includes(",");
    const temPonto = txt.includes(".");

    if (temVirgula && temPonto) {
      txt = txt.replace(/\./g, "").replace(",", ".");
    } else if (temVirgula && !temPonto) {
      txt = txt.replace(",", ".");
    }

    const n = parseFloat(txt);
    return isNaN(n) ? 0 : n;
  },

  moeda(valor) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(this.numero(valor));
  },

  dataBR(data) {
    if (!data) return "-";
    const d = new Date(data + "T00:00:00");
    if (isNaN(d.getTime())) return data;
    return d.toLocaleDateString("pt-BR");
  },

  addDias(data, dias) {
    const d = new Date(data + "T00:00:00");
    d.setDate(d.getDate() + dias);
    return d.toISOString().slice(0, 10);
  },

  inicioSemana(data) {
    const d = new Date(data + "T00:00:00");
    const dia = d.getDay();
    const ajuste = dia === 0 ? -6 : 1 - dia;
    d.setDate(d.getDate() + ajuste);
    return d.toISOString().slice(0, 10);
  },

  async carregar() {
    try {
      const pagar = await api.restGet("contas_pagar", "select=*");
      const receber = await api.restGet("contas_receber", "select=*");
      const saldos = await api.restGet("saldos_bancarios", "select=*");

      this.contasPagar = Array.isArray(pagar) ? pagar : [];
      this.contasReceber = Array.isArray(receber) ? receber : [];
      this.saldos = Array.isArray(saldos) ? saldos : [];

      this.renderizarSaldos();
      this.renderizarPlanejamento();
    } catch (error) {
      console.error(error);
      alert("Erro ao carregar planejamento.");
    }
  },

  saldoInicialTotal() {
    return this.saldos.reduce(
      (acc, item) => acc + this.numero(item.saldo),
      0
    );
  },

renderizarSaldos() {
  const tbody = this.get("tabelaSaldosBancarios");
  const totalEl = this.get("planejamentoSaldoInicial");

  if (totalEl) {
    totalEl.textContent = this.moeda(this.saldoInicialTotal());
  }

  if (!tbody) return;

  if (!this.saldos.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="3">Nenhum saldo bancário encontrado.</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = this.saldos.map(item => `
    <tr>
      <td>${item.conta || "-"}</td>
      <td><strong>${this.moeda(item.saldo)}</strong></td>
      <td>
        <button
          class="btn-editar"
          onclick="planejamentoModule.editarSaldoBanco(${Number(item.id)})"
        >
          Editar
        </button>
      </td>
    </tr>
  `).join("");
},

  renderizarPlanejamento() {
    const tbody = this.get("tabelaPlanejamento");
    if (!tbody) return;

    const hoje = new Date().toISOString().slice(0, 10);
    let inicio = this.inicioSemana(hoje);

    let saldoAcumulado = this.saldoInicialTotal();

    let totalReceber = 0;
    let totalPagar = 0;

    let linhas = "";

    for (let i = 0; i < 12; i++) {
      const fim = this.addDias(inicio, 6);

      const receberSemana = this.contasReceber
        .filter(item => {
          const status = String(item.status || "pendente").toLowerCase();
          const data = item.vencimento || "";

          return status !== "recebido" && data >= inicio && data <= fim;
        })
        .reduce((acc, item) => acc + this.numero(item.valor), 0);

      const pagarSemana = this.contasPagar
        .filter(item => {
          const status = String(item.status || "pendente").toLowerCase();
          const data = item.vencimento || "";

          return status !== "pago" && data >= inicio && data <= fim;
        })
        .reduce((acc, item) => acc + this.numero(item.valor), 0);

      const saldoAntes = saldoAcumulado;
      const saldoSemana = receberSemana - pagarSemana;
      saldoAcumulado += saldoSemana;

      totalReceber += receberSemana;
      totalPagar += pagarSemana;

      linhas += `
        <tr>
          <td>${i + 1}</td>
          <td>${this.dataBR(inicio)} até ${this.dataBR(fim)}</td>
          <td>${this.moeda(saldoAntes)}</td>
          <td>${this.moeda(receberSemana)}</td>
          <td>${this.moeda(pagarSemana)}</td>
          <td style="font-weight:800;color:${saldoSemana >= 0 ? "#16a34a" : "#dc2626"}">
            ${this.moeda(saldoSemana)}
          </td>
          <td style="font-weight:900;color:${saldoAcumulado >= 0 ? "#16a34a" : "#dc2626"}">
            ${this.moeda(saldoAcumulado)}
          </td>
        </tr>
      `;

      inicio = this.addDias(inicio, 7);
    }

    linhas += `
      <tr style="font-weight:900;background:#f8fafc">
        <td colspan="3">TOTAL 12 SEMANAS</td>
        <td>${this.moeda(totalReceber)}</td>
        <td>${this.moeda(totalPagar)}</td>
        <td>${this.moeda(totalReceber - totalPagar)}</td>
        <td>${this.moeda(saldoAcumulado)}</td>
      </tr>
    `;

    tbody.innerHTML = linhas;

    const receberEl = this.get("planejamentoTotalReceber");
    const pagarEl = this.get("planejamentoTotalPagar");
    const saldoFinalEl = this.get("planejamentoSaldoFinal");

    if (receberEl) receberEl.textContent = this.moeda(totalReceber);
    if (pagarEl) pagarEl.textContent = this.moeda(totalPagar);
    if (saldoFinalEl) saldoFinalEl.textContent = this.moeda(saldoAcumulado);
  }
};
async editarSaldoBanco(id) {
  const item = this.saldos.find(x => Number(x.id) === Number(id));
  if (!item) return;

  const novoSaldo = prompt(
    `Novo saldo para ${item.conta}:`,
    String(item.saldo || 0).replace(".", ",")
  );

  if (novoSaldo === null) return;

  const valor = this.numero(novoSaldo);

  try {
    await api.update("saldos_bancarios", id, {
      saldo: valor
    });

    await this.carregar();

    alert("Saldo atualizado com sucesso.");
  } catch (error) {
    console.error(error);
    alert("Erro ao atualizar saldo bancário.");
  }
}

window.carregarPlanejamento = () => planejamentoModule.carregar();
