window.contasReceberModule = {
  dados: [],
  filtrados: [],
  editandoId: null,

  get(id) {
    return document.getElementById(id);
  },

  valor(id) {
    return this.get(id)?.value || "";
  },

  set(id, valor) {
    const el = this.get(id);
    if (el) el.value = valor ?? "";
  },

  numero(valor) {
    if (typeof valor === "number") return valor;
    if (!valor) return 0;

    let txt = String(valor).trim();
    txt = txt.replace(/R\$/g, "").replace(/\s/g, "");

    if (txt.includes(",") && txt.includes(".")) {
      txt = txt.replace(/\./g, "").replace(",", ".");
    } else if (txt.includes(",")) {
      txt = txt.replace(",", ".");
    }

    const n = parseFloat(txt);
    return isNaN(n) ? 0 : n;
  },

  moeda(v) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(this.numero(v));
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
        "contas_receber",
        "select=*&order=vencimento.asc"
      );

      this.dados = Array.isArray(dados) ? dados : [];
      this.filtrados = [...this.dados];

      this.renderizar();
      this.resumo();

    } catch (e) {
      console.error(e);
      alert("Erro ao carregar contas a receber.");
    }
  },

  renderizar() {
    const tbody = this.get("tabelaContasReceber");
    if (!tbody) return;

    if (!this.filtrados.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8">Nenhum lançamento encontrado.</td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = this.filtrados.map(item => `
      <tr>
        <td>${item.cliente || "-"}</td>
        <td>${item.documento || "-"}</td>
        <td>${item.categoria || "-"}</td>
        <td>${this.dataBR(item.vencimento)}</td>
        <td>${item.data_recebimento ? this.dataBR(item.data_recebimento) : "-"}</td>
        <td>${item.descricao || "-"}</td>
        <td>${this.moeda(item.valor)}</td>
        <td>
          ${
            String(item.status || "").toLowerCase() === "recebido"
            ? `<button class="btn-excluir"
                onclick="contasReceberModule.cancelar(${item.id})">
                Cancelar
              </button>`
            : `<button class="btn-pagar"
                onclick="contasReceberModule.receber(${item.id})">
                Receber
              </button>`
          }

          <button class="btn-editar"
            onclick="contasReceberModule.editar(${item.id})">
            Editar
          </button>

          <button class="btn-excluir"
            onclick="contasReceberModule.excluir(${item.id})">
            Excluir
          </button>
        </td>
      </tr>
    `).join("");
  },

  resumo() {
    const total = this.filtrados.reduce(
      (acc, item) => acc + this.numero(item.valor),
      0
    );

    const aberto = this.filtrados
      .filter(x => String(x.status || "").toLowerCase() !== "recebido")
      .reduce((acc, item) => acc + this.numero(item.valor), 0);

    if (this.get("receberQtd"))
      this.get("receberQtd").textContent = this.filtrados.length;

    if (this.get("receberTotal"))
      this.get("receberTotal").textContent = this.moeda(total);

    if (this.get("receberAberto"))
      this.get("receberAberto").textContent = this.moeda(aberto);
  },

  limparFormulario() {
    [
      "receberCliente",
      "receberDocumento",
      "receberCategoria",
      "receberVencimento",
      "receberDescricao",
      "receberValor"
    ].forEach(id => this.set(id, ""));

    this.editandoId = null;
  },

  async salvar() {
    try {
      const payload = {
        cliente: this.valor("receberCliente"),
        documento: this.valor("receberDocumento"),
        categoria: this.valor("receberCategoria"),
        vencimento: this.valor("receberVencimento"),
        descricao: this.valor("receberDescricao"),
        valor: this.numero(this.valor("receberValor")),
        status: "pendente"
      };

      if (!payload.cliente || !payload.valor) {
        alert("Preencha cliente e valor.");
        return;
      }

      if (this.editandoId) {
        await api.update("contas_receber", this.editandoId, payload);
      } else {
        await api.insert("contas_receber", payload);
      }

      this.limparFormulario();
      await this.listar();

    } catch (e) {
      console.error(e);
      alert("Erro ao salvar.");
    }
  },

  editar(id) {
    const item = this.dados.find(x => Number(x.id) === Number(id));
    if (!item) return;

    this.editandoId = id;

    this.set("receberCliente", item.cliente);
    this.set("receberDocumento", item.documento);
    this.set("receberCategoria", item.categoria);
    this.set("receberVencimento", item.vencimento);
    this.set("receberDescricao", item.descricao);
    this.set("receberValor", item.valor);
  },

  async excluir(id) {
    if (!confirm("Excluir lançamento?")) return;

    try {
      await api.request("contas_receber?id=eq." + id, "", "DELETE");
      await this.listar();
    } catch (e) {
      console.error(e);
      alert("Erro ao excluir.");
    }
  },

  async receber(id) {
    const data = prompt(
      "Data do recebimento (AAAA-MM-DD):",
      new Date().toISOString().slice(0,10)
    );

    if (!data) return;

    try {
      await api.update("contas_receber", id, {
        status: "recebido",
        data_recebimento: data
      });

      await this.listar();

    } catch (e) {
      console.error(e);
      alert("Erro ao receber.");
    }
  },

  async cancelar(id) {
    if (!confirm("Cancelar recebimento?")) return;

    try {
      await api.update("contas_receber", id, {
        status: "pendente",
        data_recebimento: null
      });

      await this.listar();

    } catch (e) {
      console.error(e);
      alert("Erro ao cancelar.");
    }
  },

  filtrar() {
    const busca = this.valor("receberBusca").toLowerCase();

    this.filtrados = this.dados.filter(item => {
      const txt = `
        ${item.cliente || ""}
        ${item.documento || ""}
        ${item.categoria || ""}
        ${item.descricao || ""}
      `.toLowerCase();

      return txt.includes(busca);
    });

    this.renderizar();
    this.resumo();
  }
};

window.listarContasReceber = () =>
  contasReceberModule.listar();
