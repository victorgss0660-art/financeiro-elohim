window.contasPagarModule = {
  lista: [],

  async carregarContasPagar() {
    try {
      const data = await api.restGet(
        "contas_pagar",
        "select=*&order=vencimento.asc"
      );

      this.lista = Array.isArray(data) ? data : [];

      this.preencherFiltros();
      this.render();
    } catch (e) {
      utils.setAppMsg("Erro ao carregar contas", "err");
    }
  },

  preencherFiltros() {
    const fornecedores = [...new Set(this.lista.map(i => i.fornecedor).filter(Boolean))];
    const categorias = [...new Set(this.lista.map(i => i.categoria).filter(Boolean))];

    const f = document.getElementById("filtroFornecedor");
    const c = document.getElementById("filtroCategoria");

    if (f) {
      f.innerHTML = `<option value="">Fornecedor</option>` +
        fornecedores.map(i => `<option>${i}</option>`).join("");
    }

    if (c) {
      c.innerHTML = `<option value="">Categoria</option>` +
        categorias.map(i => `<option>${i}</option>`).join("");
    }
  },

  getFiltros() {
    return {
      busca: document.getElementById("filtroBusca")?.value.toLowerCase() || "",
      fornecedor: document.getElementById("filtroFornecedor")?.value || "",
      categoria: document.getElementById("filtroCategoria")?.value || "",
      status: document.getElementById("filtroStatus")?.value || "",
      docs: document.getElementById("filtroDocs")?.value || "",
      inicio: document.getElementById("filtroDataInicio")?.value || "",
      fim: document.getElementById("filtroDataFim")?.value || ""
    };
  },

  getStatus(item) {
    const hoje = new Date();
    hoje.setHours(0,0,0,0);

    if (item.status === "pago") return "pago";

    if (item.vencimento) {
      const d = new Date(item.vencimento + "T00:00:00");
      if (d < hoje) return "vencido";
    }

    return "aberto";
  },

  filtrar() {
    const f = this.getFiltros();

    return this.lista.filter(item => {
      const texto = (
        item.fornecedor +
        item.descricao +
        item.documento
      ).toLowerCase();

      if (f.busca && !texto.includes(f.busca)) return false;
      if (f.fornecedor && item.fornecedor !== f.fornecedor) return false;
      if (f.categoria && item.categoria !== f.categoria) return false;

      const status = this.getStatus(item);
      if (f.status && status !== f.status) return false;

      if (f.docs === "faltando_nfe" && item.tem_nfe) return false;
      if (f.docs === "faltando_boleto" && item.tem_boleto) return false;

      if (f.inicio && item.vencimento < f.inicio) return false;
      if (f.fim && item.vencimento > f.fim) return false;

      if (item.status === "pago") return false;

      return true;
    });
  },

  render() {
    const tbody = document.getElementById("tabelaContasPagar");
    if (!tbody) return;

    const dados = this.filtrar();

    if (!dados.length) {
      tbody.innerHTML = `<tr><td colspan="8">Nenhuma conta</td></tr>`;
      return;
    }

    tbody.innerHTML = dados.map(item => {
      const status = this.getStatus(item);

      return `
        <tr>
          <td>${item.fornecedor}</td>
          <td>${item.descricao}</td>
          <td>${item.categoria}</td>
          <td>${utils.moeda(item.valor)}</td>
          <td>${item.vencimento}</td>
          <td>${status}</td>
          <td>
            ${item.tem_nfe ? "NF OK" : "NF"}
            ${item.tem_boleto ? "Boleto OK" : "Boleto"}
          </td>
          <td>
            <button onclick="contasPagarModule.pagar(${item.id})">Pagar</button>
            <button onclick="contasPagarModule.excluir(${item.id})">X</button>
          </td>
        </tr>
      `;
    }).join("");
  },

  async pagar(id) {
    await api.restPatch("contas_pagar", `id=eq.${id}`, {
      status: "pago",
      data_pagamento: new Date().toISOString().slice(0,10)
    });

    this.carregarContasPagar();
  },

  async excluir(id) {
    await api.restDelete("contas_pagar", `id=eq.${id}`);
    this.carregarContasPagar();
  }
};
