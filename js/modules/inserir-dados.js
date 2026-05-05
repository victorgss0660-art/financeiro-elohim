window.inserirDadosModule = {

  metas: [],
  faturamentos: [],

  get(id) {
    return document.getElementById(id);
  },

  valor(id) {
    return this.get(id)?.value || "";
  },

  // 🔥 CORREÇÃO PRINCIPAL (PONTO E VÍRGULA)
  numero(valor) {

    if (typeof valor === "number") return valor;
    if (!valor) return 0;

    let txt = String(valor).trim();

    txt = txt.replace(/R\$/g, "").replace(/\s/g, "");

    if (txt.includes(".") && txt.includes(",")) {
      txt = txt.replace(/\./g, "").replace(",", ".");
    } else if (txt.includes(",")) {
      txt = txt.replace(",", ".");
    }

    txt = txt.replace(/[^\d.-]/g, "");

    const n = parseFloat(txt);
    return isNaN(n) ? 0 : n;
  },

  moeda(valor) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(this.numero(valor));
  },

  normalizarTexto(texto) {
    return String(texto || "")
      .trim()
      .toUpperCase();
  },

  normalizarChave(chave) {
    return String(chave)
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  },

  async carregar() {
    await this.listarMetas();
    await this.listarFaturamento();
  },

  // =========================
  // METAS
  // =========================

  async salvarMetaPercentual() {
    try {

      const mes = this.valor("metaMes");
      const ano = String(this.valor("metaAno"));
      const categoria = this.normalizarTexto(this.valor("metaCategoria"));
      const percentual_meta = this.numero(this.valor("metaPercentual"));

      if (!mes || !ano || !categoria || !percentual_meta) {
        alert("Preencha todos os campos.");
        return;
      }

      const existentes = await api.restGet(
        "metas",
        `select=*&mes=eq.${mes}&ano=eq.${ano}&categoria=eq.${categoria}`
      );

      const payload = { mes, ano, categoria, percentual_meta };

      if (existentes.length) {
        if (!confirm("Meta já existe. Deseja atualizar?")) return;
        await api.update("metas", existentes[0].id, payload);
      } else {
        await api.insert("metas", payload);
      }

      this.get("metaCategoria").value = "";
      this.get("metaPercentual").value = "";

      await this.listarMetas();

      alert("Meta salva.");
    } catch (e) {
      console.error(e);
      alert("Erro ao salvar meta.");
    }
  },

  async listarMetas() {
    const dados = await api.restGet("metas", "select=*");
    this.metas = dados || [];

    const tbody = this.get("tabelaMetasMensais");
    if (!tbody) return;

    if (!this.metas.length) {
      tbody.innerHTML = `<tr><td colspan="5">Sem metas</td></tr>`;
      return;
    }

    tbody.innerHTML = this.metas.map(m => `
      <tr>
        <td>${m.mes}</td>
        <td>${m.ano}</td>
        <td>${m.categoria}</td>
        <td>${m.percentual_meta}%</td>
        <td><button onclick="inserirDadosModule.excluirMeta(${m.id})">Excluir</button></td>
      </tr>
    `).join("");
  },

  async excluirMeta(id) {
    if (!confirm("Excluir meta?")) return;
    await api.request(`metas?id=eq.${id}`, "", "DELETE");
    await this.listarMetas();
  },

  // =========================
  // FATURAMENTO
  // =========================

  async salvarFaturamento() {

    const mes = this.valor("fatMes");
    const ano = this.valor("fatAno");

    const payload = {
      mes,
      ano,
      faturamento: this.numero(this.valor("fatValor")),
      faturado: this.numero(this.valor("fatFaturado")),
      a_faturar: this.numero(this.valor("fatAFaturar"))
    };

    const existentes = await api.restGet(
      "meses",
      `select=*&mes=eq.${mes}&ano=eq.${ano}`
    );

    if (existentes.length) {
      if (!confirm("Já existe. Atualizar?")) return;
      await api.update("meses", existentes[0].id, payload);
    } else {
      await api.insert("meses", payload);
    }

    await this.listarFaturamento();
    alert("Faturamento salvo.");
  },

  async listarFaturamento() {
    const dados = await api.restGet("meses", "select=*");
    this.faturamentos = dados || [];

    const tbody = this.get("tabelaFaturamentoMensal");

    if (!this.faturamentos.length) {
      tbody.innerHTML = `<tr><td colspan="6">Sem dados</td></tr>`;
      return;
    }

    tbody.innerHTML = this.faturamentos.map(f => `
      <tr>
        <td>${f.mes}</td>
        <td>${f.ano}</td>
        <td>${this.moeda(f.faturamento)}</td>
        <td>${this.moeda(f.faturado)}</td>
        <td>${this.moeda(f.a_faturar)}</td>
        <td><button onclick="inserirDadosModule.excluirFaturamento(${f.id})">Excluir</button></td>
      </tr>
    `).join("");
  },

  async excluirFaturamento(id) {
    if (!confirm("Excluir?")) return;
    await api.request(`meses?id=eq.${id}`, "", "DELETE");
    await this.listarFaturamento();
  },

  // =========================
  // IMPORTAÇÃO (CORRIGIDA)
  // =========================

  async importarContasPagas() {

    const arquivo = this.get("importArquivo")?.files?.[0];
    if (!arquivo) return alert("Selecione arquivo");

    const mes = this.valor("importMes");
    const ano = this.valor("importAno");

    const buffer = await arquivo.arrayBuffer();
    const wb = XLSX.read(buffer);
    const sheet = wb.Sheets[wb.SheetNames[0]];

    const linhas = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    if (!linhas.length) return alert("Planilha vazia");

    const registros = linhas.map(l => {

      const obj = {};

      Object.keys(l).forEach(k => {
        obj[this.normalizarChave(k)] = l[k];
      });

      return {
        mes,
        ano,
        categoria: this.normalizarTexto(
          obj.categoria || obj.tipo || obj.grupo || ""
        ),
        valor: this.numero(
          obj.valor || obj.total || obj.pago || obj.vlr || 0
        )
      };

    }).filter(r => r.categoria && r.valor > 0);

    if (!registros.length) {
      return alert("Nenhum dado válido encontrado");
    }

    if (!confirm(`Importar ${registros.length} linhas?`)) return;

    // 🔥 PERFORMANCE (batch)
    await Promise.all(
      registros.map(r => api.insert("gastos", r))
    );

    alert("Importado com sucesso");

    if (window.dashboardModule?.carregar) {
      dashboardModule.carregar();
    }
  }
};
function initInserirDadosTabs() {

  const botoes = document.querySelectorAll(".input-tab");
  const secoes = document.querySelectorAll(".input-section");

  if (!botoes.length || !secoes.length) return;

  function ativarTab(tipo) {

    // esconder tudo
    secoes.forEach(sec => {
      sec.style.display = "none";
    });

    // remover ativo
    botoes.forEach(btn => {
      btn.classList.remove("active");
    });

    // ativar seção correta
    const alvo = document.querySelector(`.input-section[data-section="${tipo}"]`);
    if (alvo) {
      alvo.style.display = "block";
    }

    // ativar botão correto
    const botao = document.querySelector(`.input-tab[data-tab="${tipo}"]`);
    if (botao) {
      botao.classList.add("active");
    }
  }

  // bind dos botões
  botoes.forEach(btn => {
    btn.addEventListener("click", () => {
      const tipo = btn.dataset.tab;
      ativarTab(tipo);
    });
  });

  // inicial
  ativarTab("import");
}

window.carregarInserirDados = () => inserirDadosModule.carregar();
