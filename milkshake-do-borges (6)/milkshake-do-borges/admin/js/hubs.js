/* =====================================================================
   DASHBOARDS POR CATEGORIA  (carrega DEPOIS do app.js)
   O menu deixou de ter 13 itens soltos. Agora são 6 áreas, e cada uma é um dashboard:
     Vendas e pedidos | Lojas | Cardápio | Estoque e compras | Ajustes
   Dentro de cada dashboard: indicadores no topo + abas com as tabelas mais específicas.
   As telas antigas (pedidos, relatório diário, listas) continuam as mesmas; só ganharam um "lugar".
   ===================================================================== */
(() => {
  const _dash = window.dash, _rel = window.rel, _pedidos = window.pedidos;

  /* ---------- utilidades ---------- */
  const fdh = (s, ano) => { if (!s) return '–'; const d = String(s).replace(' ', 'T'); return d.slice(8, 10) + '/' + d.slice(5, 7) + (ano ? '/' + d.slice(0, 4) : '') + (d.length > 10 ? ' ' + d.slice(11, 16) : '') };
  const ativas = () => (DB.venda || []).filter(v => v.status !== 'cancelada');
  const periodo = n => { const lim = n ? dtLocal(Date.now() - (n - 1) * 864e5) : ''; return ativas().filter(v => (v.data_venda || '').slice(0, 10) >= lim) };
  const qtdAtual = id => { const e = (DB.estoque_atual || []).find(x => x.id_item_estoque == id); return e ? +e.quantidade_disponivel || 0 : 0 };
  const itensBaixos = () => (DB.item_estoque || []).filter(i => i.ativo !== false).map(i => ({ i, q: qtdAtual(i.id) })).filter(x => x.q <= (+x.i.estoque_minimo || 0));
  const kpi = (ico, t, v, sub, cls = '', fmt = '') => `<div class="card dx-card ${cls}"><span class="dx-ico">${ico}</span><small>${t}</small><b ${fmt ? `data-v="${v}" data-f="${fmt}"` : 'class="txt"'}>${fmt === 'brl' ? brl(v) : v}</b><em>${sub}</em></div>`;
  const corpo = h => { const c = $('#hub-corpo'); if (c) c.innerHTML = h };
  const painel = (kick, titulo, inner, cls = '') => `<article class="panel hb-panel ${cls}"><div class="report-heading"><div><span class="dx-kick">${kick}</span><h3>${titulo}</h3></div></div>${inner}</article>`;
  const mini = (cab, linhas, vazio) => linhas.length ? `<div class="tb-wrap"><table class="tb"><tr>${cab.map(c => `<th>${c}</th>`).join('')}</tr>${linhas.map(l => `<tr>${l.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</table></div>` : `<p class="report-empty">${vazio}</p>`;
  const topProdutos = (vs, max = 8) => {
    const ids = new Set(vs.map(v => v.id)), m = {};
    (DB.item_venda || []).filter(i => ids.has(i.id_venda)).forEach(i => { const n = soldItemName(i), o = m[n] ??= { q: 0, t: 0 }; o.q += +i.quantidade || 0; o.t += +i.valor_total || 0 });
    return Object.entries(m).sort((a, b) => b[1].q - a[1].q).slice(0, max);
  };
  // roda uma tela antiga (rel, pedidos...) mas desenhando DENTRO da aba, não na tela toda
  const emHub = (fn, ...a) => { const o = window.view; window.view = h => corpo(h); try { fn(...a) } finally { window.view = o } };

  /* ---------- tabela genérica (busca, mais registros, editar/excluir) ---------- */
  const MONEY = /(valor|preco|custo|total|desconto|troco|adicional)/;
  const rotulo = n => { n = n.replace(/^id_/, '').replace(/_/g, ' '); return n.charAt(0).toUpperCase() + n.slice(1) };
  window.__tb = window.__tb || {};
  const cols = t => fields(t).filter(f => !/senha/.test(f.n)).slice(0, 8);
  const celula = (f, v) => {
    if (v == null || v === '') return '<span class="mut">–</span>';
    if (f.t === 'fk') return esc(lbl(f.o, v)) || '<span class="mut">–</span>';
    if (f.t === 'bool') return v ? '<span class="sim">✔</span>' : '<span class="nao">–</span>';
    if (f.t === 'datetime') return fdh(v);
    if (f.t === 'date') return fdh(v, true);
    if (f.t === 'num' && MONEY.test(f.n)) return brl(v);
    if (f.n === 'status') return `<span class="pd-chip st-${esc(v)}">${esc(v)}</span>`;
    return esc(String(v).length > 48 ? String(v).slice(0, 46) + '…' : v);
  };
  const tabelaCorpo = t => {
    const st = window.__tb[t] ??= { q: '', lim: 50 }, F = cols(t), dcol = F.find(f => (f.t === 'datetime' || f.t === 'date') && /^(data_|criado)/.test(f.n)), ordem = F.find(f => f.n === 'ordem');
    let rows = [...(DB[t] || [])];
    if (st.q) { const q = norm(st.q); rows = rows.filter(r => norm(F.map(f => show(f, r[f.n])).join(' ') + ' ' + r.id).includes(q)) }
    rows.sort((a, b) => dcol ? String(b[dcol.n] || '').localeCompare(String(a[dcol.n] || '')) : ordem ? (a.ordem || 0) - (b.ordem || 0) : t === 'pedido' ? b.id - a.id : a.id - b.id);
    const total = rows.length, vis = rows.slice(0, st.lim);
    return `<div class="tb-wrap"><table class="tb"><tr><th>#</th>${F.map(f => `<th>${rotulo(f.n)}</th>`).join('')}<th></th></tr>${vis.map(r => `<tr><td class="id">${r.id}</td>${F.map(f => `<td>${celula(f, r[f.n])}</td>`).join('')}<td class="ac"><button class="s" onclick="window.edit('${t}',${r.id})">Editar</button><button class="s x" onclick="window.del('${t}',${r.id})" title="Excluir">×</button></td></tr>`).join('') || `<tr><td colspan="${F.length + 2}" class="report-empty">Nada encontrado.</td></tr>`}</table></div>
      ${total > vis.length ? `<div class="tb-mais"><button class="s" onclick="window.hubMais('${t}')">Mostrar mais (${total - vis.length} restantes)</button></div>` : ''}`;
  };
  const tabelaHub = (t, titulo) => {
    const st = window.__tb[t] ??= { q: '', lim: 50 };
    return `<section class="tb-card"><div class="tb-topo"><div><h3>${titulo}</h3><small>${(DB[t] || []).length} registro(s)</small></div><div class="tb-ferr"><input class="hub-busca" type="search" placeholder="🔎 Buscar..." value="${esc(st.q)}" oninput="window.hubBusca('${t}',this.value)"><button onclick="window.edit('${t}')">+ Novo</button></div></div><div id="tb-corpo">${tabelaCorpo(t)}</div></section>`;
  };
  window.hubBusca = (t, q) => { const s = window.__tb[t] ??= { q: '', lim: 50 }; s.q = q; s.lim = 50; const el = $('#tb-corpo'); if (el) el.innerHTML = tabelaCorpo(t) };
  window.hubMais = t => { window.__tb[t].lim += 50; const el = $('#tb-corpo'); if (el) el.innerHTML = tabelaCorpo(t) };

  /* ---------- telas "Visão geral" de cada área ---------- */
  function vendasGeral() {
    const ds = [...Array(7)].map((_, i) => dtLocal(Date.now() - (6 - i) * 864e5)), tot = ds.map(d => sum(ativas().filter(v => (v.data_venda || '').slice(0, 10) === d), 'valor_total'));
    const v30 = periodo(30), ids = new Set(v30.map(v => v.id)), pg = {};
    (DB.pagamento || []).filter(p => ids.has(p.id_venda)).forEach(p => { const n = (lbl('forma_pagamento', p.id_forma_pagamento) || 'Outro').replaceAll('_', ' '); pg[n] = (pg[n] || 0) + (+p.valor || 0) });
    const top = topProdutos(v30), site = v30.filter(v => v.origem === 'site').length;
    corpo(`<div class="dx-duas">${painel('MOVIMENTO', '📈 Vendas dos últimos 7 dias', '<canvas id="hc1" data-h="240"></canvas>')}${miniPedidos()}</div>
      <div class="dx-duas eq">${painel('RECEBIMENTOS · 30 DIAS', '💳 Formas de pagamento', '<canvas id="hc2" data-h="200"></canvas>')}${painel('MAIS VENDIDOS · 30 DIAS', '🍧 Top produtos', mini(['Produto', 'Qtd', 'Faturamento'], top.map(([n, o]) => [esc(n), o.q, brl(o.t)]), 'Sem vendas no período.') + `<p class="hb-nota">Origem das vendas: <b>${site}</b> pelo site · <b>${v30.length - site}</b> no balcão (30 dias).</p>`)}</div>`);
    bars('hc1', ds.map(d => d.slice(8) + '/' + d.slice(5, 7)), tot, ['#E8558E', '#FAD0DE']);
    donut('hc2', Object.keys(pg), Object.values(pg), ['#E8558E', '#2F6F50', '#FFB84D', '#5BB88C', '#C93573']);
  }
  function lojasGeral() {
    const per = window.lojaPer || '7', vs = per === 'tudo' ? periodo(0) : periodo(+per), m = {};
    (DB.loja || []).filter(l => l.ativo !== false).forEach(l => m[l.id] = { id: l.id, n: 0, t: 0, c: 0, s: 0 });
    vs.forEach(v => { const o = m[v.id_loja || 0] ??= { id: v.id_loja || 0, n: 0, t: 0, c: 0, s: 0 }; o.n++; o.t += +v.valor_total || 0; o.c += +v.custo_total || 0; if (v.origem === 'site') o.s++ });
    const abertos = {}; pedidosAbertos().forEach(p => abertos[p.id_loja || 0] = (abertos[p.id_loja || 0] || 0) + 1);
    const linhas = Object.values(m).sort((a, b) => b.t - a.t).map(o => [`<b>${esc(lojaNome(o.id))}</b>`, o.n, brl(o.t), brl(o.n ? o.t / o.n : 0), brl(o.t - o.c), o.s, abertos[o.id] ? `<span class="pd-chip">${abertos[o.id]}</span>` : '<span class="mut">–</span>']);
    corpo(`${lojasPainel()}${painel('COMPARATIVO', '📊 Desempenho de cada loja', mini(['Loja', 'Vendas', 'Faturamento', 'Ticket médio', 'Lucro bruto', 'Pelo site', 'Pedidos abertos'], linhas, 'Cadastre uma loja na aba "Cadastro de lojas".'), 'hb-largo')}`);
  }
  function cardapioGeral() {
    const chips = (arr, f) => arr.length ? `<div class="chips-sab">${arr.map(f).join('')}</div>` : '<p class="report-empty">Nada ativo.</p>';
    const on = a => (a || []).filter(x => x.ativo !== false), top = topProdutos(periodo(30), 8);
    corpo(`<div class="dx-sinc" id="aviso-sabores" hidden></div>
      <div class="dx-duas eq">${painel('NO CARDÁPIO AGORA', '🥤 Milkshakes', chips(on(DB.sabor_milkshake), s => `<span class="chip-sab">${esc(s.nome)}${s.destaque ? ' ⭐' : ''}</span>`))}${painel('NO CARDÁPIO AGORA', '🍨 Sorvetes', chips(on(DB.sabor_sorvete), s => `<span class="chip-sab g">${esc(s.nome)}</span>`))}</div>
      <div class="dx-duas eq">${painel('COMBOS E ADICIONAIS', '🎁 Combos e extras', chips(on(DB.combo), c => `<span class="chip-sab y">${esc(c.nome)} · ${brl(c.preco_venda)}</span>`) + chips(on(DB.complemento), c => `<span class="chip-sab">${esc(c.nome)} · ${brl(c.preco_venda)}</span>`))}${painel('MAIS VENDIDOS · 30 DIAS', '🏆 Ranking de sabores', mini(['Item', 'Qtd', 'Faturamento'], top.map(([n, o]) => [esc(n), o.q, brl(o.t)]), 'Sem vendas no período.'))}</div>`);
    avisoSabores();
  }
  function estoqueGeral() {
    const rows = (DB.item_estoque || []).filter(i => i.ativo !== false).map(i => [i.nome, qtdAtual(i.id), i.estoque_minimo]), baixos = itensBaixos();
    const compras = [...(DB.compra || [])].sort((a, b) => String(b.data_compra).localeCompare(String(a.data_compra))).slice(0, 6);
    corpo(`<div class="dx-duas">${painel('SALDO', '📦 Estoque por item', `<canvas id="hc3" data-h="${Math.max(rows.length * 34, 120)}"></canvas>`)}<div class="hb-col">${painel('ATENÇÃO', '⚠️ Precisa repor', baixos.length ? baixos.map(x => `<div class="mp"><div><b>${esc(x.i.nome)}</b><small>mínimo ${x.i.estoque_minimo} ${esc(x.i.unidade_medida || '')}</small></div><span class="pd-chip">${+x.q.toFixed(2)} ${esc(x.i.unidade_medida || '')}</span></div>`).join('') : '<p class="report-empty">Tudo acima do mínimo 🎉</p>')}${painel('ÚLTIMAS', '🛒 Compras recentes', mini(['Data', 'Fornecedor', 'Valor'], compras.map(c => [fdh(c.data_compra, true), esc(lbl('fornecedor', c.id_fornecedor)), brl(c.valor_total)]), 'Nenhuma compra registrada.'))}</div></div>`);
    if (rows.length) hbars('hc3', rows);
  }

  /* ---------- definição das áreas ---------- */
  const mes = () => today().slice(0, 7);
  const HUBS = {
    vendas: {
      n: 'Vendas e pedidos', emoji: '🧾', icone: 'receipt', desc: 'Tudo o que entra: pedidos do site, vendas do balcão, pagamentos e o relatório do dia.',
      kpis: () => { const h = periodo(1), s = periodo(7), m = periodo(30), tm = sum(m, 'valor_total'), lucro = tm - sum(m, 'custo_total'), ab = pedidosAbertos().length;
        return kpi('💰', 'Vendas hoje', sum(h, 'valor_total'), h.length + ' venda(s)', '', 'brl') + kpi('📈', 'Últimos 7 dias', sum(s, 'valor_total'), 'média ' + brl(sum(s, 'valor_total') / 7) + '/dia', 'g', 'brl') + kpi('🧾', 'Ticket médio (30 dias)', m.length ? tm / m.length : 0, m.length + ' venda(s)', '', 'brl') + kpi('💚', 'Lucro bruto (30 dias)', lucro, tm ? Math.round(lucro / tm * 100) + '% de margem' : 'sem vendas', 'g', 'brl') + kpi('🛍️', 'Pedidos em aberto', ab, ab ? 'aguardando retirada' : 'tudo em dia', ab ? 'alerta' : 'g', 'int') },
      abas: [{ k: 'geral', n: 'Visão geral', fn: vendasGeral }, { k: 'pedido', n: 'Pedidos do site', novo: 1, badge: () => pedidosAbertos().length, fn: () => emHub(_pedidos, window.pedFiltro) }, { k: 'rel', n: 'Relatório diário', fn: () => emHub(_rel, window.reportDate || today()) },
        { k: 'venda', n: 'Vendas', t: 'venda' }, { k: 'item_venda', n: 'Itens vendidos', t: 'item_venda' }, { k: 'pagamento', n: 'Pagamentos', t: 'pagamento' }]
    },
    lojas: {
      n: 'Lojas', emoji: '🏪', icone: 'store', novo: 1, desc: 'Onde mais sai: ranking, comparativo entre as lojas e cadastro de endereços e horários.',
      kpis: () => { const m = periodo(30), por = {}; m.forEach(v => por[v.id_loja || 0] = (por[v.id_loja || 0] || 0) + (+v.valor_total || 0)); const lider = Object.entries(por).sort((a, b) => b[1] - a[1])[0], site = m.filter(v => v.origem === 'site').length;
        return kpi('🏪', 'Lojas ativas', (DB.loja || []).filter(l => l.ativo !== false).length, 'cadastradas', 'g', 'int') + kpi('💰', 'Faturamento (30 dias)', sum(m, 'valor_total'), m.length + ' venda(s)', '', 'brl') + kpi('🏆', 'Loja líder (30 dias)', lider ? esc(lojaNome(+lider[0])) : '—', lider ? brl(lider[1]) : 'sem vendas', '') + kpi('🛍️', 'Pedidos pelo site (30 dias)', site, m.length ? Math.round(site / m.length * 100) + '% das vendas' : '—', 'g', 'int') },
      abas: [{ k: 'geral', n: 'Ranking e desempenho', fn: lojasGeral }, { k: 'loja', n: 'Cadastro de lojas', t: 'loja' }]
    },
    cardapio: {
      n: 'Cardápio', emoji: '🍓', icone: 'cup-soda', desc: 'Produtos, sabores de milkshake e sorvete, combos, adicionais, tamanhos e preços.',
      kpis: () => { const on = a => (a || []).filter(x => x.ativo !== false).length;
        return kpi('🥤', 'Produtos ativos', on(DB.produto), 'tipos de item', '', 'int') + kpi('🍓', 'Sabores de milkshake', on(DB.sabor_milkshake), 'ativos no site', 'g', 'int') + kpi('🍨', 'Sabores de sorvete', on(DB.sabor_sorvete), 'ativos no site', '', 'int') + kpi('🎁', 'Combos', on(DB.combo), 'ativos', 'g', 'int') + kpi('➕', 'Adicionais', on(DB.complemento), 'ativos', '', 'int') },
      abas: [{ k: 'geral', n: 'Visão geral', fn: cardapioGeral }, { k: 'produto', n: 'Produtos', t: 'produto' }, { k: 'sabor_milkshake', n: 'Sabores de milkshake', t: 'sabor_milkshake', novo: 1 }, { k: 'sabor_sorvete', n: 'Sabores de sorvete', t: 'sabor_sorvete' },
        { k: 'combo', n: 'Combos', t: 'combo', novo: 1 }, { k: 'combo_item', n: 'Itens dos combos', t: 'combo_item', novo: 1 }, { k: 'complemento', n: 'Adicionais', t: 'complemento', novo: 1 }, { k: 'tamanho_milkshake', n: 'Tamanhos e preços', t: 'tamanho_milkshake' }, { k: 'porcao_sorvete', n: 'Porções de sorvete', t: 'porcao_sorvete' }, { k: 'composicao_milkshake', n: 'Receitas (composição)', t: 'composicao_milkshake' }]
    },
    estoque: {
      n: 'Estoque e compras', emoji: '📦', icone: 'package', desc: 'Saldo dos ingredientes, movimentações, compras, fornecedores, perdas e alertas de reposição.',
      kpis: () => { const b = itensBaixos().length, al = (DB.alerta_estoque || []).filter(a => a.status === 'pendente').length, cm = sum((DB.compra || []).filter(c => String(c.data_compra).startsWith(mes())), 'valor_total');
        return kpi('📦', 'Itens controlados', (DB.item_estoque || []).filter(i => i.ativo !== false).length, 'no estoque', 'g', 'int') + kpi('⚠️', 'Estoque baixo', b, b ? 'precisam de reposição' : 'tudo certo', b ? 'alerta' : 'g', 'int') + kpi('🛒', 'Compras no mês', cm, 'valor gasto', '', 'brl') + kpi('🚚', 'Fornecedores', (DB.fornecedor || []).length, 'cadastrados', 'g', 'int') + kpi('🔔', 'Alertas pendentes', al, al ? 'aguardando' : 'nenhum', al ? 'alerta' : '', 'int') },
      abas: [{ k: 'geral', n: 'Visão geral', fn: estoqueGeral }, { k: 'item_estoque', n: 'Itens', t: 'item_estoque' }, { k: 'estoque_atual', n: 'Saldo atual', t: 'estoque_atual' }, { k: 'movimentacao_estoque', n: 'Movimentações', t: 'movimentacao_estoque' }, { k: 'compra', n: 'Compras', t: 'compra' },
        { k: 'item_compra', n: 'Itens comprados', t: 'item_compra' }, { k: 'fornecedor', n: 'Fornecedores', t: 'fornecedor' }, { k: 'perda_estoque', n: 'Perdas', t: 'perda_estoque' }, { k: 'alerta_estoque', n: 'Alertas', t: 'alerta_estoque' }, { k: 'categoria_item', n: 'Categorias', t: 'categoria_item' }]
    },
    ajustes: {
      n: 'Ajustes', emoji: '⚙️', icone: 'settings', desc: 'Quem acessa o painel e as formas de pagamento aceitas.',
      kpis: () => kpi('👥', 'Usuários ativos', (DB.usuario || []).filter(u => u.ativo).length, (DB.usuario || []).length + ' cadastrado(s)', 'g', 'int') + kpi('💳', 'Formas de pagamento', (DB.forma_pagamento || []).filter(f => f.ativo !== false).length, 'ativas', '', 'int'),
      abas: [{ k: 'usuario', n: 'Usuários', t: 'usuario' }, { k: 'forma_pagamento', n: 'Formas de pagamento', t: 'forma_pagamento' }]
    }
  };
  const pend = () => !!window.migracaoPendente;
  const hubVisivel = h => !(pend() && HUBS[h].novo);
  const abasDe = h => HUBS[h].abas.filter(a => !(pend() && (a.novo || (a.t && NOVAS_TABELAS.includes(a.t)))));

  /* ---------- abrir / redesenhar ---------- */
  function abrir(h, tab, silencioso) {
    const H = HUBS[h], abas = abasDe(h); tab = abas.some(a => a.k === tab) ? tab : abas[0].k;
    const ant = window.cur; window.cur = { hub: h, tab };
    const aba = abas.find(a => a.k === tab);
    const barra = abas.map(a => { const b = a.badge ? a.badge() : 0; return `<button class="seg ${a.k === tab ? 'on' : ''}" onclick="window.hub('${h}','${a.k}')">${a.n}${b ? `<i>${b}</i>` : ''}</button>` }).join('');
    const mesmo = silencioso && ant && ant.hub === h && $('#hub-corpo');
    if (mesmo) { $('.hb-kpis').innerHTML = H.kpis(); $('.hb-abas').innerHTML = barra }
    else view(`<section class="hb hb-${h}"><div class="hb-t"><span class="dx-kick">${H.n.toUpperCase()}</span><h2>${H.n}</h2><p>${H.desc}</p></div><span class="hb-emoji" aria-hidden="true">${H.emoji}</span></section>
      <div class="cards dx-cards hb-kpis">${H.kpis()}</div><div class="seg-bar hb-abas">${barra}</div><div id="hub-corpo" class="hub-corpo"></div>`, h);
    document.querySelectorAll('.hb-kpis b[data-v]').forEach(e => { const v = +e.dataset.v; anim(p => e.textContent = e.dataset.f === 'brl' ? brl(v * p) : Math.round(v * p)) });
    if (aba.t) corpo(tabelaHub(aba.t, aba.n)); else aba.fn();
    const at = document.querySelector('.hb-abas .seg.on'); if (at && !mesmo) at.scrollIntoView({ inline: 'center', block: 'nearest' });
  }
  window.hub = (h, tab) => abrir(h, tab);
  window.redraw = () => { const c = window.cur; if (!c) return; if (c.hub === 'dash') _dash(); else abrir(c.hub, c.tab, true) };

  // nomes antigos continuam funcionando (botões do painel, edit/del, pedidos...)
  window.dash = () => { window.cur = { hub: 'dash' }; _dash() };
  window.rel = d => { window.reportDate = d || today(); abrir('vendas', 'rel') };
  window.pedidos = f => { if (f) window.pedFiltro = f; abrir('vendas', 'pedido') };
  window.list = t => {                                         // edit()/del() chamam list(t) depois de salvar
    for (const h in HUBS) { const a = HUBS[h].abas.find(x => x.t === t); if (a) { abrir(h, a.k, true); return } }
    if (window.cur) window.redraw();
  };

  /* ---------- menu e atalhos ---------- */
  window.menu = () => {
    const nav = $('#menu'), lista = [['dash', 'Painel', 'layout-dashboard'], ...Object.keys(HUBS).filter(hubVisivel).map(h => [h, HUBS[h].n, HUBS[h].icone])];
    nav.innerHTML = lista.map(([k, n, ic]) => `<a data-k="${k}" tabindex="0" role="button">${mi(ic)}${n}</a>`).join('');
    if (!nav._ok) { nav._ok = 1; const go = e => { const a = e.target.closest('a[data-k]'); if (!a) return; const k = a.dataset.k; k === 'dash' ? window.dash() : window.hub(k) }; nav.addEventListener('click', go); nav.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(e) } }) }
    badge();
  };
  function badge() {
    const a = document.querySelector('#menu a[data-k="vendas"]'); if (!a) return; const n = pedidosAbertos().length; let b = a.querySelector('.nb');
    if (!n) { if (b) b.remove(); return } if (!b) { b = document.createElement('em'); b.className = 'nb'; a.appendChild(b) } b.textContent = n;
  }
  window.hubBadge = badge;
  // "cartões" de atalho que aparecem no Painel principal
  window.hubTiles = () => `<div class="hb-tiles">${Object.keys(HUBS).filter(hubVisivel).map(h => { const H = HUBS[h];
    const info = { vendas: () => `${pedidosAbertos().length} pedido(s) em aberto`, lojas: () => `${(DB.loja || []).filter(l => l.ativo !== false).length} loja(s)`, cardapio: () => `${[...(DB.sabor_milkshake || []), ...(DB.sabor_sorvete || [])].filter(x => x.ativo !== false).length} sabores ativos`, estoque: () => `${itensBaixos().length} item(ns) baixo(s)`, ajustes: () => `${(DB.usuario || []).filter(u => u.ativo).length} usuário(s)` }[h]();
    return `<button class="hb-tile hb-${h}" onclick="window.hub('${h}')"><span>${H.emoji}</span><b>${H.n}</b><small>${info}</small></button>` }).join('')}</div>`;
})();
