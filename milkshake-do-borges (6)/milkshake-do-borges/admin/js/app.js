const LS = 'milk_db_v1'; let S = {}, DB = {}, user = null;
const $ = s => document.querySelector(s), dlg = $('#dlg');
const save = () => sbQueueSync();
// ids acima de 1.000.000.000 são criados pelo site (pedidos online); o painel nunca usa essa faixa
const nextId = t => Math.max(0, ...DB[t].map(r => r.id).filter(i => i < 1e9)) + 1;
const now = () => new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 16);
const today = () => now().slice(0, 10);
const brl = n => 'R$ ' + (+n || 0).toFixed(2).replace('.', ',');
const sum = (a, k) => a.reduce((s, r) => s + (+r[k] || 0), 0);
const fields = t => S[t].f.map(x => { const [n, ty, o] = x.split(':'); return { n, t: ty, o } });
async function sha(t) { if (!crypto.subtle) return t; const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('') }
function lbl(t, id) { const r = DB[t].find(x => x.id == id); if (!r) return ''; const l = S[t].l, f = fields(t).find(x => x.n == l); return f && f.t == 'fk' ? lbl(f.o, r[l]) : (r[l] ?? '') }
function show(f, v) { return v == null ? '' : f.t == 'fk' ? lbl(f.o, v) : f.t == 'bool' ? (v ? '✔' : '–') : v }
function tbl(h, rows, t, cls) { return `<table><tr>${h.map(x => `<th>${x}</th>`).join('')}${t ? '<th></th>' : ''}</tr>${rows.map((r, i) => `<tr class="${cls && cls[i] || ''}">${r.map(c => `<td>${c}</td>`).join('')}${t ? `<td><button class="s" onclick="edit('${t}',${r[0]})">Editar</button> <button class="s" onclick="del('${t}',${r[0]})">×</button></td>` : ''}</tr>`).join('')}</table>` }
function checkAlerts() {
  DB.item_estoque.forEach(i => {
    if (!i.ativo) return; const e = DB.estoque_atual.find(x => x.id_item_estoque == i.id), q = e ? e.quantidade_disponivel : 0, a = DB.alerta_estoque.find(x => x.id_item_estoque == i.id && x.status == 'pendente');
    if (q <= i.estoque_minimo && !a) DB.alerta_estoque.push({ id: nextId('alerta_estoque'), id_item_estoque: i.id, data_alerta: today(), quantidade_atual: q, limite_configurado: i.estoque_minimo, status: 'pendente' });
    else if (q > i.estoque_minimo && a) { a.status = 'resolvido'; a.data_resolucao = today() } else if (a) a.quantidade_atual = q
  })
}
function adjust(id, d, tipo, rt, rid, custo, obs, set) {
  let e = DB.estoque_atual.find(x => x.id_item_estoque == id);
  if (!e) { e = { id: nextId('estoque_atual'), id_item_estoque: id, quantidade_disponivel: 0 }; DB.estoque_atual.push(e) }
  e.quantidade_disponivel = +(set ? d : e.quantidade_disponivel + d).toFixed(3); e.data_atualizacao = now();
  DB.movimentacao_estoque.push({ id: nextId('movimentacao_estoque'), id_item_estoque: id, id_usuario: user.id, data_hora: now(), tipo_movimentacao: tipo, quantidade: Math.abs(d), custo_unitario: custo || 0, referencia_tipo: rt, referencia_id: rid, observacao: obs || '', id_item_venda: window.__itemVenda ?? null }); checkAlerts();
  return (custo || 0) * Math.abs(d)   // custo desta baixa
}
const custoItem = id => (DB.item_estoque.find(i => i.id == id) || {}).custo_unitario_medio || 0;
function hook(t, r) {
  if (t == 'item_compra') {
    r.valor_total ??= +(r.quantidade * r.preco_unitario - (r.desconto || 0)).toFixed(2); adjust(r.id_item_estoque, r.quantidade, 'entrada', 'compra', r.id_compra, r.preco_unitario);
    const c = DB.compra.find(x => x.id == r.id_compra); if (c) c.valor_total = sum(DB.item_compra.filter(i => i.id_compra == c.id), 'valor_total')
  }
  if (t == 'item_venda') {
    const q = +r.quantidade || 1, tm = DB.tamanho_milkshake.find(x => x.id == r.id_tamanho), p = DB.porcao_sorvete.find(x => x.id == r.id_porcao);
    r.preco_unitario ??= tm ? tm.preco_venda : p ? p.preco_venda : 0; r.valor_total ??= +(q * r.preco_unitario).toFixed(2);
    let custo = 0; window.__itemVenda = r.id;                       // cada baixa fica ligada a este item da venda
    if (tm) DB.composicao_milkshake.filter(c => c.id_tamanho == tm.id).forEach(c => custo += adjust(c.id_item_estoque, -c.quantidade * q, 'saida', 'venda', r.id_venda, custoItem(c.id_item_estoque)));
    if (p) {
      const s = DB.sabor_sorvete.find(x => x.id == p.id_sabor), it = DB.item_estoque.find(i => /sorvete/i.test(i.nome)), emb = DB.item_estoque.find(i => /casquinha/i.test(i.nome));
      if (it) custo += adjust(it.id, -p.qtd_bolas * s.peso_por_bola_g * q, 'saida', 'venda', r.id_venda, custoItem(it.id));
      if (emb) custo += adjust(emb.id, -q, 'saida', 'venda', r.id_venda, custoItem(emb.id));   // casquinha (padrão do balcão)
    }
    window.__itemVenda = null;
    r.custo_total = +custo.toFixed(4);
    const v = DB.venda.find(x => x.id == r.id_venda);
    if (v) { const its = DB.item_venda.filter(i => i.id_venda == v.id); v.valor_total = sum(its, 'valor_total') - (v.desconto_total || 0); v.custo_total = +sum(its, 'custo_total').toFixed(2) }
  }
  if (t == 'movimentacao_estoque') { DB.movimentacao_estoque.pop(); const q = r.quantidade, k = r.tipo_movimentacao; adjust(r.id_item_estoque, k == 'saida' ? -q : q, k, r.referencia_tipo, r.referencia_id, r.custo_unitario, r.observacao, k == 'ajuste') }
}
function inp(f, v) {
  const n = `name="${f.n}"`;
  if (f.t == 'bool') return `<input type="checkbox" ${n} ${v ?? true ? 'checked' : ''}>`;
  if (f.t == 'sel') return `<select ${n}>${f.o.split('|').map(o => `<option ${o == v ? 'selected' : ''}>${o}</option>`).join('')}</select>`;
  if (f.t == 'fk') return `<select ${n}><option value="">—</option>${DB[f.o].map(r => `<option value="${r.id}" ${r.id == v ? 'selected' : ''}>#${r.id} ${lbl(f.o, r.id)}</option>`).join('')}</select>`;
  const ty = { num: 'number', date: 'date', datetime: 'datetime-local' }[f.t] || 'text';
  return `<input ${n} type="${ty}" ${f.t == 'num' ? 'step="any"' : ''} value="${v ?? (f.t == 'date' ? today() : f.t == 'datetime' ? now() : '')}">`
}
window.edit = (t, id) => {
  const F = fields(t), r = DB[t].find(x => x.id == id);
  $('#frm').innerHTML = `<h3>${S[t].t}</h3>` + F.map(f => `<label>${f.n}${inp(f, r && r[f.n])}</label>`).join('') + `<div class="bar"><button value="x" formnovalidate>Cancelar</button><button type="button" id="sv">Salvar</button></div>`;
  $('#sv').onclick = () => {
    const v = {}; F.forEach(f => { const e = $('#frm').elements[f.n]; v[f.n] = f.t == 'bool' ? e.checked : (f.t == 'num' || f.t == 'fk') ? (e.value === '' ? null : +e.value) : e.value });
    if (r) Object.assign(r, v); else { v.id = nextId(t); DB[t].push(v); hook(t, v) } save(); dlg.close(); list(t)
  }; dlg.showModal()
};
window.del = (t, id) => { if (confirm('Excluir registro #' + id + '?')) { DB[t] = DB[t].filter(x => x.id != id); save(); list(t) } };
window.list = t => { const F = fields(t).slice(0, 6); view(`<div class="bar"><h2>${S[t].t}</h2><button onclick="edit('${t}')">+ Novo</button></div>` + tbl(['ID', ...F.map(f => f.n)], DB[t].map(r => [r.id, ...F.map(f => show(f, r[f.n]))]), t), t) };
function view(h, k) { $('#main').innerHTML = h; $('#main').className = ''; void $('#main').offsetWidth; $('#main').className = 'in'; document.querySelectorAll('nav a').forEach(a => a.classList.toggle('on', a.dataset.k == k)); const on = document.querySelector('nav a.on'); if (on) on.scrollIntoView({ inline: 'center', block: 'nearest' }); $('#menu').classList.remove('open') }
function soldItemName(item) {
  const combo = item.id_combo && (DB.combo || []).find(c => c.id == item.id_combo);
  if (combo) return `Combo ${combo.nome}`;
  const product = DB.produto.find(p => p.id == item.id_produto);
  const size = DB.tamanho_milkshake.find(s => s.id == item.id_tamanho);
  const portion = DB.porcao_sorvete.find(p => p.id == item.id_porcao);
  const flavor = portion && DB.sabor_sorvete.find(s => s.id == portion.id_sabor);
  if (portion && flavor) return `${flavor.nome} · ${portion.qtd_bolas} bola(s)`;
  const saborM = (DB.sabor_milkshake || []).find(s => s.id == item.id_sabor_milkshake);
  if (saborM) return `${saborM.nome}${size ? ` · ${size.volume_ml} ml` : ''}`;
  return `${product ? product.nome : 'Produto'}${size ? ` · ${size.volume_ml} ml` : ''}`;
}
/* ===== Sabores iguais aos do site =====
   A lista oficial é a do site (js/cardapio-dados.js). Aqui o painel lê essa mesma lista, compara com o banco
   e, com um clique, cria/atualiza os sabores que faltam e desativa os que o site não tem. */
const norm = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
async function listaDoSite() {
  const txt = await (await fetch('../js/cardapio-dados.js', { cache: 'no-store' })).text();
  return new Function(txt + '\n;return { SABORES, SORVETES, BOLAS };')();
}
function planoSabores(site) {
  const mk = DB.sabor_milkshake || [], sv = DB.sabor_sorvete || [], mudar = [];
  const acha = (lista, x) => lista.find(r => r.slug === x.slug || norm(r.nome) === norm(x.nome));
  site.SABORES.forEach(x => { const r = acha(mk, x); if (!r) mudar.push(`+ milkshake ${x.nome}`); else if (r.ativo === false) mudar.push(`reativar milkshake ${x.nome}`); });
  mk.forEach(r => { if (r.ativo !== false && !site.SABORES.some(x => x.slug === r.slug || norm(x.nome) === norm(r.nome))) mudar.push(`desativar milkshake ${r.nome}`) });
  site.SORVETES.forEach(x => { const r = acha(sv, x); if (!r) mudar.push(`+ sorvete ${x.nome}`); else if (r.ativo === false) mudar.push(`reativar sorvete ${x.nome}`); });
  sv.forEach(r => { if (r.ativo !== false && !site.SORVETES.some(x => x.slug === r.slug || norm(x.nome) === norm(r.nome))) mudar.push(`desativar sorvete ${r.nome}`) });
  return mudar;
}
window.sincronizarSabores = async () => {
  if (window.migracaoPendente) { toast('Rode ATUALIZAR-BANCO.sql no Supabase antes de sincronizar.', true); return }
  let site; try { site = await listaDoSite() } catch (e) { toast('Não consegui ler a lista do site (abra o painel pelo mesmo servidor do site).', true); return }
  const plano = planoSabores(site); if (!plano.length) { toast('Os sabores já são os mesmos do site ✔'); return }
  if (!confirm('Deixar o painel com os mesmos sabores do site?\n\n' + plano.slice(0, 14).join('\n') + (plano.length > 14 ? `\n... e mais ${plano.length - 14}` : ''))) return;
  const antes = JSON.stringify({ a: DB.sabor_milkshake, b: DB.sabor_sorvete, c: DB.porcao_sorvete, d: DB.produto });
  const idProd = (DB.sabor_milkshake[0] || {}).id_produto || (DB.produto.find(p => p.tipo == 'milkshake' && /^milkshake$/i.test(p.nome)) || {}).id;
  const idSor = (DB.sabor_sorvete[0] || {}).id_produto || (DB.produto.find(p => p.tipo == 'sorvete') || {}).id;
  const acha = (lista, x) => lista.find(r => r.slug === x.slug || norm(r.nome) === norm(x.nome));
  site.SABORES.forEach((x, i) => {
    const d = { nome: x.nome, slug: x.slug, tema: x.tema || '', descricao: x.desc || '', ingredientes: x.ing || '', selo: x.selo || null, destaque: !!x.especial, ordem: i + 1, ativo: true };
    const r = acha(DB.sabor_milkshake, x); if (r) Object.assign(r, d); else DB.sabor_milkshake.push({ id: nextId('sabor_milkshake'), id_produto: idProd, ...d });
  });
  DB.sabor_milkshake.forEach(r => { if (!site.SABORES.some(x => x.slug === r.slug || norm(x.nome) === norm(r.nome))) r.ativo = false });
  site.SORVETES.forEach((x, i) => {
    const d = { nome: x.nome, slug: x.slug, descricao: x.desc || '', ordem: i + 1, ativo: true };
    let r = acha(DB.sabor_sorvete, x);
    if (r) Object.assign(r, d); else { r = { id: nextId('sabor_sorvete'), id_produto: idSor, peso_por_bola_g: 60, ...d }; DB.sabor_sorvete.push(r) }
    site.BOLAS.forEach((b, k) => { if (!DB.porcao_sorvete.some(p => p.id_sabor == r.id && +p.qtd_bolas == b.n)) DB.porcao_sorvete.push({ id: nextId('porcao_sorvete'), id_sabor: r.id, qtd_bolas: b.n, preco_venda: b.preco, ordem: k + 1 }) });
  });
  DB.sabor_sorvete.forEach(r => { if (!site.SORVETES.some(x => x.slug === r.slug || norm(x.nome) === norm(r.nome))) r.ativo = false });
  DB.produto.forEach(p => { if (p.tipo == 'milkshake' && p.id != idProd && /^milkshake de /i.test(p.nome)) p.ativo = false });   // produtos antigos sem tamanho
  const ok = await sbQueueSync();
  if (ok === false) { const o = JSON.parse(antes); DB.sabor_milkshake = o.a; DB.sabor_sorvete = o.b; DB.porcao_sorvete = o.c; DB.produto = o.d; toast('Não foi possível salvar no banco.', true) }
  else toast('Sabores sincronizados com o site ✔');
  redraw();
};
async function avisoSabores() {
  const el = document.getElementById('aviso-sabores'); if (!el) return;
  try { const n = planoSabores(await listaDoSite()).length; el.innerHTML = n ? `<span>🍨 O painel tem <b>${n}</b> diferença(s) de sabores em relação ao site.</span><button onclick="window.sincronizarSabores()">Deixar igual ao site</button>` : ''; el.hidden = !n } catch (e) { el.hidden = true }
}

/* ===== Utilidades do painel ===== */
const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const dtLocal = ms => new Date(ms - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
const STATUS_PED = { recebido: 'Recebido', preparando: 'Preparando', pronto: 'Pronto p/ retirar', retirado: 'Retirado', cancelado: 'Cancelado' };
const emAberto = p => ['recebido', 'preparando', 'pronto'].includes(p.status);
const pedidosAbertos = () => (DB.pedido || []).filter(emAberto).sort((a, b) => String(a.criado_em || '').localeCompare(String(b.criado_em || '')));
const lojaNome = id => id ? (lbl('loja', id) || 'Loja #' + id) : 'Balcão (sem loja)';
function toast(msg, bad) {
  let t = document.getElementById('toast'); if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t) }
  t.textContent = msg; t.className = 'show' + (bad ? ' bad' : ''); clearTimeout(t._t); t._t = setTimeout(() => t.className = '', 3200)
}

/* ===== Pedidos do site: botões de andamento e "Terminar pedido" (grava status "retirado" no banco) ===== */
window.mudarPedido = async (id, status) => {
  const p = (DB.pedido || []).find(x => x.id == id); if (!p || p.status === status) return;
  const antes = { status: p.status, atualizado_em: p.atualizado_em };
  p.status = status; p.atualizado_em = now();
  document.querySelectorAll(`[data-ped="${id}"] button`).forEach(b => b.disabled = true);
  const ok = await sbQueueSync();
  if (ok === false) { Object.assign(p, antes); toast('Não foi possível salvar no banco. Tente de novo.', true) }
  else toast(status === 'retirado' ? `Pedido #${p.numero ?? p.id} terminado e salvo como retirado ✔` : `Pedido #${p.numero ?? p.id}: ${STATUS_PED[status].toLowerCase()}`);
  redraw(); if (window.hubBadge) hubBadge();
};
function botoesPedido(p) {
  const w = x => `window.mudarPedido(${p.id},'${x}')`;
  if (!emAberto(p)) return `<span class="pd-fim">${p.status === 'retirado' ? '✔ Entregue ao cliente' : 'Cancelado'}</span>`;
  const passo = p.status === 'recebido' ? `<button class="s" onclick="${w('preparando')}">👩‍🍳 Preparando</button>` : p.status === 'preparando' ? `<button class="s" onclick="${w('pronto')}">🔔 Marcar pronto</button>` : '';
  return `${passo}<button class="fin" onclick="${w('retirado')}">✔ Terminar pedido</button>`;
}
function itensDoPedido(p) { return DB.item_venda.filter(i => i.id_venda == p.id_venda).map(i => `${+i.quantidade || 1}× ${esc(soldItemName(i))}`) }
function cartaoPedido(p) {
  const v = DB.venda.find(x => x.id == p.id_venda), it = itensDoPedido(p), quando = p.retirada_tipo === 'agendar' && p.retirada_prevista ? 'Agendado ' + String(p.retirada_prevista).slice(11, 16) : 'Retirar agora';
  return `<article class="pd-card st-${p.status}" data-ped="${p.id}">
    <header><b class="pd-num">#${esc(p.numero ?? p.id)}</b><span class="pd-chip st-${p.status}">${STATUS_PED[p.status] || esc(p.status)}</span></header>
    <p class="pd-cli">${esc(p.cliente_nome || 'Cliente')}${p.cliente_telefone ? ` · <small>${esc(p.cliente_telefone)}</small>` : ''}</p>
    <p class="pd-meta">🏪 ${esc(lojaNome(p.id_loja))} · ⏰ ${esc(quando)}${p.codigo ? ` · código <b>${esc(p.codigo)}</b>` : ''}</p>
    <ul class="pd-itens">${it.length ? it.map(x => `<li>${x}</li>`).join('') : '<li>—</li>'}</ul>
    ${p.observacao ? `<p class="pd-obs">📝 ${esc(p.observacao)}</p>` : ''}
    <footer><b>${brl(v ? v.valor_total : 0)}</b><div class="pd-acoes">${botoesPedido(p)}</div></footer></article>`;
}
window.pedidos = (f = window.pedFiltro || 'abertos') => {
  window.pedFiltro = f; const todos = (DB.pedido || []);
  const lista = (f === 'abertos' ? todos.filter(emAberto) : f === 'retirado' ? todos.filter(p => p.status === 'retirado') : f === 'cancelado' ? todos.filter(p => p.status === 'cancelado') : todos)
    .sort((a, b) => f === 'abertos' ? String(a.criado_em || '').localeCompare(String(b.criado_em || '')) : String(b.criado_em || '').localeCompare(String(a.criado_em || '')));
  const abas = [['abertos', 'Em andamento', todos.filter(emAberto).length], ['retirado', 'Retirados', todos.filter(p => p.status === 'retirado').length], ['cancelado', 'Cancelados', todos.filter(p => p.status === 'cancelado').length], ['todos', 'Todos', todos.length]];
  view(`<section class="dx-titulo"><div><span class="dx-kick">PEDIDOS DO SITE</span><h2>Retiradas na loja</h2><p>Quando o cliente retirar, clique em <b>Terminar pedido</b>: o status vira "retirado" no banco.</p></div></section>
    <div class="seg-bar">${abas.map(([k, n, c]) => `<button class="seg ${k === f ? 'on' : ''}" onclick="window.pedidos('${k}')">${n} <i>${c}</i></button>`).join('')}</div>
    <div class="pd-grid" id="pedidos-lista">${lista.length ? lista.map(cartaoPedido).join('') : '<p class="report-empty">Nenhum pedido nesta lista. 🍧</p>'}</div>`, 'pedido');
};

/* ===== Painel principal (visual da página do site: verde, rosa e manteiga) ===== */
function lojasPainel() {
  const per = window.lojaPer || '7', lim = per === 'tudo' ? '' : dtLocal(Date.now() - (+per - 1) * 864e5);
  const vs = DB.venda.filter(v => v.status !== 'cancelada' && (per === 'tudo' || (v.data_venda || '').slice(0, 10) >= lim)), m = {};
  vs.forEach(v => { const k = v.id_loja || 0, o = m[k] ??= { id: k, n: 0, total: 0, prods: {} }; o.n++; o.total += +v.valor_total || 0 });
  const dono = new Map(vs.map(v => [v.id, v.id_loja || 0]));
  DB.item_venda.forEach(i => { const k = dono.get(i.id_venda); if (k === undefined) return; const nm = soldItemName(i); m[k].prods[nm] = (m[k].prods[nm] || 0) + (+i.quantidade || 1) });
  (DB.loja || []).filter(l => l.ativo !== false).forEach(l => { m[l.id] ??= { id: l.id, n: 0, total: 0, prods: {} } });
  const arr = Object.values(m).map(o => ({ ...o, nome: lojaNome(o.id), ticket: o.n ? o.total / o.n : 0, top: Object.entries(o.prods).sort((a, b) => b[1] - a[1])[0] })).sort((a, b) => b.total - a.total || b.n - a.n);
  const tot = arr.reduce((s, o) => s + o.total, 0), max = arr[0] && arr[0].total || 1;
  const seg = [['1', 'Hoje'], ['7', '7 dias'], ['30', '30 dias'], ['tudo', 'Tudo']];
  return `<article class="panel dx-lojas"><div class="report-heading"><div><span class="dx-kick">ONDE MAIS SAI</span><h3>🏪 Vendas por loja</h3></div>
    <div class="seg-bar mini">${seg.map(([k, n]) => `<button class="seg ${k === per ? 'on' : ''}" onclick="window.lojaPer='${k}';window.redraw()">${n}</button>`).join('')}</div></div>
    ${arr.length && tot ? arr.map((o, i) => `<div class="lj ${i === 0 ? 'top' : ''}"><span class="lj-rank">${i === 0 ? '🏆' : i + 1}</span>
      <div class="lj-corpo"><div class="lj-linha"><b>${esc(o.nome)}</b>${i === 0 ? '<em>Onde mais sai</em>' : ''}<span class="lj-val">${brl(o.total)}</span></div>
      <div class="lj-barra"><i style="width:${Math.max(o.total / max * 100, o.total ? 3 : 0)}%"></i></div>
      <small>${o.n} venda(s) · ticket ${brl(o.ticket)} · ${tot ? Math.round(o.total / tot * 100) : 0}% do total${o.top ? ` · mais vendido: <b>${esc(o.top[0])}</b> (${o.top[1]})` : ''}</small></div></div>`).join('') : '<p class="report-empty">Nenhuma venda neste período.</p>'}</article>`;
}
function miniPedidos() {
  const ab = pedidosAbertos();
  return `<article class="panel dx-ped"><div class="report-heading"><div><span class="dx-kick">AGORA</span><h3>🛍️ Pedidos em andamento</h3></div><button class="s" onclick="window.pedidos('abertos')">Ver todos</button></div>
    ${ab.length ? ab.slice(0, 5).map(p => `<div class="mp" data-ped="${p.id}"><div><b>#${esc(p.numero ?? p.id)} · ${esc(p.cliente_nome || 'Cliente')}</b><small>${esc(lojaNome(p.id_loja))} · ${STATUS_PED[p.status]}</small></div><button class="fin" onclick="window.mudarPedido(${p.id},'retirado')">✔ Terminar</button></div>`).join('') + (ab.length > 5 ? `<p class="report-empty">+ ${ab.length - 5} pedido(s)...</p>` : '') : '<p class="report-empty">Nenhum pedido esperando retirada. 🎉</p>'}</article>`;
}
window.dash = () => {
  save(); const ds = [...Array(7)].map((_, i) => dtLocal(Date.now() - (6 - i) * 864e5));
  const vendaOk = id => (DB.venda.find(v => v.id == id) || {}).status !== 'cancelada', ativas = DB.venda.filter(v => v.status !== 'cancelada');
  const tot = ds.map(d => sum(ativas.filter(v => (v.data_venda || '').slice(0, 10) == d), 'valor_total')), hoje = tot[6], sem = tot.reduce((a, b) => a + b, 0), mix = {};
  const nHoje = ativas.filter(v => (v.data_venda || '').slice(0, 10) == ds[6]).length, ticket = nHoje ? hoje / nHoje : 0;
  DB.item_venda.filter(i => vendaOk(i.id_venda)).forEach(i => { const n = soldItemName(i); mix[n] = (mix[n] || 0) + (+i.valor_total || 0) });
  let mixE = Object.entries(mix).sort((a, b) => b[1] - a[1]); if (mixE.length > 5) mixE = [...mixE.slice(0, 4), ['Outros', mixE.slice(4).reduce((s, x) => s + x[1], 0)]];
  const rows = DB.item_estoque.map(i => { const e = DB.estoque_atual.find(x => x.id_item_estoque == i.id); return [i.nome, e ? e.quantidade_disponivel : 0, i.estoque_minimo] }), baixo = rows.filter(r => r[1] <= r[2]).length;
  const abertos = pedidosAbertos().length, nome = ((user && user.nome) || '').split(' ')[0];
  const sab = [...(DB.sabor_milkshake || []), ...(DB.sabor_sorvete || [])].filter(x => x.ativo !== false).map(x => x.nome), faixa = (sab.length ? sab : ['Milkshake do Borges']).map(n => `<span>${esc(n)}</span>`).join('<i>✦</i>');
  const dataTxt = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  const card = (ico, t, v, sub, cls = '') => `<div class="card dx-card ${cls}"><span class="dx-ico">${ico}</span><small>${t}</small><b>${v}</b><em>${sub}</em></div>`;
  view(`<section class="dx-hero"><img src="../assets/img/logo-completa.png" alt="Milkshake do Borges"><div class="dx-hero-t"><span class="dx-kick">PAINEL DO BORGES</span><h2>${nome ? 'Olá, ' + esc(nome) + '!' : 'Olá!'}</h2><p>${dataTxt} · ${abertos ? `<b>${abertos} pedido(s)</b> esperando retirada` : 'nenhum pedido pendente'}</p>
      <div class="dx-hero-a"><button onclick="window.pedidos('abertos')">🛍️ Ver pedidos</button><button class="g" onclick="window.rel()">📊 Relatório do dia</button></div></div></section>
    <div class="dx-sinc" id="aviso-sabores" hidden></div>
    <div class="dx-faixa" aria-hidden="true"><div class="dx-trilho">${faixa}<i>✦</i>${faixa}<i>✦</i></div></div>
    <div class="cards dx-cards">${card('💰', 'Vendas hoje', brl(hoje), nHoje + ' venda(s)')}${card('📈', 'Vendas em 7 dias', brl(sem), 'média ' + brl(sem / 7) + '/dia', 'g')}${card('🧾', 'Ticket médio hoje', brl(ticket), 'por venda')}${card('🛍️', 'Pedidos em aberto', abertos, 'do site, aguardando', abertos ? 'alerta' : '')}${card('📦', 'Estoque baixo', baixo, baixo ? 'itens no mínimo' : 'tudo certo', baixo ? 'alerta' : 'g')}</div>
    ${window.hubTiles()}
    <div class="dx-duas">${lojasPainel()}${miniPedidos()}</div>
    <div class="panels dx-panels"><div class="panel"><h3>📈 Vendas dos últimos 7 dias</h3><canvas id="c1" data-h="240"></canvas></div><div class="panel"><h3>🍩 Vendas por produto</h3><canvas id="c2" data-h="240"></canvas></div><div class="panel"><h3>📦 Estoque</h3><canvas id="c3" data-h="${Math.max(rows.length * 34, 120)}"></canvas></div></div>`, 'dash');
  avisoSabores();
  const alvo = [[hoje, 1], [sem, 1], [ticket, 1], [abertos], [baixo]];
  document.querySelectorAll('.dx-card b').forEach((e, i) => { const v = alvo[i]; anim(p => e.textContent = v[1] ? brl(v[0] * p) : Math.round(v[0] * p)) });
  bars('c1', ds.map(d => d.slice(8) + '/' + d.slice(5, 7)), tot, ['#E8558E', '#FAD0DE']); donut('c2', mixE.map(x => x[0]), mixE.map(x => x[1]), ['#E8558E', '#2F6F50', '#FFB84D', '#5BB88C', '#C93573']); hbars('c3', rows)
};
window.rel = (d = today()) => {
  window.reportDate = d;
  const v = DB.venda.filter(x => (x.data_venda || '').slice(0, 10) == d && x.status !== 'cancelada'), ids = v.map(x => x.id), cp = DB.compra.filter(c => c.data_compra == d), payments = {};
  DB.pagamento.filter(p => ids.includes(p.id_venda)).forEach(p => { const n = lbl('forma_pagamento', p.id_forma_pagamento) || 'Outro'; payments[n] = (payments[n] || 0) + (+p.valor || 0) });
  const items = {};
  DB.item_venda.filter(i => ids.includes(i.id_venda)).forEach(i => {
    const name = soldItemName(i);
    if (!items[name]) items[name] = { quantity: 0, total: 0 };
    items[name].quantity += +i.quantidade || 0;
    items[name].total += +i.valor_total || 0;
  });
  const total = sum(v, 'valor_total'), average = v.length ? total / v.length : 0;
  const slots = Array.from({ length: 8 }, (_, i) => ({ label: `${String(i * 3).padStart(2, '0')}h`, value: 0 }));
  v.forEach(sale => {
    const hour = Number((sale.data_venda || '').slice(11, 13));
    if (Number.isFinite(hour)) slots[Math.min(7, Math.floor(hour / 3))].value += +sale.valor_total || 0;
  });
  const paymentEntries = Object.entries(payments);
  const productRows = Object.entries(items).sort((a, b) => b[1].quantity - a[1].quantity);
  const dateLabel = new Date(`${d}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  view(`<section class="report-hero"><div><span class="report-kicker">RESUMO DO DIA</span><h2>Relatório diário</h2><p>Vendas e desempenho · ${dateLabel}</p></div><label class="report-date">Escolha a data<input type="date" value="${d}" onchange="window.rel(this.value)" aria-label="Data do relatório"></label></section>
    <section class="cards report-cards">
      <article class="card report-card"><span>Faturamento</span><b data-report="revenue">${brl(total)}</b><small>Valor vendido no dia</small></article>
      <article class="card report-card"><span>Vendas realizadas</span><b data-report="sales">${v.length}</b><small>Pedidos concluídos</small></article>
      <article class="card report-card"><span>Ticket médio</span><b data-report="average">${brl(average)}</b><small>Faturamento por venda</small></article>
      <article class="card report-card"><span>Compras do dia</span><b data-report="purchases">${brl(sum(cp, 'valor_total'))}</b><small>${cp.length} compra(s) registrada(s)</small></article>
      <article class="card report-card"><span>Custo das vendas</span><b data-report="cost">${brl(sum(v, 'custo_total'))}</b><small>Tudo que foi gasto nos produtos vendidos</small></article>
      <article class="card report-card"><span>Lucro bruto</span><b data-report="profit">${brl(total - sum(v, 'custo_total'))}</b><small>Faturamento menos custo das vendas</small></article>
    </section>
    <section class="report-grid">
      <article class="panel report-chart"><div class="report-heading"><div><span class="report-kicker">MOVIMENTO</span><h3>Vendas ao longo do dia</h3></div><b class="report-total">${brl(total)}</b></div><canvas id="report-sales" data-h="230"></canvas></article>
      <article class="panel report-chart"><div class="report-heading"><div><span class="report-kicker">RECEBIMENTOS</span><h3>Formas de pagamento</h3></div></div><canvas id="report-payments" data-h="190"></canvas><div class="report-legend">${paymentEntries.length ? paymentEntries.map(([name, value], i) => `<span><i class="legend-dot dot-${i % 5}"></i>${name.replaceAll('_', ' ')}<b>${brl(value)}</b></span>`).join('') : '<p class="report-empty">Nenhum pagamento registrado nesta data.</p>'}</div></article>
    </section>
    <article class="panel report-products"><div class="report-heading"><div><span class="report-kicker">MAIS PEDIDOS</span><h3>Produtos vendidos</h3></div><span>${productRows.length} item(ns)</span></div><div class="report-table-wrap">${productRows.length ? tbl(['Produto / sabor', 'Quantidade', 'Faturamento'], productRows.map(([name, item]) => [name, item.quantity, brl(item.total)])) : '<p class="report-empty">Nenhuma venda registrada nesta data.</p>'}</div></article>`, 'rel');

  document.querySelectorAll('[data-report]').forEach((element, index) => {
    const targets = [total, v.length, average, sum(cp, 'valor_total'), sum(v, 'custo_total'), total - sum(v, 'custo_total')];
    anim(progress => {
      const value = targets[index] * progress;
      element.textContent = index === 1 ? Math.round(value) : brl(value);
    });
  });
  bars('report-sales', slots.map(slot => slot.label), slots.map(slot => slot.value), ['#ff6fa5', '#3cc58f']);
  donut('report-payments', [], paymentEntries.map(([, value]) => value), ['#ff6fa5', '#3cc58f', '#ffb347', '#7b8cff', '#a8e6cf']);
};
function menu() {
  const links = [
    ['dash', 'Painel', 'layout-dashboard'],
    ['rel', 'Relatório diário', 'chart-column'],
    ['venda', 'Vendas', MI.venda],
    ['pedido', 'Pedidos do site', MI.pedido],
    ['loja', 'Lojas', MI.loja],
    ['produto', 'Produtos', MI.produto],
    ['sabor_milkshake', 'Sabores de milkshake', MI.sabor_milkshake],
    ['sabor_sorvete', 'Sabores de sorvete', MI.sabor_sorvete],
    ['combo', 'Combos', MI.combo],
    ['complemento', 'Adicionais', MI.complemento],
    ['compra', 'Compras', MI.compra],
    ['fornecedor', 'Fornecedores', MI.fornecedor],
    ['item_estoque', 'Estoque', MI.item_estoque]
  ];
  const visiveis = links.filter(([k]) => !(window.migracaoPendente && NOVAS_TABELAS.includes(k)));   // modo antigo: sem as áreas novas
  $('#menu').innerHTML = visiveis.map(([key, title, icon]) => `<a data-k="${key}" tabindex="0" role="button">${mi(icon)}${title}</a>`).join('');
  // Por que o relatório só abria uma vez: num onclick="rel()" dentro de um <a>, "rel" é a propriedade
  // a.rel (texto vazio) e não a função rel(). Agora o clique é tratado aqui, sem atributos onclick.
  if (!$('#menu')._ok) { $('#menu')._ok = 1; const go = e => { const a = e.target.closest('a[data-k]'); if (!a) return; const k = a.dataset.k; k == 'dash' ? window.dash() : k == 'rel' ? window.rel() : k == 'pedido' ? window.pedidos() : window.list(k) }; $('#menu').addEventListener('click', go); $('#menu').addEventListener('keydown', e => { if (e.key == 'Enter' || e.key == ' ') { e.preventDefault(); go(e) } }) }
}
async function init() {
  try { S = await (await fetch('data/schema.json')).json() }
  catch (e) { $('#lerr').textContent = 'Abra por servidor local (veja LEIA-ME.txt).'; return }
  $('#login').onsubmit = async e => {
    e.preventDefault(); $('#lerr').textContent = '';
    const btnEntrar = $('#login button[type=submit], #login button:not([type])'); btnEntrar.disabled = true; btnEntrar.classList.add('girando'); btnEntrar.dataset.t = btnEntrar.textContent; btnEntrar.textContent = 'Entrando...';
    let authenticated = false;
    try {
      const authData = await sbLogin($('#lg').value.trim(), $('#pw').value);
      authenticated = true;

      const data = await sbLoadAll();
      Object.keys(S).forEach(t => data[t] ??= []);
      const profile = data.usuario.find(u => u.auth_user_id === authData.user.id);

      if (!profile) {
        throw new Error('A senha foi aceita, mas esta conta ainda não está vinculada a um usuário do sistema. Cadastre o perfil em public.usuario e associe o auth_user_id ao UID desta conta; veja LEIA-ME-SUPABASE.txt.');
      }
      if (!profile.ativo) {
        throw new Error('Este usuário está inativo. Peça a um administrador para ativá-lo.');
      }

      DB = data;
      user = profile;
      $('#lw').hidden = true; $('#app').hidden = false; menu(); window.dash()
    } catch (err) {
      if (authenticated) {
        try { await sbLogout() }
        catch (logoutError) { console.error('Erro ao encerrar sessão após falha no login:', logoutError) }
      }
      $('#lerr').textContent = err instanceof Error ? err.message : 'Não foi possível entrar. Verifique a conexão e tente novamente.';
    } finally { btnEntrar.disabled = false; btnEntrar.classList.remove('girando'); btnEntrar.textContent = btnEntrar.dataset.t }
  };
  setTh(localStorage.getItem('milk_theme') == 'dark'); $('#th').onclick = () => { setTh(th() != 'dark'); redraw() }; $('#mb').onclick = () => $('#menu').classList.toggle('open'); $('#out').onclick = async () => { await sb.auth.signOut(); location.reload() }
}
const BC = { instagram: 'e1306c', whatsapp: '25d366', ifood: 'ea1d2c', ubereats: '06c167', tiktok: 'ff0050' };
const ic = (n, c) => `<img class="ic" src="https://api.iconify.design/simple-icons/${n}.svg?color=%23${c}" alt="${n}" title="${n}" onerror="this.replaceWith(Object.assign(document.createElement('b'),{className:'ic',textContent:'${n[0].toUpperCase()}',style:'background:#${c}'}))">`;
const mi = n => `<i class="mi" style="--u:url(https://api.iconify.design/lucide/${n}.svg)"></i>`;
const MI = { fornecedor: 'truck', compra: 'shopping-cart', item_compra: 'list-plus', categoria_item: 'tags', item_estoque: 'package', estoque_atual: 'warehouse', movimentacao_estoque: 'arrow-left-right', perda_estoque: 'trash-2', alerta_estoque: 'bell-ring', produto: 'cup-soda', tamanho_milkshake: 'ruler', composicao_milkshake: 'flask-conical', sabor_sorvete: 'ice-cream-cone', porcao_sorvete: 'ice-cream-bowl', venda: 'receipt', item_venda: 'shopping-bag', personalizacao: 'sparkles', pagamento: 'wallet', forma_pagamento: 'credit-card', usuario: 'users', pedido: 'store', loja: 'map-pin', sabor_milkshake: 'cup-soda', combo: 'gift', combo_item: 'list-plus', complemento: 'plus-circle' };
const T = k => getComputedStyle(document.documentElement).getPropertyValue('--' + k).trim(), th = () => document.documentElement.dataset.theme;
function setTh(d) { document.documentElement.dataset.theme = d ? 'dark' : ''; localStorage.setItem('milk_theme', d ? 'dark' : ''); $('#th').textContent = d ? '☀️' : '🌙' }
const BN = [['🥤', 'Milkshake artesanal', 'Monte do seu jeito · 300, 500 e 700 ml', 'b1'], ['🍨', 'Sorvetes artesanais', '1, 2 ou 3 bolas · qualidade de verdade', 'b2'], ['🛵', 'Vendas e delivery', 'Pedidos e estoque em um só lugar', 'b3']];
const banner = () => `<div class="banner">${BN.map((b, i) => `<div class="slide ${b[3]} ${i ? '' : 'on'}"><span class="em">${b[0]}</span><div><h2>${b[1]}</h2><p>${b[2]}</p><div class="chips">${['instagram', 'whatsapp', 'ifood', 'ubereats', 'tiktok'].map(n => ic(n, b[3] == 'b2' ? '1d5c43' : 'ffffff')).join('')}</div></div></div>`).join('')}<i class="blob a"></i><i class="blob b"></i></div>`;
let bt; function rot() { clearInterval(bt); bt = setInterval(() => { const s = [...document.querySelectorAll('.slide')]; if (!s.length) return; const i = s.findIndex(x => x.classList.contains('on')); s[i].classList.remove('on'); s[(i + 1) % s.length].classList.add('on') }, 4000) }
function cv(id) { const c = document.getElementById(id), r = devicePixelRatio || 1, w = c.parentElement.clientWidth - (c.dataset.pad ?? 32), H = +c.dataset.h; c.width = w * r; c.height = H * r; c.style.width = w + 'px'; c.style.height = H + 'px'; const x = c.getContext('2d'); x.scale(r, r); x.font = '12px Poppins,sans-serif'; return { x, w, h: H } }
function anim(fn) { const t0 = performance.now(); (function f(t) { const p = Math.min(1, (t - t0) / 900); fn(1 - Math.pow(1 - p, 3)); if (p < 1) requestAnimationFrame(f) })(t0) }
function bars(id, L, V, c) { const { x, w, h } = cv(id), m = Math.max(...V, 1), bw = w / L.length; anim(p => { x.clearRect(0, 0, w, h); L.forEach((l, i) => { const bh = (h - 50) * V[i] / m * p, X = i * bw + bw * .2, Y = h - 24 - bh, g = x.createLinearGradient(0, Y, 0, h - 24); g.addColorStop(0, c[0]); g.addColorStop(1, c[1]); x.fillStyle = g; x.beginPath(); x.roundRect(X, Y, bw * .6, Math.max(bh, 2), 8); x.fill(); x.fillStyle = T('mut'); x.textAlign = 'center'; x.fillText(l, X + bw * .3, h - 6); if (V[i]) x.fillText(Math.round(V[i]), X + bw * .3, Y - 6) }) }) }
function donut(id, L, V, C) { const { x, w, h } = cv(id), t = V.reduce((a, b) => a + b, 0); if (!t) { x.fillStyle = T('mut'); x.fillText('Nenhum pagamento registrado neste dia.', 10, h / 2); return } const R = Math.min(w / 2.2, h / 2) - 8, cx = R + 10, cy = h / 2; anim(p => { x.clearRect(0, 0, w, h); let a = -Math.PI / 2; V.forEach((v, i) => { const e = a + v / t * Math.PI * 2 * p; x.beginPath(); x.arc(cx, cy, R, a, e); x.arc(cx, cy, R * .62, e, a, true); x.fillStyle = C[i % C.length]; x.fill(); a = e }); x.fillStyle = T('ink'); x.textAlign = 'center'; x.font = '600 15px Poppins,sans-serif'; x.fillText(brl(t), cx, cy + 5); x.font = '12px Poppins,sans-serif'; L.forEach((l, i) => { x.fillStyle = C[i % C.length]; x.fillRect(cx * 2 + 14, 24 + i * 22, 12, 12); x.fillStyle = T('ink'); x.textAlign = 'left'; x.fillText(l + ' · ' + brl(V[i]), cx * 2 + 32, 35 + i * 22) }) }) }
function hbars(id, R) { const { x, w, h } = cv(id), rh = h / R.length, lw = 130, bw = w - lw - 50; anim(p => { x.clearRect(0, 0, w, h); R.forEach((r, i) => { const y = i * rh, f = Math.min(1, r[1] / ((r[2] || 1) * 4)) * p; x.fillStyle = T('ink'); x.textAlign = 'left'; x.fillText(r[0].slice(0, 18), 0, y + rh / 2 + 2); x.fillStyle = T('tr'); x.beginPath(); x.roundRect(lw, y + 6, bw, rh - 14, 6); x.fill(); x.fillStyle = r[1] <= r[2] ? '#ff5c8a' : '#5fd3a0'; x.beginPath(); x.roundRect(lw, y + 6, Math.max(6, bw * f), rh - 14, 6); x.fill(); x.fillStyle = T('ink'); x.fillText(r[1], lw + bw + 8, y + rh / 2 + 2) }) }) }
window.demo = () => { const fp = DB.forma_pagamento; for (let d = 6; d >= 0; d--)for (let k = 0; k < 3 + d % 3; k++) { const dt = new Date(Date.now() - d * 864e5 - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10) + 'T1' + (2 + k) + ':00', vid = nextId('venda'), tm = DB.tamanho_milkshake[(d + k) % 3], q = 1 + k % 2, tot = tm.preco_venda * q; DB.venda.push({ id: vid, id_usuario: 1, data_venda: dt, desconto_total: 0, valor_total: tot }); DB.item_venda.push({ id: nextId('item_venda'), id_venda: vid, id_produto: 1, id_tamanho: tm.id, id_porcao: null, quantidade: q, preco_unitario: tm.preco_venda, valor_total: tot }); DB.pagamento.push({ id: nextId('pagamento'), id_venda: vid, id_forma_pagamento: fp[(d + k) % fp.length].id, valor: tot, troco: 0 }) } save(); dash() };
let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { if (document.querySelector('#main canvas')) redraw() }, 300) });
init();
