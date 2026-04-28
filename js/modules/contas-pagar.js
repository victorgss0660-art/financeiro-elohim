window.contasPagarModule = {
  dados: [],

  async carregar() {
    await this.listar();
  },

  numero(valor) {
    if (typeof valor === "number") return valor;
    if (!valor) return 0;

    let txt = String(valor)
      .replace(/R\$/g, "")
      .replace(/\./g, "")
      .replace(",", ".")
      .trim();

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
    if (isNaN(d)) return data;

    return d.toLocaleDateString("pt-BR");
  },

  get(id) {
    return document.getElementById(id);
  },

  valor(id) {
    return this.get(id)?.value || "";
  },

async listar() {
  try {
    console.log("Buscando contas_pagar no Supabase...");

    let dados = await api.restGet(
      "contas_pagar",
      "select=*"
    );

    console.log("Dados recebidos:", dados);

    dados = Array.isArray(dados) ? dados : [];

    this.dados = dados
      .filter((item) => {
        const status = String(item.status || "pendente").trim().toLowerCase();
        return status !== "pago";
      })
      .sort((a, b) => {
        const da = new Date(a.vencimento || "2999-12-31");
        const db = new Date(b.vencimento || "2999-12-31");
        return da - db;
      });

    this.renderizar();

  } catch (error) {
    console.error("Erro ao carregar contas a pagar:", error);
    alert("Erro ao carregar contas a pagar: " + error.message);
  }
}

  renderizar() {
    const tbody = this.get("tabelaContasPagar");
    if (!tbody) return;

    if (!this.dados.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8">Nenhuma conta encontrada.</td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = this.dados.map((item) => `
      <tr>
        <td>${item.fornecedor || "-"}</td>
        <td>${item.documento || "-"}</td>
        <td>${this.moeda(item.valor)}</td>
        <td>${this.dataBR(item.vencimento)}</td>
        <td>${item.categoria || "-"}</td>
        <td>${item.descricao || "-"}</td>

        <td>
          <button onclick="contasPagarModule.toggleNfe(${item.id})">
            ${item.tem_nfe ? "NFE OK" : "NFE"}
          </button>

          <button onclick="contasPagarModule.toggleBoleto(${item.id})">
            ${item.tem_boleto ? "Boleto OK" : "Boleto"}
          </button>
        </td>

        <td>
          <button onclick="contasPagarModule.pagar(${item.id})">
            Pagar
          </button>
        </td>
      </tr>
    `).join("");
  },

  async salvar() {
    try {
      const payload = {
        fornecedor: this.valor("cpFornecedor"),
        documento: this.valor("cpDocumento"),
        categoria: this.valor("cpCategoria"),
        vencimento: this.valor("cpVencimento"),
        valor: this.numero(this.valor("cpValor")),
        descricao: this.valor("cpDescricao"),
        tem_nfe: this.valor("cpNfe") !== "",
        tem_boleto: this.valor("cpBoleto") === "true",
        status: "pendente"
      };

      if (!payload.fornecedor) {
        alert("Informe fornecedor.");
        return;
      }

      await api.insert("contas_pagar", payload);

      [
        "cpFornecedor",
        "cpDocumento",
        "cpCategoria",
        "cpVencimento",
        "cpValor",
        "cpNfe",
        "cpDescricao"
      ].forEach(id => {
        if (this.get(id)) this.get(id).value = "";
      });

      await this.listar();

      alert("Conta salva.");
    } catch (error) {
      console.error(error);
      alert("Erro ao salvar.");
    }
  },

  async toggleNfe(id) {
    try {
      const item = this.dados.find(x => Number(x.id) === Number(id));
      if (!item) return;

      await api.update("contas_pagar", id, {
        tem_nfe: !item.tem_nfe
      });

      await this.listar();

    } catch (error) {
      alert("Erro ao atualizar NFE.");
    }
  },

  async toggleBoleto(id) {
    try {
      const item = this.dados.find(x => Number(x.id) === Number(id));
      if (!item) return;

      await api.update("contas_pagar", id, {
        tem_boleto: !item.tem_boleto
      });

      await this.listar();

    } catch (error) {
      alert("Erro ao atualizar boleto.");
    }
  },

  async pagar(id) {
    try {
      const item = this.dados.find(x => Number(x.id) === Number(id));
      if (!item) return;

      const hoje = new Date().toISOString().slice(0,10);

      const dataPagamento = prompt(
        "Data do pagamento:",
        hoje
      );

      if (!dataPagamento) return;

      const multa = prompt("Multa/Juros:", "0");
      if (multa === null) return;

      const desconto = prompt("Desconto:", "0");
      if (desconto === null) return;

      await api.update("contas_pagar", id, {
        status: "pago",
        data_pagamento: dataPagamento,
        multa: this.numero(multa),
        desconto: this.numero(desconto)
      });

      await this.listar();

      if (window.contasPagasModule?.carregar) {
        await contasPagasModule.carregar();
      }

      alert("Conta paga.");

    } catch (error) {
      console.error(error);
      alert("Erro ao pagar.");
    }
  }
};

window.listarContasPagar = () => contasPagarModule.listar();
