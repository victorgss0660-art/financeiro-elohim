window.dashboardModule = {

  gastos: [],

  meses: [],

  metas: [],

  chartMeta: null,

  chartDistribuicao: null,

  chartEvolucao: null,

  async carregar() {

    try {

      this.gastos = await api.restGet(

        "gastos",

        "select=*"

      ) || [];

      this.meses = await api.restGet(

        "meses",

        "select=*"

      ) || [];

      this.metas = await api.restGet(

        "metas",

        "select=*"

      ) || [];

      this.renderizar();

    } catch (erro) {

      console.error(

        "Erro dashboard:",

        erro

      );

      alert("Erro ao carregar dashboard.");

    }

  },

  // ======================================================

  // HELPERS

  // ======================================================

  get(id){

    return document.getElementById(id);

  },

  set(id, valor){

    const el = this.get(id);

    if(el){

      el.textContent = valor;

    }

  },

  numero(valor){

    if(typeof valor === "number"){

      return isNaN(valor) ? 0 : valor;

    }

    if(!valor) return 0;

    let txt = String(valor)

      .replace(/\s/g,"")

      .replace(/R\$/g,"");

    // 1.234,56

    if(txt.includes(".") && txt.includes(",")){

      txt = txt

        .replace(/\./g,"")

        .replace(",", ".");

    } else if(txt.includes(",")) {

      txt = txt.replace(",", ".");

    }

    const n = parseFloat(txt);

    return isNaN(n) ? 0 : n;

  },

  moeda(valor){

    return new Intl.NumberFormat(

      "pt-BR",

      {

        style:"currency",

        currency:"BRL"

      }

    ).format(

      this.numero(valor)

    );

  },

  normalizar(texto){

    return String(texto || "")

      .trim()

      .toUpperCase();

  },

  mesSelecionado(){

    return this.get("mesSelect")?.value || "";

  },

  anoSelecionado(){

    return String(

      this.get("anoSelect")?.value || ""

    );

  },

  // ======================================================

  // RENDER

  // ======================================================

  renderizar(){

    const mes = this.mesSelecionado();

    const ano = this.anoSelecionado();

    const gastosMes = this.gastos.filter(item =>

      this.normalizar(item.mes) === this.normalizar(mes)

      &&

      String(item.ano) === String(ano)

    );

    const faturamentoMes = this.meses.find(item =>

      this.normalizar(item.mes) === this.normalizar(mes)

      &&

      String(item.ano) === String(ano)

    );

    const metasMes = this.metas.filter(item =>

      this.normalizar(item.mes) === this.normalizar(mes)

      &&

      String(item.ano) === String(ano)

    );

    // ======================================================

    // KPIS

    // ======================================================

    const totalGastos = gastosMes.reduce(

      (t,item)=> t + this.numero(item.valor),

      0

    );

    const faturamento =

      this.numero(

        faturamentoMes?.faturamento

      );

    const faturado =

      this.numero(

        faturamentoMes?.faturado

      );

    const aFaturar =

      this.numero(

        faturamentoMes?.a_faturar

      );

    const lucro =

      faturamento - totalGastos;

    const margem =

      faturamento > 0

      ? (lucro / faturamento) * 100

      : 0;

    this.set(

      "dashFaturamento",

      this.moeda(faturamento)

    );

    this.set(

      "dashGastos",

      this.moeda(totalGastos)

    );

    this.set(

      "dashLucro",

      this.moeda(lucro)

    );

    this.set(

      "dashMargem",

      margem.toFixed(1) + "%"

    );

    // ======================================================

    // STATUS

    // ======================================================

    let status = "SAUDÁVEL";

    let descricao = "Operação dentro do esperado.";

    if(faturamento <= 0){

      status = "SEM DADOS";

      descricao = "Nenhum faturamento encontrado.";

    } else if(lucro < 0){

      status = "CRÍTICO";

      descricao = "Os gastos estão acima do faturamento.";

    } else if(margem < 10){

      status = "ATENÇÃO";

      descricao = "Margem abaixo do ideal.";

    }

    this.set("dashStatus", status);

    this.set("dashStatusDesc", descricao);

    // ======================================================

    // GRÁFICOS

    // ======================================================

    this.graficoDistribuicao(

      gastosMes

    );

    this.graficoMeta(

      gastosMes,

      metasMes,

      faturamento

    );

    this.graficoEvolucao(

      ano

    );

    this.tabelaCategorias(

      gastosMes

    );

  },

  // ======================================================

  // AGRUPAR

  // ======================================================

  agruparCategorias(lista){

    const mapa = {};

    lista.forEach(item => {

      const categoria =

        this.normalizar(item.categoria);

      mapa[categoria] =

        (mapa[categoria] || 0)

        +

        this.numero(item.valor);

    });

    return mapa;

  },

  // ======================================================

  // META

  // ======================================================

  graficoMeta(gastos, metas, faturamento){

    const ctx =

      this.get("chartMetaCategoria");

    if(!ctx || typeof Chart === "undefined"){

      return;

    }

    if(this.chartMeta){

      this.chartMeta.destroy();

    }

    const gastosMap =

      this.agruparCategorias(gastos);

    const categorias =

      [...new Set([

        ...Object.keys(gastosMap),

        ...metas.map(m =>

          this.normalizar(m.categoria)

        )

      ])];

    const real = [];

    const meta = [];

    categorias.forEach(cat => {

      real.push(

        gastosMap[cat] || 0

      );

      const metaItem =

        metas.find(m =>

          this.normalizar(m.categoria) === cat

        );

      const percentual =

        this.numero(

          metaItem?.percentual_meta

        );

      meta.push(

        (faturamento * percentual) / 100

      );

    });

    this.chartMeta = new Chart(ctx, {

      data:{

        labels:categorias,

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

  // ======================================================

  // DISTRIBUIÇÃO

  // ======================================================

  graficoDistribuicao(gastos){

    const ctx =

      this.get("chartDistribuicao");

    if(!ctx || typeof Chart === "undefined"){

      return;

    }

    if(this.chartDistribuicao){

      this.chartDistribuicao.destroy();

    }

    const mapa =

      this.agruparCategorias(gastos);

    this.chartDistribuicao = new Chart(ctx, {

      type:"doughnut",

      data:{

        labels:Object.keys(mapa),

        datasets:[

          {

            data:Object.values(mapa)

          }

        ]

      },

      options:{

        responsive:true,

        maintainAspectRatio:false

      }

    });

  },

  // ======================================================

  // EVOLUÇÃO

  // ======================================================

  graficoEvolucao(ano){

    const ctx =

      this.get("chartEvolucao");

    if(!ctx || typeof Chart === "undefined"){

      return;

    }

    if(this.chartEvolucao){

      this.chartEvolucao.destroy();

    }

    const meses = [

      "Janeiro","Fevereiro","Março","Abril",

      "Maio","Junho","Julho","Agosto",

      "Setembro","Outubro","Novembro","Dezembro"

    ];

    const faturamento = [];

    const gastos = [];

    const lucro = [];

    meses.forEach(mes => {

      const fat =

        this.meses.find(item =>

          this.normalizar(item.mes)

          ===

          this.normalizar(mes)

          &&

          String(item.ano)

          ===

          String(ano)

        );

      const gastosMes =

        this.gastos.filter(item =>

          this.normalizar(item.mes)

          ===

          this.normalizar(mes)

          &&

          String(item.ano)

          ===

          String(ano)

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

    this.chartEvolucao = new Chart(ctx, {

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

  // ======================================================

  // TABELA

  // ======================================================

  tabelaCategorias(gastos){

    const tbody =

      this.get("tabelaTopCategorias");

    if(!tbody) return;

    const mapa =

      this.agruparCategorias(gastos);

    const lista =

      Object.entries(mapa)

      .sort((a,b)=>b[1]-a[1]);

    tbody.innerHTML = lista.map(item => `

      <tr>

        <td>

          <strong>${item[0]}</strong>

        </td>

        <td>

          ${this.moeda(item[1])}

        </td>

      </tr>

    `).join("");

  }

};

window.carregarDashboard = () => {

  dashboardModule.carregar();

};
