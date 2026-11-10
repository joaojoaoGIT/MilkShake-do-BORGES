
// ===== CONFIGURAÇÃO SUPABASE =====

const SUPABASE_URL = 'https://wnzyzenmxxqpbhuvcdxg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_hJ4A0V-Spv8KGCmvrfdFLw_NnZFbuUA';

if (!window.supabase) {
  throw new Error('Biblioteca Supabase não foi carregada.');
}

const sb = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

// ===== ORDEM DAS TABELAS =====

const ORDER = [
  "fornecedor",
  "compra",
  "categoria_item",
  "item_estoque",
  "estoque_atual",
  "alerta_estoque",
  "produto",
  "tamanho_milkshake",
  "composicao_milkshake",
  "sabor_milkshake",
  "sabor_sorvete",
  "porcao_sorvete",
  "complemento",
  "combo",
  "combo_item",
  "loja",
  "forma_pagamento",
  "usuario",
  "item_compra",
  "venda",
  "item_venda",
  "personalizacao",
  "pagamento",
  "movimentacao_estoque",
  "perda_estoque",
  "pedido"
];

// ===== COMPATIBILIDADE COM BANCO SEM A MIGRAÇÃO 02 =====
// Se o banco ainda não recebeu supabase/ATUALIZAR-BANCO.sql, as tabelas novas não existem.
// Em vez de travar o login, o painel abre no "modo antigo": ignora as tabelas e colunas novas
// e mostra um aviso explicando o que rodar.
const NOVAS_TABELAS = ['sabor_milkshake', 'complemento', 'combo', 'combo_item', 'loja', 'pedido'];
const NOVAS_COLUNAS = {
  venda: ['id_loja', 'origem', 'status', 'custo_total'],
  item_venda: ['id_sabor_milkshake', 'id_combo', 'custo_total'],
  movimentacao_estoque: ['id_item_venda'],
  produto: ['slug'],
  sabor_sorvete: ['slug', 'ordem']
};
window.migracaoPendente = false;

function tabelaAusente(error) {
  const msg = (error && (error.message || '')).toLowerCase();
  return !!error && (error.code === 'PGRST205' || error.code === '42P01' || msg.includes('schema cache') || msg.includes('does not exist') || msg.includes('could not find the table'));
}

function mostrarAvisoMigracao() {
  if (document.getElementById('aviso-migracao')) return;
  const a = document.createElement('div');
  a.id = 'aviso-migracao';
  a.style.cssText = 'position:fixed;left:0;right:0;top:0;z-index:99;background:#fff3cd;color:#664d03;padding:10px 16px;font:600 14px system-ui;text-align:center;box-shadow:0 2px 8px #0003';
  a.innerHTML = 'O banco ainda não tem as tabelas do site (sabores de milkshake, lojas, pedidos). Abra o <b>SQL Editor</b> do Supabase, cole e rode o arquivo <b>admin/supabase/ATUALIZAR-BANCO.sql</b> e recarregue esta página. Até lá o painel funciona no modo antigo.';
  document.body.appendChild(a);
}

// ===== INDICADOR DE CARREGAMENTO (só aparece se demorar mais de 400 ms) =====
const Carga = {
  n: 0, timer: null, el: null,
  ligar(texto = 'Carregando...') {
    this.n++;
    if (this.n > 1) { if (this.el) this.el.lastChild.textContent = texto; return; }
    this.timer = setTimeout(() => {
      this.el = document.createElement('div'); this.el.id = 'carga'; this.el.setAttribute('role', 'status');
      this.el.innerHTML = '<span class="roda" aria-hidden="true"></span><span></span>'; this.el.lastChild.textContent = texto;
      document.body.appendChild(this.el); requestAnimationFrame(() => this.el && this.el.classList.add('on'));
    }, 400);
  },
  desligar() {
    this.n = Math.max(0, this.n - 1); if (this.n) return;
    clearTimeout(this.timer); const e = this.el; this.el = null;
    if (e) { e.classList.remove('on'); setTimeout(() => e.remove(), 250); }
  }
};

let snap = {};
let queue = Promise.resolve();

// ===== AUTENTICAÇÃO =====

async function sbLogin(email, password) {
  const { data, error } = await sb.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function sbLogout() {
  const { error } = await sb.auth.signOut();

  if (error) {
    throw new Error(error.message);
  }
}

// ===== VERIFICAR USUÁRIO LOGADO =====

async function sbGetSession() {
  const { data, error } = await sb.auth.getSession();

  if (error) {
    throw new Error(error.message);
  }

  return data.session;
}

// ===== CARREGAR TODAS AS TABELAS =====

async function sbLoadAll(silencioso) {
  if (!silencioso) Carga.ligar('Carregando os dados...');
  try { return await sbLoadAllInterno(); } finally { if (!silencioso) Carga.desligar(); }
}

async function sbLoadAllInterno() {
  const out = {};

  for (const t of ORDER) {
    let rows = [];
    let from = 0;

    while (true) {
      const { data, error } = await sb
        .from(t)
        .select('*')
        .order('id')
        .range(from, from + 999);

      if (error) {
        if (NOVAS_TABELAS.includes(t) && tabelaAusente(error)) {   // migração ainda não rodou
          window.migracaoPendente = true;
          rows = [];
          break;
        }
        throw new Error(t + ': ' + error.message);
      }

      rows = rows.concat(data);

      if (data.length < 1000) {
        break;
      }

      from += 1000;
    }

    out[t] = rows;
  }

  snap = JSON.parse(JSON.stringify(out));
  if (window.migracaoPendente) mostrarAvisoMigracao();

  return out;
}

// ===== SINCRONIZAR ALTERAÇÕES =====

async function sbSync() {

  const tabelasAtivas = window.migracaoPendente ? ORDER.filter(t => !NOVAS_TABELAS.includes(t)) : ORDER;
  const semNovas = (t, r) => {                       // modo antigo: tira as colunas que o banco ainda não tem
    if (!window.migracaoPendente || !NOVAS_COLUNAS[t]) return r;
    const c = { ...r }; NOVAS_COLUNAS[t].forEach(k => delete c[k]); return c;
  };

  for (const t of tabelasAtivas) {
    const old = new Map(
      (snap[t] || []).map(r => [
        r.id,
        JSON.stringify(r)
      ])
    );

    const changed = (DB[t] || []).filter(r =>
      old.get(r.id) !== JSON.stringify(r)
    );

    if (changed.length > 0) {
      const { error } = await sb
        .from(t)
        .upsert(changed.map(r => semNovas(t, r)));

      if (error) {
        throw new Error(t + ': ' + error.message);
      }
    }
  }

  for (const t of [...tabelasAtivas].reverse()) {
    const keep = new Set(
      (DB[t] || []).map(r => r.id)
    );

    const gone = (snap[t] || [])
      .filter(r => !keep.has(r.id))
      .map(r => r.id);

    if (gone.length > 0) {
      const { error } = await sb
        .from(t)
        .delete()
        .in('id', gone);

      if (error) {
        throw new Error(t + ': ' + error.message);
      }
    }
  }

  snap = JSON.parse(JSON.stringify(DB));
}

// ===== FILA DE SINCRONIZAÇÃO =====

function sbQueueSync() {
  Carga.ligar('Salvando...');
  queue = queue
    .then(() => sbSync().then(() => true))
    .catch(error => {
      console.error('Erro na sincronização:', error);

      alert(
        'Erro ao salvar no Supabase: ' +
        error.message
      );
      return false;                       // quem chamou sabe que não salvou
    })
    .finally(() => Carga.desligar());

  return queue;
}


// ===== ATUALIZAÇÃO AUTOMÁTICA =====
// O site grava pedidos direto no banco. Para o painel não trabalhar com dados velhos
// (e sobrescrever estoque sem querer), ele recarrega tudo a cada 20 s quando nada está sendo editado.
async function sbRefresh() {
  const dlg = document.getElementById('dlg');
  // DB é um "let" do app.js e NÃO vira window.DB; por isso o teste antigo (!window.DB) sempre parava aqui
  if (typeof DB === 'undefined' || !DB.venda || (dlg && dlg.open)) return;   // sem login ou janela de edição aberta
  const el = document.activeElement; if (el && el.classList && el.classList.contains('hub-busca')) return;   // digitando na busca
  await queue;                                       // espera salvamentos em andamento
  const antes = (DB.pedido || []).length;
  const fresh = await sbLoadAll(true);               // também renova o "snap"
  Object.keys(fresh).forEach(t => { DB[t] = fresh[t]; });
  const novos = (DB.pedido || []).length - antes;
  if (novos > 0 && typeof toast === 'function') toast('🛎 ' + novos + ' novo(s) pedido(s) do site!');
  if (typeof redraw === 'function') redraw();
  if (typeof hubBadge === 'function') hubBadge();
}
setInterval(() => { sbRefresh().catch(e => console.warn('Atualização falhou:', e.message)); }, 20000);
