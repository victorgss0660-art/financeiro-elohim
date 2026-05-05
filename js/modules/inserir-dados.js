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

  // remove R$, espaços e lixo
  txt = txt.replace(/R\$/g, "").replace(/\s/g, "");

  // caso tenha ponto e vírgula → padrão BR
  if (txt.includes(".") && txt.includes(",")) {
    txt = txt.replace(/\./g, "").replace(",", ".");
  }

  // caso só tenha vírgula → padrão BR
  else if (txt.includes(",")) {
    txt = txt.replace(",", ".");
  }

  // remove qualquer coisa inválida restante
  txt = txt.replace(/[^\d.-]/g, "");

  const n = parseFloat(txt);

  return isNaN(n) ? 0 : n;
}

  moeda(valor) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(this.numero(valor));
  },

  normalizarTexto(texto) {
    return String(texto || "").trim().toUpperCase();
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
        alert("Preencha mês, ano, categoria e percentual.");
        return;
      }

      const existentes = await api.restGet(
        "metas",
        `select=*&mes=eq.${encodeURIComponent(mes)}&ano=eq.${encodeURIComponent(ano)}&categoria=eq.${encodeURIComponent(categoria)}`
      );

      const payload = {
        mes,
        ano,
        categoria,
        percentual_meta
      };

      if (Array.isArray(existentes) && existentes.length > 0) {
        const confirmar = confirm(
          `Já existe meta para ${categoria} em ${mes}/${ano}.\n\nDeseja atualizar?`
        );

        if (!confirmar) return;

        await api.update("metas", existentes[0].id, payload);
      } else {
        await api.insert("metas", payload);
      }

      this.get("metaCategoria").value = "";
      this.get("metaPercentual").value = "";

      await this.listarMetas();

      alert("Meta salva com sucesso.");
    } catch (error) {
      console.error("Erro ao salvar meta:", error);
      alert("Erro ao salvar meta.");
    }
  },

  async listarMetas() {
    try {
      const dados = await api.restGet("metas", "select=*&order=ano.desc,mes.asc,categoria.asc");

      this.metas = Array.isArray(dados) ? dados : [];

      const tbody = this.get("tabelaMetasMensais");
      if (!tbody) return;

      if (!this.metas.length) {
        tbody.innerHTML = `
          <tr>
            <td colspan="5" class="muted">Nenhuma meta cadastrada.</td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = this.metas.map(item => `
        <tr>
          <td>${item.mes || "-"}</td>
          <td>${item.ano || "-"}</td>
          <td><strong>${item.categoria || "-"}</strong></td>
          <td><strong>${this.numero(item.percentual_meta)}%</strong></td>
          <td>
            <button class="btn-excluir" onclick="inserirDadosModule.excluirMeta(${Number(item.id)})">
              Excluir
            </button>
          </td>
        </tr>
      `).join("");
    } catch (error) {
      console.error("Erro ao carregar metas:", error);
      alert("Erro ao carregar metas.");
    }
  },

  async excluirMeta(id) {
    if (!confirm("Excluir esta meta?")) return;

    try {
      await api.request(`metas?id=eq.${id}`, "", "DELETE");
      await this.listarMetas();
    } catch (error) {
      console.error("Erro ao excluir meta:", error);
      alert("Erro ao excluir meta.");
    }
  },

  // =========================
  // FATURAMENTO
  // =========================

  async salvarFaturamento() {
    try {
      const mes = this.valor("fatMes");
      const ano = String(this.valor("fatAno"));

      const payload = {
        mes,
        ano,
        faturamento: this.numero(this.valor("fatValor")),
        faturado: this.numero(this.valor("fatFaturado")),
        a_faturar: this.numero(this.valor("fatAFaturar"))
      };

      if (!mes || !ano) {
        alert("Informe mês e ano.");
        return;
      }

      if (!payload.faturamento && !payload.faturado && !payload.a_faturar) {
        alert("Informe pelo menos um valor de faturamento.");
        return;
      }

      const existentes = await api.restGet(
        "meses",
        `select=*&mes=eq.${encodeURIComponent(mes)}&ano=eq.${encodeURIComponent(ano)}`
      );

      if (Array.isArray(existentes) && existentes.length > 0) {
        const confirmar = confirm(
          `Já existe faturamento para ${mes}/${ano}.\n\nDeseja atualizar?`
        );

        if (!confirmar) return;

        await api.update("meses", existentes[0].id, payload);
      } else {
        await api.insert("meses", payload);
      }

      this.get("fatValor").value = "";
      this.get("fatFaturado").value = "";
      this.get("fatAFaturar").value = "";

      await this.listarFaturamento();

      alert("Faturamento salvo com sucesso.");
    } catch (error) {
      console.error("Erro ao salvar faturamento:", error);
      alert("Erro ao salvar faturamento.");
    }
  },

  async listarFaturamento() {
    try {
      const dados = await api.restGet("meses", "select=*&order=ano.desc,mes.asc");

      this.faturamentos = Array.isArray(dados) ? dados : [];

      const tbody = this.get("tabelaFaturamentoMensal");
      if (!tbody) return;

      if (!this.faturamentos.length) {
        tbody.innerHTML = `
          <tr>
            <td colspan="6" class="muted">Nenhum faturamento cadastrado.</td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = this.faturamentos.map(item => `
        <tr>
          <td>${item.mes || "-"}</td>
          <td>${item.ano || "-"}</td>
          <td><strong>${this.moeda(item.faturamento)}</strong></td>
          <td>${this.moeda(item.faturado)}</td>
          <td>${this.moeda(item.a_faturar)}</td>
          <td>
            <button class="btn-excluir" onclick="inserirDadosModule.excluirFaturamento(${Number(item.id)})">
              Excluir
            </button>
          </td>
        </tr>
      `).join("");
    } catch (error) {
      console.error("Erro ao carregar faturamento:", error);
      alert("Erro ao carregar faturamento.");
    }
  },

  async excluirFaturamento(id) {
    if (!confirm("Excluir este faturamento?")) return;

    try {
      await api.request(`meses?id=eq.${id}`, "", "DELETE");
      await this.listarFaturamento();
    } catch (error) {
      console.error("Erro ao excluir faturamento:", error);
      alert("Erro ao excluir faturamento.");
    }
  },

  // =========================
  // IMPORTAR GASTOS
  // =========================

  async importarContasPagas() {
    try {
      const arquivo = this.get("importArquivo")?.files?.[0];

      if (!arquivo) {
        alert("Selecione uma planilha.");
        return;
      }

      if (typeof XLSX === "undefined") {
        alert("Biblioteca XLSX não carregada. Confira o script no index.html.");
        return;
      }

      const mes = this.valor("importMes");
      const ano = String(this.valor("importAno"));

      const existentes = await api.restGet(
        "gastos",
        `select=*&mes=eq.${encodeURIComponent(mes)}&ano=eq.${encodeURIComponent(ano)}`
      );

      if (Array.isArray(existentes) && existentes.length > 0) {
        const confirmar = confirm(
          `Já existem ${existentes.length} gastos importados para ${mes}/${ano}.\n\nDeseja apagar os antigos e importar novamente?`
        );

        if (!confirmar) return;

        await api.request(
          `gastos?mes=eq.${encodeURIComponent(mes)}&ano=eq.${encodeURIComponent(ano)}`,
          "",
          "DELETE"
        );
      }

      const buffer = await arquivo.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const primeiraAba = workbook.SheetNames[0];
      const planilha = workbook.Sheets[primeiraAba];

      const linhas = XLSX.utils.sheet_to_json(planilha, {
        defval: "",
        raw: false
      });

      if (!linhas.length) {
        alert("A planilha está vazia.");
        return;
      }

      const registros = linhas.map(linha => {
        const normalizada = {};

        Object.keys(linha).forEach(chave => {
          const nome = String(chave)
            .trim()
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");

          normalizada[nome] = linha[chave];
        });

        const categoria =
          normalizada.categoria ||
          normalizada.categorias ||
          normalizada.tipo ||
          normalizada.grupo ||
          normalizada.classe ||
          "";

        const valor =
          normalizada.valor ||
          normalizada.total ||
          normalizada.pago ||
          normalizada.pagamento ||
          normalizada.vlr ||
          0;

        return {
          mes,
          ano,
          categoria: this.normalizarTexto(categoria),
          valor: this.numero(valor)
        };
      }).filter(item => item.categoria && item.valor > 0);

      if (!registros.length) {
        alert("Nenhuma linha válida encontrada. A planilha precisa ter Categoria e Valor.");
        return;
      }

      const confirmarImportacao = confirm(
        `Foram encontradas ${registros.length} linhas válidas.\n\nDeseja importar para ${mes}/${ano}?`
      );

      if (!confirmarImportacao) return;

      for (const item of registros) {
        await api.insert("gastos", item);
      }

      this.get("importArquivo").value = "";

      alert("Importação concluída com sucesso.");

      if (window.dashboardModule?.carregar) {
        dashboardModule.carregar();
      }
    } catch (error) {
      console.error("Erro ao importar planilha:", error);
      alert("Erro ao importar planilha.");
    }
  }
};

window.carregarInserirDados = () => inserirDadosModule.carregar();

window.inserirDadosUI = function(tipo) {
  document.querySelectorAll(".input-section").forEach(sec => {
    sec.style.display = "none";
  });

  document.querySelectorAll(".input-tab").forEach(btn => {
    btn.classList.remove("active");
  });

  const secao = document.querySelector(`.input-section[data-section="${tipo}"]`);
  if (secao) secao.style.display = "block";

  const botao = Array.from(document.querySelectorAll(".input-tab"))
    .find(btn => btn.getAttribute("onclick")?.includes(`'${tipo}'`));

  if (botao) botao.classList.add("active");
};
