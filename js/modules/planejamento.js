window.planejamentoModule = {

  dadosPagar: [],

  dadosReceber: [],

  get(id) {

    return document.getElementById(id);

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

  addDias(data, dias) {

    const d = new Date(data + "T00:00:00");

    d.setDate(d.getDate() + dias);

    return d.toISOString().slice(0, 10);

  },

  inicioSemana(data) {

    const d = new Date(data + "T00:00:00");

    const dia = d.getDay(); // 0 domingo

    const ajuste = dia === 0 ? -6 : 1 - dia;

    d.setDate(d.getDate() + ajuste);

    return d.toISOString().slice(0, 10);

  },

  dataBR(data) {

    const d = new Date(data + "T00:00:00");

    return d.toLocaleDateString("pt-BR");

  },

  async carregar() {

    try {

      const pagar = await api.restGet("contas_pagar", "select=*");

      const receber = await api.restGet("contas_receber", "select=*");

      this.dadosPagar = Array.isArray(pagar) ? pagar : [];

      this.dadosReceber = Array.isArray(receber) ? receber : [];

      this.renderizar();

    } catch (e) {

      console.error(e);

      alert("Erro ao carregar planejamento.");

    }

  },

  renderizar() {

    const tbody = this.get("tabelaPlanejamento");

    if (!tbody) return;

    const hoje = new Date().toISOString().slice(0,10);

    let inicio = this.inicioSemana(hoje);

    let linhas = "";

    let totalReceber = 0;

    let totalPagar = 0;

    let totalSaldo = 0;

    for (let i = 0; i < 12; i++) {

      const fim = this.addDias(inicio, 6);

      const receberSemana = this.dadosReceber

        .filter(item => {

          const data = item.vencimento || "";

          return data >= inicio && data <= fim;

        })

        .reduce((acc, item) => acc + this.numero(item.valor), 0);

      const pagarSemana = this.dadosPagar

        .filter(item => {

          const data = item.vencimento || "";

          return data >= inicio && data <= fim &&

            String(item.status || "pendente").toLowerCase() !== "pago";

        })

        .reduce((acc, item) => acc + this.numero(item.valor), 0);

      const saldo = receberSemana - pagarSemana;

      totalReceber += receberSemana;

      totalPagar += pagarSemana;

      totalSaldo += saldo;

      linhas += `

        <tr>

          <td>${i + 1}</td>

          <td>${this.dataBR(inicio)} até ${this.dataBR(fim)}</td>

          <td>${this.moeda(receberSemana)}</td>

          <td>${this.moeda(pagarSemana)}</td>

          <td style="font-weight:700;color:${saldo >= 0 ? '#16a34a' : '#dc2626'}">

            ${this.moeda(saldo)}

          </td>

        </tr>

      `;

      inicio = this.addDias(inicio, 7);

    }

    linhas += `

      <tr style="font-weight:800;background:#f8fafc">

        <td colspan="2">TOTAL 12 SEMANAS</td>

        <td>${this.moeda(totalReceber)}</td>

        <td>${this.moeda(totalPagar)}</td>

        <td style="color:${totalSaldo >= 0 ? '#16a34a' : '#dc2626'}">

          ${this.moeda(totalSaldo)}

        </td>

      </tr>

    `;

    tbody.innerHTML = linhas;

  }

};

window.carregarPlanejamento = () =>

  planejamentoModule.carregar();
