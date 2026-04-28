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
    if (isNaN(d.getTime())) return data;

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
      console.log("Buscando contas_pagar...");

      const dados = await api.restGet("contas_pagar", "select=*");

      console.log("Dados recebidos:", dados);

      this.dados = Array.isArray(dados)
        ? dados
            .filter((item) => String(item.status || "pendente").toLowerCase() !== "pago")
            .sort((a, b) => {
              const da = new Date(a.vencimento || "2999-12-31");
              const db = new Date(b.vencimento || "2999-12-31");
              return da - db;
            })
        : [];

      this.renderizar();
    } catch (error) {
      console.error("Erro ao carregar contas a pagar:", error);
      alert("Erro ao carregar contas a pagar: " + error.message);
    }
  },

  renderizar() {
    const tbody = this.get("tabelaContasPagar");
    if (!tbody) return;

    if (!this.dados.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9">Nenhuma conta encontrada.</td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = this.dados.map((item) => {
      const id = Number(item.id);

      return `
        <tr>
          <td>${item.fornecedor || "-"}</td>
          <td>${item.documento || "-"}</td>
          <td>${this.moeda(item.valor)}</td>
          <td>${this.dataBR(item.vencimento)}</td>
          <td>${item.categoria || "-"}</td>
          <td>${item.descricao || "-"}</td>

          <td>
            <button 
              class="doc-btn ${item.tem_nfe ? "ok" : "warn"}"
              onclick="contasPagarModule.toggleNfe(${id})"
            >
              ${item.tem_nfe ? "NFE OK" : "NFE"}
            </button>

            <button 
              class="doc-btn ${item.tem_boleto ? "ok" : "warn"}"
              onclick="contasPagarModule.toggleBoleto(${id})"
            >
              ${item.tem_boleto ? "Boleto OK" : "Boleto"}
            </button>
          </td>

          <td>
            <button onclick="contasPagarModule.pagar(${id})">Pagar</button>
          </td>
        </tr>
      `;
    }).join("");
  },

  async salvar() {
    try {
      const payload = {
        fornecedor: this.valor("cpFornecedor"),
        documento: this.valor("cpDocumento"),
        categoria: this.valor("cpCategoria"),
        vencimento: this.valor("cpVencimento") || null,
        valor: this.numero(this.valor("cpValor")),
        descricao: this.valor("cpDescricao"),
        tem_nfe: this.valor("cpNfe") !== "",
        tem_boleto: this.valor("cpBoleto") === "true",
        status: "pendente"
      };

      if (!payload.fornecedor) {
        alert("Informe o fornecedor.");
        return;
      }

      if (!payload.valor || payload.valor <= 0) {
        alert("Informe o valor.");
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
      ].forEach((id) => {
        const el = this.get(id);
        if (el) el.value = "";
      });

      const boleto = this.get("cpBoleto");
      if (boleto) boleto.value = "false";

      await this.listar();

      alert("Conta salva.");
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("Erro ao salvar: " + error.message);
    }
  },

  async toggleNfe(id) {
    try {
      const item = this.dados.find((x) => Number(x.id) === Number(id));
      if (!item) return;

      await api.update("contas_pagar", id, {
        tem_nfe: !Boolean(item.tem_nfe)
      });

      await this.listar();
    } catch (error) {
      console.error("Erro ao atualizar NFE:", error);
      alert("Erro ao atualizar NFE.");
    }
  },

  async toggleBoleto(id) {
    try {
      const item = this.dados.find((x) => Number(x.id) === Number(id));
      if (!item) return;

      await api.update("contas_pagar", id, {
        tem_boleto: !Boolean(item.tem_boleto)
      });

      await this.listar();
    } catch (error) {
      console.error("Erro ao atualizar boleto:", error);
      alert("Erro ao atualizar boleto.");
    }
  },

  async pagar(id) {
    try {
      const item = this.dados.find((x) => Number(x.id) === Number(id));
      if (!item) return;

      const hoje = new Date().toISOString().slice(0, 10);

      const dataPagamento = prompt("Data do pagamento:", hoje);
      if (!dataPagamento) return;

      const multa = prompt("Multa/Juros:", "0");
      if (multa === null) return;

      const desconto = prompt("Desconto:", "0");
      if (desconto === null) return;

      const confirmar = confirm(
        `Confirmar pagamento?\n\n` +
        `Fornecedor: ${item.fornecedor || "-"}\n` +
        `Documento: ${item.documento || "-"}\n` +
        `Valor: ${this.moeda(item.valor)}\n` +
        `Multa/Juros: ${this.moeda(multa)}\n` +
        `Desconto: ${this.moeda(desconto)}\n` +
        `Data: ${dataPagamento}`
      );

      if (!confirmar) return;

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
      console.error("Erro ao pagar:", error);
      alert("Erro ao pagar: " + error.message);
    }
  }
};

window.listarContasPagar = () => contasPagarModule.listar();
