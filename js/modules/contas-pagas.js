window.contasPagasModule = {
  dados: [],
  filtrados: [],

  async carregar() {
    await this.listar();
  },

  numero(valor) {
    if (typeof valor === "number") return Number.isFinite(valor) ? valor : 0;
    if (!valor) return 0;

    let texto = String(valor).replace(/R\$/g, "").replace(/\s/g, "").trim();

    if (texto.includes(",") && texto.includes(".")) {
      texto = texto.replace(/\./g, "").replace(",", ".");
    } else if (texto.includes(",")) {
      texto = texto.replace(",", ".");
    }

    const n = Number(texto);
    return Number.isFinite(n) ? n : 0;
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
      const dados = await api.restGet(
        "contas_pagar",
        "select=*&status=eq.pago&order=data_pagamento.desc"
      );

      this.dados = Array.isArray(dados) ? dados : [];
      this.filtrados = [...this.dados];

      this.renderizar();
      this.atualizarResumo();
    } catch (error) {
      console.error("Erro ao carregar contas pagas:", error);
      alert("Erro ao carregar contas pagas: " + error.message);
    }
  },

  aplicarFiltros() {
    const busca = String(document.getElementById("pagasBusca")?.value || "")
      .trim()
      .toLowerCase();

    const dataInicio = document.getElementById("pagasDataInicio")?.value || "";
    const dataFim = document.getElementById("pagasDataFim")?.value || "";

    this.filtrados = this.dados.filter((item) => {
      const textoItem = [
        item.fornecedor,
        item.documento,
        item.categoria,
        item.descricao,
        item.nfe
      ].join(" ").toLowerCase();

      const bateBusca = !busca || textoItem.includes(busca);

      let bateData = true;

      if (dataInicio || dataFim) {
        const dataBase = item.data_pagamento || item.vencimento;

        if (!dataBase) {
          bateData = false;
        } else {
          const dataItem = new Date(String(dataBase) + "T00:00:00");

          if (dataInicio) {
            const inicio = new Date(dataInicio + "T00:00:00");
            if (dataItem < inicio) bateData = false;
          }

          if (dataFim) {
            const fim = new Date(dataFim + "T23:59:59");
            if (dataItem > fim) bateData = false;
          }
        }
      }

      return bateBusca && bateData;
    });

    this.renderizar();
    this.atualizarResumo();
  },

  limparFiltros() {
    const campos = ["pagasBusca", "pagasDataInicio", "pagasDataFim"];
    campos.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });

    this.filtrados = [...this.dados];
    this.renderizar();
    this.atualizarResumo();
  },

  renderizar() {
    const tbody = document.getElementById("tabelaContasPagas");
    if (!tbody) return;

    const lista = this.filtrados || [];

    if (!lista.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="muted">Nenhuma conta paga encontrada.</td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = lista.map((item) => `
      <tr>
        <td><strong>${item.fornecedor || "-"}</strong></td>
        <td>${item.documento || "-"}</td>
        <td>${item.categoria || "-"}</td>
        <td>${this.dataBR(item.vencimento)}</td>
        <td>${this.dataBR(item.data_pagamento)}</td>
        <td>${item.descricao || "-"}</td>
        <td><strong>${this.moeda(item.valor || 0)}</strong></td>
      </tr>
    `).join("");
  },

  atualizarResumo() {
    const total = this.filtrados.reduce(
      (acc, item) => acc + this.numero(item.valor),
      0
    );

    const qtdEl = document.getElementById("pagasQtd");
    const totalEl = document.getElementById("pagasTotal");

    if (qtdEl) qtdEl.textContent = this.filtrados.length;
    if (totalEl) totalEl.textContent = this.moeda(total);
  }
};

window.listarContasPagas = () => contasPagasModule.listar();
