window.dashboardModule = {

  gastos: [],
  meses: [],
  metas: [],

  chartMeta: null,
  chartDistribuicao: null,
  chartEvolucao: null,

  mesesLista: [
    "Janeiro","Fevereiro","Março","Abril",
    "Maio","Junho","Julho","Agosto",
    "Setembro","Outubro","Novembro","Dezembro"
  ],

  get(id){
    return document.getElementById(id);
  },

  set(id, valor){
    const el = this.get(id);
    if(el) el.textContent = valor;
  },

  normalizar(texto){
    return String(texto || "")
      .trim()
      .toUpperCase();
  },

  numero(valor){

    if (typeof valor === "number") {
      return isNaN(valor) ? 0 : valor;
    }

    if (valor === null || valor === undefined || valor === "") {
      return 0;
    }

    let txt = String(valor)
      .trim()
      .replace(/R\$/gi, "")
      .replace(/\s/g, "")
      .replace(/[^\d,.-]/g, "");

    if (txt.includes(".") && txt.includes(",")) {
      txt = txt.replace(/\./g, "").replace(",", ".");
    } else if (txt.includes(",")) {
      txt = txt.replace(",", ".");
    }

    const n = parseFloat(txt);

    return isNaN(n) ? 0 : n;
  },

  moeda(valor){
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(this.numero(valor));
  },

  mesSelecionado(){
    return this.get("mesSelect")?.value || "Janeiro";
  },

  anoSelecionado(){
    return String(
      this.get("anoSelect")?.value || new Date().getFullYear()
    );
  },

  async carregar(){

    try {

      const mes = this.mesSelecionado();
      const ano = this.anoSelecionado();

      const [gastos, meses, metas, gastosAno] = await Promise.all([

        api.restGet(
          "gastos",
          `select=*&mes=eq.${encodeURIComponent(mes)}&ano=eq.${encodeURIComponent(ano)}&limit=10000`
        ),

        api.restGet(
          "meses",
          `select=*&ano=eq.${encodeURIComponent(ano)}&limit=1000`
        ),

        api.restGet(
          "metas",
          `select=*&mes=eq.${encodeURIComponent(mes)}&ano=eq.${encodeURIComponent(ano)}&limit=1000`
        ),

        api.restGet(
          "gastos",
          `select=*&ano=eq.${encodeURIComponent(ano)}&limit=20000`
        )
      ]);

      this.gastos = Array.isArray(gastos) ? gastos : [];
      this.gastosAno = Array.isArray(gastosAno) ? gastosAno : [];
      this.meses = Array.isArray(meses) ? meses : [];
      this.metas = Array.isArray(metas) ? metas : [];

      this.renderizar();

    } catch (erro) {

      console.error("Erro dashboard:", erro);
      alert("Erro ao carregar dashboard.");
    }
  },

  agruparCategorias(lista){

    const mapa = {};

    (lista || []).forEach(item => {

      const categoria =
        this.normalizar(item.categoria || "SEM CATEGORIA");

      mapa[categoria] =
        (mapa[categoria] || 0)
        +
        this.numero(item.valor);
    });

    return mapa;
  },

  renderizar(){

    const mes = this.mesSelecionado();
    const ano = this.anoSelecionado();

    const gastosMes = this.gastos;

    const faturamentoMes = this.meses.find(item =>
      this.normalizar(item.mes) === this.normalizar(mes)
      &&
      String(item.ano) === String(ano)
    );

    const metasMes = this.metas;

    const totalGastos = gastosMes.reduce(
      (t,item)=> t + this.numero(item.valor),
      0
    );

    const faturamento =
      this.numero(faturamentoMes?.faturamento);

    const lucro =
      faturamento - totalGastos;

    const margem =
      faturamento > 0
        ? (lucro / faturamento) * 100
        : 0;

    this.set("dashFaturamento", this.moeda(faturamento));
    this.set("dashGastos", this.moeda(totalGastos));
    this.set("dashLucro", this.moeda(lucro));
    this.set("dashMargem", margem.toFixed(1) + "%");

    let status = "SAUDÁVEL";
    let descricao = "Operação dentro do esperado.";

    if (faturamento <= 0) {
      status = "SEM DADOS";
      descricao = "Nenhum faturamento encontrado.";
    }
    else if (lucro < 0) {
      status = "CRÍTICO";
      descricao = "Os gastos estão acima do faturamento.";
    }
    else if (margem < 10) {
      status = "ATENÇÃO";
      descricao = "Margem abaixo do ideal.";
    }

    this.set("dashStatus", status);
    this.set("dashStatusDesc", descricao);

    this.graficoDistribuicao(gastosMes);
    this.graficoMeta(gastosMes, metasMes, faturamento);
    this.graficoEvolucao(ano);
    this.tabelaCategorias(gastosMes);
  },

  graficoMeta(gastos, metas, faturamento){

    const ctx = this.get("chartMetaCategoria");
    if(!ctx || typeof Chart === "undefined") return;

    if(this.chartMeta){
      this.chartMeta.destroy();
    }

    const gastosMap = this.agruparCategorias(gastos);

    const categorias = [
      ...new Set([
        ...Object.keys(gastosMap),
        ...(metas || []).map(m => this.normalizar(m.categoria))
      ])
    ];

    if (!categorias.length) {
      categorias.push("SEM DADOS");
    }

    const real = [];
    const meta = [];

    categorias.forEach(cat => {

      real.push(gastosMap[cat] || 0);

      const metaItem = metas.find(m =>
        this.normalizar(m.categoria) === cat
      );

      const percentual =
        this.numero(metaItem?.percentual_meta);

      meta.push(
        (faturamento * percentual) / 100
      );
    });

    this.chartMeta = new Chart(ctx,{
      data:{
        labels: categorias,
        datasets:[
          {
            type:"bar",
            label:"Real",
            data:real,
            backgroundColor:"#ef4444"
          },
          {
            type:"line",
            label:"Meta",
            data:meta,
            borderColor:"#22c55e",
            borderWidth:3,
            tension:0.4
          }
        ]
      },
      options:{
        responsive:true,
        maintainAspectRatio:false
      }
    });
  },

  graficoDistribuicao(gastos){

    const ctx = this.get("chartDistribuicao");
    if(!ctx || typeof Chart === "undefined") return;

    if(this.chartDistribuicao){
      this.chartDistribuicao.destroy();
    }

    const mapa = this.agruparCategorias(gastos);

    const labels = Object.keys(mapa);
    const valores = Object.values(mapa);

    this.chartDistribuicao = new Chart(ctx,{
      type:"doughnut",
      data:{
        labels: labels.length ? labels : ["SEM DADOS"],
        datasets:[
          {
            data: valores.length ? valores : [1]
          }
        ]
      },
      options:{
        responsive:true,
        maintainAspectRatio:false
      }
    });
  },

  graficoEvolucao(ano){

    const ctx = this.get("chartEvolucao");
    if(!ctx || typeof Chart === "undefined") return;

    if(this.chartEvolucao){
      this.chartEvolucao.destroy();
    }

    const faturamento = [];
    const gastos = [];
    const lucro = [];

    this.mesesLista.forEach(mes => {

      const fat = this.meses.find(item =>
        this.normalizar(item.mes) === this.normalizar(mes)
        &&
        String(item.ano) === String(ano)
      );

      const gastosMes = this.gastosAno.filter(item =>
        this.normalizar(item.mes) === this.normalizar(mes)
        &&
        String(item.ano) === String(ano)
      );

      const valorFat =
        this.numero(fat?.faturamento);

      const valorGastos =
        gastosMes.reduce(
          (t,item)=>t+this.numero(item.valor),
          0
        );

      faturamento.push(valorFat);
      gastos.push(valorGastos);
      lucro.push(valorFat - valorGastos);
    });

    this.chartEvolucao = new Chart(ctx,{
      type:"line",
      data:{
        labels:[
          "Jan","Fev","Mar","Abr","Mai","Jun",
          "Jul","Ago","Set","Out","Nov","Dez"
        ],
        datasets:[
          {
            label:"Faturamento",
            data:faturamento,
            borderColor:"#22c55e",
            tension:0.4
          },
          {
            label:"Gastos",
            data:gastos,
            borderColor:"#ef4444",
            tension:0.4
          },
          {
            label:"Lucro",
            data:lucro,
            borderColor:"#3b82f6",
            tension:0.4
          }
        ]
      },
      options:{
        responsive:true,
        maintainAspectRatio:false
      }
    });
  },

  tabelaCategorias(gastos){

    const tbody = this.get("tabelaTopCategorias");
    if(!tbody) return;

    const mapa = this.agruparCategorias(gastos);

    const lista = Object.entries(mapa)
      .sort((a,b)=>b[1]-a[1]);

    if (!lista.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="2" class="muted">
            Nenhum gasto encontrado.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = lista.map(item => `
      <tr>
        <td><strong>${item[0]}</strong></td>
        <td>${this.moeda(item[1])}</td>
      </tr>
    `).join("");
  }
};

window.carregarDashboard = () => {
  dashboardModule.carregar();
};
