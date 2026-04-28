window.contasPagarModule = {
  dados: [],
  filtrados: [],
  selecionados: new Set(),
  editandoId: null,

  async carregar() {
    await this.listar();
  },

  getMesAno() {
    return {
      mes: document.getElementById("mesSelect")?.value || "Janeiro",
      ano: String(document.getElementById("anoSelect")?.value || new Date().getFullYear())
    };
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

  getValor(id) {
    return document.getElementById(id)?.value || "";
  },

  setValor(id, valor) {
    const el = document.getElementById(id);
    if (el) el.value = valor ?? "";
  },

  limparFormulario() {
    this.editandoId = null;

    this.setValor("cpFornecedor", "");
    this.setValor("cpDocumento", "");
    this.setValor("cpCategoria", "");
    this.setValor("cpVencimento", "");
    this.setValor("cpValor", "");
    this.setValor("cpNfe", "");
    this.setValor("cpBoleto", "false");
    this.setValor("cpDescricao", "");
  },

  montarPayload() {
    const { mes, ano } = this.getMesAno();

    const nfe = this.getValor("cpNfe").trim();
    const boleto = this.getValor("cpBoleto") === "true";

    return {
      mes,
      ano,
      fornecedor: this.getValor("cpFornecedor").trim(),
      documento: this.getValor("cpDocumento").trim(),
      categoria: this.getValor("cpCategoria").trim(),
      vencimento: this.getValor("cpVencimento") || null,
      valor: this.numero(this.getValor("cpValor")),
      nfe,
      tem_nfe: Boolean(nfe),
      tem_boleto: boleto,
      descricao: this.getValor("cpDescricao").trim(),
      status: "pendente"
    };
  },

  async salvar() {
    try {
      const payload = this.montarPayload();

      if (!payload.fornecedor) {
        alert("Informe o fornecedor.");
        return;
      }

      if (!payload.valor || payload.valor <= 0) {
        alert("Informe um valor válido.");
        return;
      }

      if (this.editandoId) {
        await api.update("contas_pagar", this.editandoId, payload);
      } else {
        await api.insert("contas_pagar", payload);
      }

      this.limparFormulario();
      await this.listar();
    } catch (error) {
      console.error("Erro ao salvar conta a pagar:", error);
      alert("Erro ao salvar conta a pagar: " + error.message);
    }
  },

  async listar() {
    try {
      const dados = await api.restGet(
        "contas_pagar",
        "select=*&order=vencimento.asc"
      );

      this.dados = Array.isArray(dados)
        ? dados.filter((item) => {
            const status = String(item.status || "pendente").toLowerCase();
            return status !== "pago";
          })
        : [];

      this.filtrados = [...this.dados];

      this.renderizar();
      this.atualizarResumo();
    } catch (error) {
      console.error("Erro ao carregar contas a pagar:", error);
      alert("Erro ao carregar contas a pagar: " + error.message);
    }
  },

  aplicarFiltros() {
    const busca = String(document.getElementById("cpBusca")?.value || "")
      .trim()
      .toLowerCase();

    const fornecedor = String(document.getElementById("cpFiltroFornecedor")?.value || "")
      .trim()
      .toLowerCase();

    const categoria = String(document.getElementById("cpFiltroCategoria")?.value || "")
      .trim()
      .toLowerCase();

    const vencimentoInicio = document.getElementById("cpVencimentoInicio")?.value || "";
    const vencimentoFim = document.getElementById("cpVencimentoFim")?.value || "";

    this.filtrados = this.dados.filter((item) => {
      const textoItem = [
        item.fornecedor,
        item.documento,
        item.categoria,
        item.descricao,
        item.nfe
      ].join(" ").toLowerCase();

      const bateBusca = !busca || textoItem.includes(busca);

      const bateFornecedor =
        !fornecedor ||
        String(item.fornecedor || "").toLowerCase().includes(fornecedor);

      const bateCategoria =
        !categoria ||
        String(item.categoria || "").toLowerCase().includes(categoria);

      let bateData = true;

      if (vencimentoInicio || vencimentoFim) {
        if (!item.vencimento) {
          bateData = false;
        } else {
          const dataItem = new Date(String(item.vencimento) + "T00:00:00");

          if (vencimentoInicio) {
            const dataInicio = new Date(vencimentoInicio + "T00:00:00");
            if (dataItem < dataInicio) bateData = false;
          }

          if (vencimentoFim) {
            const dataFim = new Date(vencimentoFim + "T23:59:59");
            if (dataItem > dataFim) bateData = false;
          }
        }
      }

      return bateBusca && bateFornecedor && bateCategoria && bateData;
    });

    this.renderizar();
    this.atualizarResumo();
  },

  limparFiltros() {
    this.setValor("cpBusca", "");
    this.setValor("cpFiltroFornecedor", "");
    this.setValor("cpFiltroCategoria", "");
    this.setValor("cpVencimentoInicio", "");
    this.setValor("cpVencimentoFim", "");

    this.filtrados = [...this.dados];
    this.renderizar();
    this.atualizarResumo();
  },

  renderizar() {
    const tbody = document.getElementById("tabelaContasPagar");
    if (!tbody) return;

    const lista = this.filtrados || [];

    if (!lista.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" class="muted">Nenhuma conta a pagar encontrada.</td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = lista.map((item) => {
      const id = Number(item.id);
      const selecionado = this.selecionados.has(id);
      const nfeOk = Boolean(item.tem_nfe || item.nfe);
      const boletoOk = Boolean(item.tem_boleto);

      return `
        <tr class="${selecionado ? "linha-selecionada linha-vermelha" : ""}">
          <td>
            <input
              type="checkbox"
              ${selecionado ? "checked" : ""}
              onchange="contasPagarModule.toggleSelecionado(${id}, this.checked)"
            >
          </td>

          <td><strong>${item.fornecedor || "-"}</strong></td>
          <td>${item.documento || "-"}</td>
          <td><strong>${this.moeda(item.valor || 0)}</strong></td>
          <td>${this.dataBR(item.vencimento)}</td>
          <td>${item.categoria || "-"}</td>
          <td>${item.descricao || "-"}</td>

          <td>
            <button
              class="doc-btn ${nfeOk ? "ok" : "warn"}"
              onclick="contasPagarModule.marcarNfe(${id})"
            >
              ${nfeOk ? "NFE OK" : "NFE"}
            </button>

            <button
              class="doc-btn ${boletoOk ? "ok" : "warn"}"
              onclick="contasPagarModule.marcarBoleto(${id})"
            >
              ${boletoOk ? "Boleto OK" : "Boleto"}
            </button>
          </td>

          <td>
            <button class="secondary-btn action-btn-blue" onclick="contasPagarModule.editar(${id})">
              Editar
            </button>

            <button class="secondary-btn" onclick="contasPagarModule.duplicar(${id})">
              Duplicar
            </button>

            <button class="secondary-btn action-btn-green" onclick="contasPagarModule.marcarPago(${id})">
              Pagar
            </button>

            <button class="secondary-btn action-btn-red" onclick="contasPagarModule.excluir(${id})">
              Excluir
            </button>
          </td>
        </tr>
      `;
    }).join("");
  },

  atualizarResumo() {
    const total = this.filtrados.reduce((acc, item) => acc + this.numero(item.valor), 0);

    const selecionados = this.filtrados.filter((item) =>
      this.selecionados.has(Number(item.id))
    );

    const totalSelecionado = selecionados.reduce(
      (acc, item) => acc + this.numero(item.valor),
      0
    );

    const qtd = document.getElementById("cpQtd");
    const totalEl = document.getElementById("cpTotal");
    const qtdSel = document.getElementById("cpSelecionadas");
    const totalSel = document.getElementById("cpTotalSelecionado");

    if (qtd) qtd.textContent = this.filtrados.length;
    if (totalEl) totalEl.textContent = this.moeda(total);
    if (qtdSel) qtdSel.textContent = selecionados.length;
    if (totalSel) totalSel.textContent = this.moeda(totalSelecionado);
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
    this.filtrados.forEach((item) => {
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

  editar(id) {
    const item = this.dados.find((i) => Number(i.id) === Number(id));
    if (!item) return;

    this.editandoId = Number(id);

    this.setValor("cpFornecedor", item.fornecedor || "");
    this.setValor("cpDocumento", item.documento || "");
    this.setValor("cpCategoria", item.categoria || "");
    this.setValor("cpVencimento", item.vencimento || "");
    this.setValor("cpValor", item.valor || "");
    this.setValor("cpNfe", item.nfe || "");
    this.setValor(
      "cpBoleto",
      Boolean(item.tem_boleto) ? "true" : "false"
    );
    this.setValor("cpDescricao", item.descricao || "");

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  },

  async duplicar(id) {
    try {
      const item = this.dados.find((i) => Number(i.id) === Number(id));
      if (!item) return;

      const copia = { ...item };

      delete copia.id;
      delete copia.created_at;
      delete copia.updated_at;
      delete copia.data_pagamento;

      copia.status = "pendente";
      copia.documento = copia.documento ? `${copia.documento}-CÓPIA` : "CÓPIA";

      await api.insert("contas_pagar", copia);
      await this.listar();
    } catch (error) {
      console.error("Erro ao duplicar conta:", error);
      alert("Erro ao duplicar conta: " + error.message);
    }
  },

  async marcarNfe(id) {
    try {
      const item = this.dados.find((i) => Number(i.id) === Number(id));
      if (!item) return;

      const nfeOk = Boolean(item.tem_nfe || item.nfe);

      if (nfeOk) {
        await api.update("contas_pagar", id, {
          nfe: "",
          tem_nfe: false
        });
      } else {
        const nfe = prompt("Informe o número da NFE:", item.documento || "");
        if (nfe === null) return;

        await api.update("contas_pagar", id, {
          nfe: nfe.trim() || "OK",
          tem_nfe: true
        });
      }

      await this.listar();
    } catch (error) {
      console.error("Erro ao atualizar NFE:", error);
      alert("Erro ao atualizar NFE: " + error.message);
    }
  },

  async marcarBoleto(id) {
    try {
      const item = this.dados.find((i) => Number(i.id) === Number(id));
      if (!item) return;

      const novoStatus = !Boolean(item.tem_boleto || item.boleto_recebido);

      await api.update("contas_pagar", id, {
        tem_boleto: novoStatus,
      });

      await this.listar();
    } catch (error) {
      console.error("Erro ao atualizar boleto:", error);
      alert("Erro ao atualizar boleto: " + error.message);
    }
  },

  async marcarPago(id) {
    try {
      const item = this.dados.find((i) => Number(i.id) === Number(id));
      if (!item) return;

      const hoje = new Date().toISOString().slice(0, 10);

      await api.update("contas_pagar", id, {
        status: "pago",
        data_pagamento: hoje
      });

      this.selecionados.delete(Number(id));

      await this.listar();

      if (window.contasPagasModule?.carregar) {
        await contasPagasModule.carregar();
      }
    } catch (error) {
      console.error("Erro ao pagar conta:", error);
      alert("Erro ao pagar conta: " + error.message);
    }
  },

  async pagarSelecionadas() {
    if (!this.selecionados.size) {
      alert("Nenhuma conta selecionada.");
      return;
    }

    if (!confirm(`Deseja pagar ${this.selecionados.size} conta(s) selecionada(s)?`)) {
      return;
    }

    const ids = Array.from(this.selecionados);

    for (const id of ids) {
      await this.marcarPago(id);
    }

    this.selecionados.clear();
    await this.listar();
  },

  async excluir(id) {
    if (!confirm("Deseja excluir esta conta?")) return;

    try {
      await api.delete("contas_pagar", id);

      this.selecionados.delete(Number(id));
      await this.listar();
    } catch (error) {
      console.error("Erro ao excluir conta:", error);
      alert("Erro ao excluir conta: " + error.message);
    }
  }
};

window.listarContasPagar = () => contasPagarModule.listar();
