window.inserirDadosModule = {
  metas: [],
  faturamentos: [],

  get(id) {
    return document.getElementById(id);
  },

  valor(id) {
    return this.get(id)?.value || "";
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

  moeda(valor) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(this.numero(valor));
  },

  async carregar() {
    await this.listarMetas();
    await this.listarFaturamento();
  },

  async salvarMeta() {
    try {
      const payload = {
        mes: this.valor("metaMes"),
        ano: String(this.valor("metaAno")),
        categoria: this.valor("metaCategoria").trim(),
        valor: this.numero(this.valor("metaValor"))
      };

      if (!payload.categoria || !payload.valor) {
        alert("Informe categoria e valor da meta.");
        return;
      }

      await api.insert("metas_mensais", payload);

      this.get("metaCategoria").value = "";
      this.get("metaValor").value = "";

      await this.listarMetas();

      alert("Meta salva com sucesso.");
    } catch (error) {
      console.error(error);
      alert("Erro ao salvar meta: " + error.message);
    }
  },

  async listarMetas() {
    try {
      const dados = await api.restGet("metas_mensais", "select=*&order=ano.desc,mes.asc");

      this.metas = Array.isArray(dados) ? dados : [];

      const tbody = this.get("tabelaMetasMensais");
      if (!tbody) return;

      if (!this.metas.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="muted">Nenhuma meta cadastrada.</td></tr>`;
        return;
      }

      tbody.innerHTML = this.metas.map(item => `
        <tr>
          <td>${item.mes || "-"}</td>
          <td>${item.ano || "-"}</td>
          <td>${item.categoria || "-"}</td>
          <td><strong>${this.moeda(item.valor)}</strong></td>
          <td>
            <button class="btn-excluir" onclick="inserirDadosModule.excluirMeta(${Number(item.id)})">
              Excluir
            </button>
          </td>
        </tr>
      `).join("");
    } catch (error) {
      console.error(error);
      alert("Erro ao carregar metas.");
    }
  },

  async excluirMeta(id) {
    if (!confirm("Excluir esta meta?")) return;

    await api.delete("metas_mensais", id);
    await this.listarMetas();
  },

  async salvarFaturamento() {
    try {
      const payload = {
        mes: this.valor("fatMes"),
        ano: String(this.valor("fatAno")),
        valor: this.numero(this.valor("fatValor"))
      };

      if (!payload.valor) {
        alert("Informe o faturamento.");
        return;
      }

      await api.insert("faturamento_mensal", payload);

      this.get("fatValor").value = "";

      await this.listarFaturamento();

      alert("Faturamento salvo com sucesso.");
    } catch (error) {
      console.error(error);
      alert("Erro ao salvar faturamento: " + error.message);
    }
  },

  async listarFaturamento() {
    try {
      const dados = await api.restGet("faturamento_mensal", "select=*&order=ano.desc,mes.asc");

      this.faturamentos = Array.isArray(dados) ? dados : [];

      const tbody = this.get("tabelaFaturamentoMensal");
      if (!tbody) return;

      if (!this.faturamentos.length) {
        tbody.innerHTML = `<tr><td colspan="4" class="muted">Nenhum faturamento cadastrado.</td></tr>`;
        return;
      }

      tbody.innerHTML = this.faturamentos.map(item => `
        <tr>
          <td>${item.mes || "-"}</td>
          <td>${item.ano || "-"}</td>
          <td><strong>${this.moeda(item.valor)}</strong></td>
          <td>
            <button class="btn-excluir" onclick="inserirDadosModule.excluirFaturamento(${Number(item.id)})">
              Excluir
            </button>
          </td>
        </tr>
      `).join("");
    } catch (error) {
      console.error(error);
      alert("Erro ao carregar faturamento.");
    }
  },

  async excluirFaturamento(id) {
    if (!confirm("Excluir este faturamento?")) return;

    await api.delete("faturamento_mensal", id);
    await this.listarFaturamento();
  },

  importarContasPagas() {
    alert("A importação da planilha será configurada no próximo passo.");
  }
};

window.carregarInserirDados = () => inserirDadosModule.carregar();
