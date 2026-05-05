const contasPagarModule = {

  dados: [],
  filtrados: [],
  selecionadas: new Set(),

  nfeRecebida: false,
  boletoRecebido: false,

  init() {
    this.bindEventos();
    this.render();
  },

  bindEventos() {
    document.getElementById('btnNfe')?.addEventListener('click', () => this.toggleInput('nfe'));
    document.getElementById('btnBoleto')?.addEventListener('click', () => this.toggleInput('boleto'));
  },

  toggleInput(tipo) {

    const btn = document.getElementById(tipo === 'nfe' ? 'btnNfe' : 'btnBoleto');
    if (!btn) return;

    const ativo = btn.classList.toggle('active');
    const texto = btn.querySelector('.toggle-text');

    if (tipo === 'nfe') {
      this.nfeRecebida = ativo;
      texto.innerText = ativo ? "Recebida" : "Não recebida";
    }

    if (tipo === 'boleto') {
      this.boletoRecebido = ativo;
      texto.innerText = ativo ? "Recebido" : "Não recebido";
    }
  },

  salvar() {

    const conta = {
      id: Date.now(),
      fornecedor: document.getElementById('cpFornecedor').value,
      documento: document.getElementById('cpDocumento').value,
      valor: this.parseValor(document.getElementById('cpValor').value),
      vencimento: document.getElementById('cpVencimento').value,
      categoria: document.getElementById('cpCategoria').value,
      descricao: document.getElementById('cpDescricao').value,
      nfe: this.nfeRecebida,
      boleto: this.boletoRecebido
    };

    if (!conta.fornecedor || !conta.valor) {
      alert("Preencha fornecedor e valor");
      return;
    }

    this.dados.push(conta);
    this.limparFormulario();
    this.aplicarFiltros();
  },

  limparFormulario() {
    document.querySelectorAll('#tab-contas-pagar input').forEach(i => i.value = "");

    this.nfeRecebida = false;
    this.boletoRecebido = false;

    document.getElementById('btnNfe')?.classList.remove('active');
    document.getElementById('btnBoleto')?.classList.remove('active');

    document.querySelector('#btnNfe .toggle-text').innerText = "Não recebida";
    document.querySelector('#btnBoleto .toggle-text').innerText = "Não recebido";
  },

  aplicarFiltros() {

    const busca = document.getElementById('cpBusca').value.toLowerCase();

    this.filtrados = this.dados.filter(c =>
      !busca ||
      c.fornecedor.toLowerCase().includes(busca) ||
      c.documento.toLowerCase().includes(busca) ||
      c.categoria.toLowerCase().includes(busca)
    );

    this.render();
  },

  selecionar(id) {
    if (this.selecionadas.has(id)) {
      this.selecionadas.delete(id);
    } else {
      this.selecionadas.add(id);
    }
    this.render();
  },

  selecionarTodos() {
    this.filtrados.forEach(c => this.selecionadas.add(c.id));
    this.render();
  },

  limparSelecao() {
    this.selecionadas.clear();
    this.render();
  },

  pagarSelecionadas() {
    this.dados = this.dados.filter(c => !this.selecionadas.has(c.id));
    this.selecionadas.clear();
    this.aplicarFiltros();
  },

  limparFiltros() {
    document.querySelectorAll('#tab-contas-pagar input').forEach(i => i.value = "");
    this.filtrados = [...this.dados];
    this.render();
  },

  render() {

    const tabela = document.getElementById('tabelaContasPagar');

    if (!tabela) return;

    if (!this.filtrados.length) {
      tabela.innerHTML = `<tr><td colspan="9" class="muted">Nenhuma conta.</td></tr>`;
      this.atualizarCards();
      return;
    }

    tabela.innerHTML = this.filtrados.map(c => `
      <tr>
        <td>
          <input type="checkbox"
            ${this.selecionadas.has(c.id) ? 'checked' : ''}
            onclick="contasPagarModule.selecionar(${c.id})"
          />
        </td>
        <td>${c.fornecedor}</td>
        <td>${c.documento}</td>
        <td>R$ ${this.formatar(c.valor)}</td>
        <td>${c.vencimento}</td>
        <td>${c.categoria}</td>
        <td>${c.descricao}</td>
        <td>
          ${c.nfe ? 'NFE' : '-'} /
          ${c.boleto ? 'Boleto' : '-'}
        </td>
        <td>
          <button onclick="contasPagarModule.remover(${c.id})">X</button>
        </td>
      </tr>
    `).join("");

    this.atualizarCards();
  },

  remover(id) {
    this.dados = this.dados.filter(c => c.id !== id);
    this.aplicarFiltros();
  },

  atualizarCards() {

    const total = this.dados.reduce((s, c) => s + c.valor, 0);
    const selecionado = this.dados
      .filter(c => this.selecionadas.has(c.id))
      .reduce((s, c) => s + c.valor, 0);

    document.getElementById('cpQtd').innerText = this.dados.length;
    document.getElementById('cpTotal').innerText = `R$ ${this.formatar(total)}`;
    document.getElementById('cpSelecionadas').innerText = this.selecionadas.size;
    document.getElementById('cpTotalSelecionado').innerText = `R$ ${this.formatar(selecionado)}`;
  },

  parseValor(v) {
    return Number(v.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
  },

  formatar(v) {
    return v.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  }

};

window.contasPagarModule = contasPagarModule;
