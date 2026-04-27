window.contasPagarModule = {
  dados: [],
  filtrados: [],
  selecionados: new Set(),

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

  numero(v) {
    if (typeof v === "number") return Number.isFinite(v) ? v : 0;
    if (v == null) return 0;

    let txt = String(v).trim().replace(/R\$/gi, "").replace(/\s/g, "");

    if (txt.includes(",") && txt.includes(".")) {
      txt = txt.replace(/\./g, "").replace(",", ".");
    } else if (txt.includes(",")) {
      txt = txt.replace(",", ".");
    }

    const n = Number(txt);
    return Number.isFinite(n) ? n : 0;
  },

  moeda(v) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(Number(v || 0));
  },

  dataBR(data) {
    if (!data) return "-";
    const d = new Date(String(data) + "T00:00:00");
    if (Number.isNaN(d.getTime())) return data;
    return d.toLocaleDateString("pt-BR");
  },

  async listar() {
    try {
      const { mes, ano } = this.getMesAno();

      let dados = await api.select("contas_pagar", {
        mes,
        ano: String(ano)
      });

      this.dados = Array.isArray(dados) ? dados : [];
      this.filtrados = [...this.dados];

      this.renderizar();
      this.atualizarResumo();
    } catch (error) {
      console.error("Erro ao listar contas a pagar:", error);
      alert("Erro ao carregar contas a pagar: " + error.message);
    }
  },

  renderizar() {
    const tbody =
      document.getElementById("tabelaContasPagar") ||
      document.getElementById("contasPagarTabela") ||
      document.getElementById("cpTabela") ||
      document.querySelector("#tab-contas-pagar tbody");

    if (!tbody) {
      console.error("Tbody da tabela contas a pagar não encontrado.");
      return;
    }

    if (!this.filtrados.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="muted">Nenhuma conta encontrada.</td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = this.filtrados.map(item => {
      const id = Number(item.id);
      const selecionado = this.selecionados.has(id);
      const boletoOk = Boolean(item.boleto_recebido);
      const nfeOk = Boolean(item.nfe || item.documento);

      return `
        <tr class="${selecionado ? "linha-selecionada" : ""}">
          <td>
            <input
              type="checkbox"
              ${selecionado ? "checked" : ""}
              onchange="contasPagarModule.toggleSelecionado(${id}, this.checked)"
            >
          </td>

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

          <td>
            <button class="secondary-btn mini action-btn-blue" onclick="contasPagarModule.editar(${id})">
              Editar
            </button>

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
    const total = this.filtrados.reduce((acc, item) => acc + this.numero(item.valor), 0);
    const totalSelecionado = this.filtrados
      .filter(item => this.selecionados.has(Number(item.id)))
      .reduce((acc, item) => acc + this.numero(item.valor), 0);

    const qtdEl = document.getElementById("qtdContasPagar") || document.getElementById("cpQtd");
    const totalEl = document.getElementById("totalContasPagar") || document.getElementById("cpTotal");
    const qtdSelEl = document.getElementById("qtdSelecionadasPagar") || document.getElementById("cpSelecionadas");
    const totalSelEl = document.getElementById("totalSelecionadoPagar") || document.getElementById("cpTotalSelecionado");

    if (qtdEl) qtdEl.textContent = this.filtrados.length;
    if (totalEl) totalEl.textContent = this.moeda(total);
    if (qtdSelEl) qtdSelEl.textContent = this.selecionados.size;
    if (totalSelEl) totalSelEl.textContent = this.moeda(totalSelecionado);
  },

  toggleSelecionado(id, marcado) {
    id = Number(id);

    if (marcado) {
      this.selecionados.add(id);
    } else {
      this.selecionados.delete(id);
    }

    this.renderizar();
    this.atualizarResumo();
  },

  selecionarTodos() {
    this.filtrados.forEach(item => {
      this.selecionados.add(Number(item.id));
    });

    this.renderizar();
    this.atualizarResumo();
  },

  limparSelecao() {
    this.selecionados.clear();
    this.renderizar();
    this.atualizarResumo();
  },

  async inverterNfeSelecionados() {
    if (!this.selecionados.size) {
      alert("Nenhuma linha selecionada.");
      return;
    }

    for (const id of this.selecionados) {
      const item = this.dados.find(i => Number(i.id) === Number(id));
      if (!item) continue;

      const nfeOk = Boolean(item.nfe || item.documento);

      await api.update("contas_pagar", id, {
        nfe: nfeOk ? "" : (item.documento || "OK")
      });
    }

    await this.listar();
  },

  async inverterBoletoSelecionados() {
    if (!this.selecionados.size) {
      alert("Nenhuma linha selecionada.");
      return;
    }

    for (const id of this.selecionados) {
      const item = this.dados.find(i => Number(i.id) === Number(id));
      if (!item) continue;

      await api.update("contas_pagar", id, {
        boleto_recebido: !Boolean(item.boleto_recebido)
      });
    }

    await this.listar();
  },

  async marcarBoleto(id) {
    const item = this.dados.find(i => Number(i.id) === Number(id));
    if (!item) return;

    await api.update("contas_pagar", id, {
      boleto_recebido: !Boolean(item.boleto_recebido)
    });

    await this.listar();
  },

  async marcarNfe(id) {
    const item = this.dados.find(i => Number(i.id) === Number(id));
    if (!item) return;

    const nfeAtual = item.nfe || "";
    const novaNfe = prompt("Informe o número da NFE:", nfeAtual);

    if (novaNfe === null) return;

    await api.update("contas_pagar", id, {
      nfe: novaNfe.trim()
    });

    await this.listar();
  },

  editar(id) {
    const item = this.dados.find(i => Number(i.id) === Number(id));
    if (!item) return;

    alert("Editar selecionado: " + (item.fornecedor || ""));
  },

  async duplicar(id) {
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
  },

  async marcarPago(id) {
    const item = this.dados.find(i => Number(i.id) === Number(id));
    if (!item) return;

    await api.update("contas_pagar", id, {
      status: "pago",
      data_pagamento: new Date().toISOString().slice(0, 10)
    });

    await this.listar();
  },

  async excluir(id) {
    if (!confirm("Deseja excluir esta conta?")) return;

    if (typeof api.delete === "function") {
      await api.delete("contas_pagar", id);
    } else if (typeof api.remove === "function") {
      await api.remove("contas_pagar", id);
    } else if (typeof api.restDelete === "function") {
      await api.restDelete("contas_pagar", id);
    }

    this.selecionados.delete(Number(id));
    await this.listar();
  }
};

window.listarContasPagar = () => contasPagarModule.listar();
window.selecionarTodasContasPagar = () => contasPagarModule.selecionarTodos();
window.limparSelecaoContasPagar = () => contasPagarModule.limparSelecao();
window.inverterNfeSelecionados = () => contasPagarModule.inverterNfeSelecionados();
window.inverterBoletoSelecionados = () => contasPagarModule.inverterBoletoSelecionados();
