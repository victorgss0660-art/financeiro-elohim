window.contasPagasModule = {
  dados: [],
  filtrados: [],

  get(id) {
    return document.getElementById(id);
  },

  valor(id) {
    return this.get(id)?.value || "";
  },

  numero(valor) {
    if (typeof valor === "number") return valor;
    if (valor === null || valor === undefined || valor === "") return 0;

    let txt = String(valor).trim();
    txt = txt.replace(/R\$/g, "").replace(/\s/g, "");

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

  async carregar() {
    await this.listar();
  },

  async listar() {
    try {
      const dados = await api.restGet(
        "contas_pagar",
        "select=*&order=data_pagamento.desc.nullslast,vencimento.desc"
      );

      this.dados = Array.isArray(dados)
        ? dados.filter(item => String(item.status || "").toLowerCase() === "pago")
        : [];

      this.filtrados = [...this.dados];

      this.renderizar();
      this.resumo();
    } catch (error) {
      console.error(error);
      alert("Erro ao carregar contas pagas.");
    }
  },

  renderizar() {
    const tbody = this.get("tabelaContasPagas");
    if (!tbody) return;

    const lista = this.filtrados || [];

    if (!lista.length) {
      tbody.innerHTML = `<tr><td colspan="8">Nenhuma conta paga encontrada.</td></tr>`;
      return;
    }

    tbody.innerHTML = lista.map(item => `
      <tr>
        <td>${item.fornecedor || "-"}</td>
        <td>${item.documento || "-"}</td>
        <td>${item.categoria || "-"}</td>
        <td>${this.dataBR(item.vencimento)}</td>
        <td>${this.dataBR(item.data_pagamento)}</td>
        <td>${item.descricao || "-"}</td>
        <td>${this.moeda(item.valor)}</td>
        <td>
          <button class="btn-excluir" onclick="contasPagasModule.cancelar(${item.id})">
            Cancelar
          </button>
        </td>
      </tr>
    `).join("");
  },

  resumo() {
    const soma = this.filtrados.reduce((acc, item) => acc + this.numero(item.valor), 0);

    if (this.get("pagasQtd")) this.get("pagasQtd").textContent = this.filtrados.length;
    if (this.get("pagasTotal")) this.get("pagasTotal").textContent = this.moeda(soma);
  },

  aplicarFiltros() {
    const busca = this.valor("pagasBusca").toLowerCase();
    const dtIni = this.valor("pagasDataInicio");
    const dtFim = this.valor("pagasDataFim");

    this.filtrados = this.dados.filter(item => {
      const texto = `
        ${item.fornecedor || ""}
        ${item.documento || ""}
        ${item.categoria || ""}
        ${item.descricao || ""}
      `.toLowerCase();

      const dataPg = item.data_pagamento || "";

      if (busca && !texto.includes(busca)) return false;
      if (dtIni && dataPg < dtIni) return false;
      if (dtFim && dataPg > dtFim) return false;

      return true;
    });

    this.renderizar();
    this.resumo();
  },

  limparFiltros() {
    ["pagasBusca", "pagasDataInicio", "pagasDataFim"].forEach(id => {
      const el = this.get(id);
      if (el) el.value = "";
    });

    this.filtrados = [...this.dados];
    this.renderizar();
    this.resumo();
  },

  async cancelar(id) {
    if (!confirm("Deseja cancelar este pagamento? A conta voltará para Contas a Pagar.")) return;

    try {
      await api.update("contas_pagar", id, {
        status: "pendente",
        data_pagamento: null,
        multa: 0,
        desconto: 0
      });

      await this.listar();

      if (window.contasPagarModule?.carregar) {
        await contasPagarModule.carregar();
      }

      alert("Pagamento cancelado.");
    } catch (error) {
      console.error(error);
      alert("Erro ao cancelar pagamento.");
    }
  }
};

window.listarContasPagas = () => contasPagasModule.listar();
