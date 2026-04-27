window.contasPagarModule = {
  dados: [],

  async carregar() {
    await this.listar();
  },

  async init() {
    await this.listar();
  },

  getMesAno() {
    if (window.utils?.getMesAno) return utils.getMesAno();

    return {
      mes: document.getElementById("mesSelect")?.value || "Janeiro",
      ano: String(document.getElementById("anoSelect")?.value || new Date().getFullYear())
    };
  },

  numero(valor) {
    if (typeof valor === "number") return Number.isFinite(valor) ? valor : 0;
    if (valor == null) return 0;

    let texto = String(valor).trim().replace(/R\$/gi, "").replace(/\s/g, "");

    if (texto.includes(",") && texto.includes(".")) {
      texto = texto.replace(/\./g, "").replace(",", ".");
    } else if (texto.includes(",")) {
      texto = texto.replace(",", ".");
    }

    const numero = Number(texto);
    return Number.isFinite(numero) ? numero : 0;
  },

  moeda(valor) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(Number(valor || 0));
  },

  dataBR(data) {
    if (!data) return "-";

    const d = new Date(String(data) + "T00:00:00");
    if (Number.isNaN(d.getTime())) return data;

    return d.toLocaleDateString("pt-BR");
  },

async listar() {
  try {
    let dados = [];

    try {
      dados = await api.select("contas_pagar", {});
    } catch (e) {
      dados = await api.restGet("contas_pagar", "select=*");
    }

    dados = Array.isArray(dados) ? dados : [];

    this.dados = dados
      .filter(item => {
        const status = String(item.status || "pendente").toLowerCase();
        return status !== "pago";
      })
      .sort((a, b) => {
        const da = new Date(a.vencimento || "2999-12-31");
        const db = new Date(b.vencimento || "2999-12-31");
        return da - db;
      });

    this.renderizar();
    this.atualizarResumo();

  } catch (error) {
    console.error(error);
    alert("Erro ao carregar contas a pagar");
  }
}

  renderizar() {
    const tbody =
      document.getElementById("tabelaContasPagar") ||
      document.getElementById("contasPagarTabela") ||
      document.getElementById("cpTabela") ||
      document.querySelector("#tab-contas-pagar tbody");

    if (!tbody) return;

    if (!this.dados.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="muted">Nenhuma conta a pagar encontrada.</td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = this.dados.map(item => {
      const id = Number(item.id);
      const boletoOk = Boolean(item.boleto_recebido);
      const nfeOk = Boolean(item.nfe || item.documento);

      return `
        <tr>
          <td><strong>${item.fornecedor || "-"}</strong></td>
          <td>${item.documento || item.nfe || "-"}</td>
          <td>${item.categoria || "-"}</td>
          <td>${this.dataBR(item.vencimento)}</td>
          <td>${item.descricao || "-"}</td>

          <td>
            <button
              class="doc-btn ${nfeOk ? "ok" : "warn"}"
              onclick="contasPagarModule.marcarNfe(${id})"
            >
              NFE
            </button>

            <button
              class="doc-btn ${boletoOk ? "ok" : "warn"}"
              onclick="contasPagarModule.marcarBoleto(${id})"
            >
              Boleto
            </button>
          </td>

          <td><strong>${this.moeda(item.valor || 0)}</strong></td>

          <td>
            <button class="secondary-btn mini" onclick="contasPagarModule.duplicar(${id})">
              Duplicar
            </button>

            <button class="secondary-btn mini action-btn-green" onclick="contasPagarModule.marcarPago(${id})">
              Pagar
            </button>

            <button class="secondary-btn mini action-btn-red" onclick="contasPagarModule.excluir(${id})">
              Excluir
            </button>
          </td>
        </tr>
      `;
    }).join("");
  },

  atualizarResumo() {
    const total = this.dados.reduce((acc, item) => acc + this.numero(item.valor), 0);

    const qtdEl =
      document.getElementById("qtdContasPagar") ||
      document.getElementById("cpQtd");

    const totalEl =
      document.getElementById("totalContasPagar") ||
      document.getElementById("cpTotal");

    if (qtdEl) qtdEl.textContent = this.dados.length;
    if (totalEl) totalEl.textContent = this.moeda(total);
  },

  async marcarBoleto(id) {
    try {
      const item = this.dados.find(i => Number(i.id) === Number(id));
      if (!item) return;

      await api.update("contas_pagar", id, {
        boleto_recebido: !Boolean(item.boleto_recebido)
      });

      await this.listar();
    } catch (error) {
      alert("Erro ao atualizar boleto: " + error.message);
    }
  },

  async marcarNfe(id) {
    try {
      const item = this.dados.find(i => Number(i.id) === Number(id));
      if (!item) return;

      const novaNfe = prompt("Informe a NFE:", item.nfe || item.documento || "");
      if (novaNfe === null) return;

      await api.update("contas_pagar", id, {
        nfe: novaNfe.trim()
      });

      await this.listar();
    } catch (error) {
      alert("Erro ao atualizar NFE: " + error.message);
    }
  },

  async duplicar(id) {
    try {
      const item = this.dados.find(i => Number(i.id) === Number(id));
      if (!item) return;

      const copia = { ...item };

      delete copia.id;
      delete copia.created_at;
      delete copia.updated_at;

      copia.status = "pendente";
      copia.documento = copia.documento ? `${copia.documento}-CÓPIA` : "CÓPIA";

      await api.insert("contas_pagar", copia);

      await this.listar();
    } catch (error) {
      alert("Erro ao duplicar: " + error.message);
    }
  },

  async marcarPago(id) {
    try {
      const item = this.dados.find(i => Number(i.id) === Number(id));
      if (!item) return;

      const hoje = new Date().toISOString().slice(0, 10);

      const contaPaga = {
        mes: item.mes,
        ano: String(item.ano),
        fornecedor: item.fornecedor || "",
        documento: item.documento || "",
        categoria: item.categoria || "",
        descricao: item.descricao || "",
        valor: this.numero(item.valor),
        vencimento: item.vencimento || null,
        data_pagamento: hoje,
        boleto_recebido: Boolean(item.boleto_recebido),
        nfe: item.nfe || "",
        pedido: item.pedido || "",
        fat: item.fat || "",
        observacoes: item.observacoes || "",
        status: "pago"
      };

      await api.insert("contas_pagas", contaPaga);

      await api.update("contas_pagar", id, {
        status: "pago",
        data_pagamento: hoje
      });

      await this.listar();

      if (window.contasPagasModule?.carregar) {
        await contasPagasModule.carregar();
      }
    } catch (error) {
      console.error("Erro ao marcar como pago:", error);
      alert("Erro ao marcar como pago: " + error.message);
    }
  },

  async excluir(id) {
    if (!confirm("Deseja excluir esta conta a pagar?")) return;

    try {
      if (typeof api.delete === "function") {
        await api.delete("contas_pagar", id);
      } else if (typeof api.remove === "function") {
        await api.remove("contas_pagar", id);
      } else if (typeof api.restDelete === "function") {
        await api.restDelete("contas_pagar", id);
      } else {
        throw new Error("Função de exclusão não encontrada no api.");
      }

      await this.listar();
    } catch (error) {
      alert("Erro ao excluir: " + error.message);
    }
  }
};

window.listarContasPagar = () => contasPagarModule.listar();
