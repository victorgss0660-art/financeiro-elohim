window.contasPagasModule = {
  normalizarNumero(valor) {
    if (typeof valor === "number") return valor;
    if (valor == null) return 0;

    const texto = String(valor).trim();
    if (!texto) return 0;

    const semMoeda = texto.replace(/[R$\s]/g, "");
    const temVirgula = semMoeda.includes(",");
    const temPonto = semMoeda.includes(".");

    if (temVirgula && temPonto) {
      return Number(semMoeda.replace(/\./g, "").replace(",", ".")) || 0;
    }

    if (temVirgula) {
      return Number(semMoeda.replace(",", ".")) || 0;
    }

    return Number(semMoeda) || 0;
  },

  normalizarData(valor) {
    if (!valor) return "";

    if (typeof valor === "string") {
      const v = valor.trim();
      if (!v) return "";

      if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;

      if (/^\d{2}\/\d{2}\/\d{4}$/.test(v)) {
        const [dd, mm, yyyy] = v.split("/");
        return `${yyyy}-${mm}-${dd}`;
      }

      const d = new Date(v);
      if (!Number.isNaN(d.getTime())) {
        return d.toISOString().slice(0, 10);
      }

      return "";
    }

    if (typeof valor === "number") {
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      const date = new Date(excelEpoch.getTime() + valor * 86400000);
      return date.toISOString().slice(0, 10);
    }

    if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
      return valor.toISOString().slice(0, 10);
    }

    return "";
  },

  async carregarContasPagas() {
    try {
      const data = await api.restGet(
        "contas_pagar",
        `select=*&status=eq.pago&order=data_pagamento.desc`
      );

      const tbody = document.getElementById("tabelaContasPagas");

      if (!data.length) {
        tbody.innerHTML = `
          <tr>
            <td colspan="10" class="muted">Nenhuma conta paga.</td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = data.map(item => {
        const valor = Number(item.valor || 0);
        const multa = Number(item.multa || 0);
        const desconto = Number(item.desconto || 0);
        const totalPago = valor + multa - desconto;

        return `
          <tr>
            <td>${item.id ?? "-"}</td>
            <td>${item.fornecedor || "-"}</td>
            <td>${item.descricao || "-"}</td>
            <td>${item.categoria || "-"}</td>
            <td>${item.documento || "-"}</td>
            <td>${utils.moeda(valor)}</td>
            <td>${item.data_pagamento || "-"}</td>
            <td>${utils.moeda(multa)}</td>
            <td>${utils.moeda(desconto)}</td>
            <td>
              <div style="display:flex; gap:6px; flex-wrap:wrap; align-items:center;">
                <span class="ok" style="font-weight:700;">${utils.moeda(totalPago)}</span>
                <button class="small-btn small-yellow" onclick="contasPagasModule.cancelarPagamento(${item.id})">
                  Cancelar
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join("");
    } catch (e) {
      utils.setAppMsg("Erro ao carregar contas pagas: " + e.message, "err");
    }
  },

  async cancelarPagamento(id) {
    try {
      await api.restPatch("contas_pagar", `id=eq.${id}`, {
        status: "pendente",
        data_pagamento: null,
        multa: 0,
        desconto: 0
      });

      utils.setAppMsg("Pagamento cancelado com sucesso.", "ok");

      await this.carregarContasPagas();

      if (window.contasPagarModule?.carregarContasPagar) {
        await window.contasPagarModule.carregarContasPagar();
      }

      if (window.planejamentoModule?.carregarPlanejamento) {
        await window.planejamentoModule.carregarPlanejamento();
      }
    } catch (e) {
      utils.setAppMsg("Erro ao cancelar pagamento: " + e.message, "err");
    }
  },

  async importarPlanilha(event) {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      if (!rows.length) {
        utils.setAppMsg("A planilha está vazia.", "err");
        return;
      }

      const { mes, ano } = utils.getMesAno();

      const linhas = rows.map(row => {
        const id = row.id || row.ID || "";
        return {
          id: String(id).trim(),
          fornecedor: String(row.fornecedor || row.FORNECEDOR || "").trim(),
          descricao: String(row.descricao || row.DESCRICAO || row["DESCRIÇÃO"] || "").trim(),
          categoria: String(row.categoria || row.CATEGORIA || "").trim(),
          documento: String(row.documento || row.DOCUMENTO || "").trim(),
          valor: this.normalizarNumero(row.valor || row.VALOR || 0),
          data_pagamento: this.normalizarData(row.data_pagamento || row["PAGO EM"] || row["PAGO_EM"] || ""),
          multa: this.normalizarNumero(row.multa || row.MULTA || 0),
          desconto: this.normalizarNumero(row.desconto || row.DESCONTO || 0),
          observacoes: String(row.observacoes || row.OBSERVACOES || row["OBSERVAÇÕES"] || "").trim(),
          status: "pago",
          mes,
          ano
        };
      }).filter(item =>
        item.fornecedor && item.descricao && item.valor && item.data_pagamento
      );

      if (!linhas.length) {
        utils.setAppMsg("Nenhuma linha válida encontrada na planilha.", "err");
        return;
      }

      for (const item of linhas) {
        const payload = {
          fornecedor: item.fornecedor,
          descricao: item.descricao,
          categoria: item.categoria,
          documento: item.documento,
          valor: item.valor,
          data_pagamento: item.data_pagamento,
          multa: item.multa,
          desconto: item.desconto,
          observacoes: item.observacoes,
          status: "pago",
          mes: item.mes,
          ano: item.ano
        };

        if (item.id) {
          await api.restPatch("contas_pagar", `id=eq.${item.id}`, payload);
        } else {
          await api.restInsert("contas_pagar", [{
            ...payload,
            vencimento: item.data_pagamento
          }]);
        }
      }

      utils.setAppMsg("Planilha de contas pagas importada com sucesso.", "ok");

      event.target.value = "";
      await this.carregarContasPagas();

      if (window.contasPagarModule?.carregarContasPagar) {
        await window.contasPagarModule.carregarContasPagar();
      }

      if (window.planejamentoModule?.carregarPlanejamento) {
        await window.planejamentoModule.carregarPlanejamento();
      }
    } catch (e) {
      utils.setAppMsg("Erro ao importar contas pagas: " + e.message, "err");
    }
  },

  exportarPlanilha() {
    try {
      const tbody = document.getElementById("tabelaContasPagas");
      if (!tbody) return;

      const linhas = Array.from(tbody.querySelectorAll("tr"));
      const dados = [];

      linhas.forEach(tr => {
        const tds = tr.querySelectorAll("td");
        if (tds.length < 10) return;

        const id = tds[0].innerText.trim();
        if (!id || id === "-") return;

        const valorTexto = tds[5].innerText.trim();
        const dataPagamento = tds[6].innerText.trim();
        const multaTexto = tds[7].innerText.trim();
        const descontoTexto = tds[8].innerText.trim();

        dados.push({
          id,
          fornecedor: tds[1].innerText.trim(),
          descricao: tds[2].innerText.trim(),
          categoria: tds[3].innerText.trim(),
          documento: tds[4].innerText.trim(),
          valor: this.normalizarNumero(valorTexto),
          data_pagamento: dataPagamento === "-" ? "" : dataPagamento,
          multa: this.normalizarNumero(multaTexto),
          desconto: this.normalizarNumero(descontoTexto),
          status: "pago"
        });
      });

      const worksheet = XLSX.utils.json_to_sheet(dados);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Contas Pagas");

      const hoje = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(workbook, `contas_pagas_${hoje}.xlsx`);
    } catch (e) {
      utils.setAppMsg("Erro ao exportar contas pagas: " + e.message, "err");
    }
  }
};
