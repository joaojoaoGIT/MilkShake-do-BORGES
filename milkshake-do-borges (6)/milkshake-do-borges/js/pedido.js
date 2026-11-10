/* =========================================================
   Milkshake do Borges - cardápio e pedido (SIMULAÇÃO)
   Nada aqui é cobrado, enviado ou gravado em banco de dados:
   a sacola e os pedidos ficam só no localStorage do navegador.

   1) Utilidades
   2) Catálogo (produtos que aparecem na tela)
   3) API falsa de pedidos + conversão para as tabelas do dashboard
   4) Sacola
   5) Cardápio na tela (abas, busca, cartões)
   6) Janela do produto (escolhas e adicionais)
   7) Gaveta: sacola, retirada na loja, confirmação e histórico
   8) Fotos reais dos produtos
   ========================================================= */
(() => {
"use strict";

/* ---------- 1. UTILIDADES ---------- */
const $  = (seletor, raiz = document) => raiz.querySelector(seletor);
const $$ = (seletor, raiz = document) => [...raiz.querySelectorAll(seletor)];
const moeda = v => "R$ " + v.toFixed(2).replace(".", ",");
const semAcento = t => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const esc = t => String(t).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const novoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const arredondar = v => Math.round(v * 100) / 100;

function lerLocal(chave, padrao) { try { return JSON.parse(localStorage.getItem(chave)) ?? padrao; } catch { return padrao; } }
function gravarLocal(chave, valor) { try { localStorage.setItem(chave, JSON.stringify(valor)); } catch { /* navegador bloqueou: segue sem salvar */ } }

/* Número que "rola" até o novo valor, já formatado em reais */
function animarValor(el, para) {
  const de = Number(el.dataset.valor ?? para);
  el.dataset.valor = para;
  if (reduzir || de === para) { el.textContent = moeda(para); return; }
  const inicio = performance.now();
  const passo = agora => {
    const p = Math.min((agora - inicio) / 400, 1);
    el.textContent = moeda(de + (para - de) * p);
    if (p < 1) requestAnimationFrame(passo);
  };
  requestAnimationFrame(passo);
}

/* Janelas (<dialog>): abrem e fecham com animação */
function abrirDialogo(d) { if (!d.open) d.showModal(); requestAnimationFrame(() => d.classList.add("aberto")); }
function fecharDialogo(d) { d.classList.remove("aberto"); setTimeout(() => d.open && d.close(), reduzir ? 0 : 280); }
$$("dialog").forEach(d => {
  d.addEventListener("cancel", e => { e.preventDefault(); fecharDialogo(d); });          // tecla Esc
  d.addEventListener("click", e => { if (e.target === d) fecharDialogo(d); });            // clique no fundo escuro
});

/* Aviso rápido no rodapé da tela */
let temporizadorAviso;
function aviso(texto, comBotao = false) {
  const el = $("#aviso");
  el.innerHTML = `<span>${esc(texto)}</span>` + (comBotao ? `<button type="button" data-acao="abrir-sacola">Ver sacola</button>` : "");
  el.classList.add("ativo");
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => el.classList.remove("ativo"), 3600);
}

/* Seletor com "pílula" que desliza até a opção escolhida */
function criarSeletor(container, opcoes, inicial, aoMudar) {
  container.innerHTML = `<div class="seletor"><span class="seletor__pilula" aria-hidden="true"></span>`
    + opcoes.map((o, i) => `<button type="button" aria-pressed="${i === inicial}">${o}</button>`).join("") + `</div>`;
  const raiz = $(".seletor", container), pilula = $(".seletor__pilula", container), botoes = $$("button", container);
  const posicionar = () => {
    const b = botoes.find(x => x.getAttribute("aria-pressed") === "true");
    if (!b || !b.offsetWidth) return;
    pilula.style.width = b.offsetWidth + "px";
    pilula.style.transform = `translateX(${b.offsetLeft}px)`;
  };
  botoes.forEach((b, i) => b.addEventListener("click", () => {
    botoes.forEach((x, k) => x.setAttribute("aria-pressed", k === i));
    posicionar();
    aoMudar(i);
  }));
  new ResizeObserver(posicionar).observe(raiz);        // reposiciona quando a janela abre ou a tela muda
}

/* Ícones pequenos dos botões: o copo "enche" e as bolas "pulam" quando o botão é escolhido */
const iconeCopo = altura => `<svg class="mini-copo" viewBox="0 0 24 34" style="height:${altura}px" aria-hidden="true">
  <path class="nivel" d="M4.4 13h15.2l-1.8 17a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8z"/>
  <path d="M3 6h18l-2.4 24a2 2 0 0 1-2 1.8H7.4a2 2 0 0 1-2-1.8z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
const iconeCone = n => `<svg class="mini-copo" viewBox="0 -8 24 48" style="height:36px" aria-hidden="true">
  <path d="M6 19h12L12 38z" fill="#E0A752"/>
  ${Array.from({ length: n }, (_, i) => `<circle class="mini-bola" style="--d:${i * 90}ms" cx="12" cy="${15 - i * 8}" r="6.8" fill="#E8558E"/>`).join("")}</svg>`;

/* ---------- 2. CATÁLOGO ---------- */
let PRODUTOS = [];
function montarProdutos() {
  PRODUTOS = [
    ...SABORES.map(s => ({ ...s, id: "ms-" + s.slug, tipo: "milkshake" })),
    ...SORVETES.map(s => ({ ...s, id: s.slug, tipo: "sorvete", tema: "Sorvete artesanal", tags: [] })),
    ...COMBOS.map(c => ({ ...c, tipo: "combo", tags: ["Combo"], selo: "Economize " + moeda(c.precoOriginal - c.preco) })),
  ];
}
montarProdutos();
const produtoPorId = id => PRODUTOS.find(p => p.id === id);
const tomDe = p => p.tipo === "milkshake" ? p.cor : p.tipo === "sorvete" ? p.c[1] : "#FFE49A";

/* Combo: cada item do combo desenhado lado a lado, sem se sobrepor (o tamanho se ajusta ao número de itens) */
function desenharCombo(c) {
  const sabores = SABORES.filter(s => !s.especial);
  const itens = c.slots.map((sl, i) => sl.tipo === "milkshake"
    ? `<span class="combo-item">${desenharCopo(sabores[(i * 2 + 1) % sabores.length])}</span>`
    : `<span class="combo-item combo-item--sorvete">${desenharSorvete(BOLAS[sl.bolas].n, SORVETES[(i + 1) % SORVETES.length])}</span>`);
  return `<div class="combo-arte" style="--n:${itens.length}">${itens.join("")}</div>`;
}

/* Ilustração do produto (a foto real, se achar uma, substitui depois) */
function arteDe(p, bolas = 2) {
  if (p.imagem) return `<img class="produto__logo" src="${p.imagem}" alt="${esc(p.nome)}">`;
  if (p.tipo === "milkshake") return desenharCopo(p);
  if (p.tipo === "sorvete") return desenharSorvete(bolas, p);
  return desenharCombo(p);
}

/* Preço do item conforme as escolhas (cfg) */
function calcularPreco(p, cfg) {
  const base = p.tipo === "milkshake" ? TAMANHOS[cfg.tam].preco : p.tipo === "sorvete" ? (p.porcoes?.[BOLAS[cfg.bolas].n]?.preco ?? BOLAS[cfg.bolas].preco) : p.preco;
  const extras = p.tipo === "combo" ? 0 : cfg.adic.reduce((s, id) => s + ADICIONAIS.find(a => a.id === id).preco, 0);
  return arredondar(base + extras);
}

/* Texto curto que descreve as escolhas, mostrado na sacola */
function descreverItem(p, cfg) {
  if (p.tipo === "milkshake") return `Copo de ${TAMANHOS[cfg.tam].ml} ml`;
  if (p.tipo === "sorvete") return `${BOLAS[cfg.bolas].n} bola${BOLAS[cfg.bolas].n > 1 ? "s" : ""}, ${EMBALAGENS[cfg.emb].toLowerCase()}`;
  return p.slots.map((sl, i) => sl.tipo === "milkshake"
    ? `${TAMANHOS[sl.tam].ml} ml: ${SABORES[cfg.slots[i].sabor].nome}`
    : `${BOLAS[sl.bolas].n} bolas de ${SORVETES[cfg.slots[i].sabor].nome}, ${EMBALAGENS[cfg.slots[i].emb].toLowerCase()}`).join("; ");
}

/* Monta o item que vai para a sacola */
function criarItem(p, cfg) {
  const adic = [...cfg.adic].sort();
  const item = {
    uid: novoId(), produtoId: p.id, tipo: p.tipo, nome: p.nome, qtd: cfg.qtd, obs: (cfg.obs || "").trim(),
    tam: p.tipo === "milkshake" ? cfg.tam : null, bolas: p.tipo === "sorvete" ? cfg.bolas : null, emb: p.tipo === "sorvete" ? cfg.emb : null,
    adic, slots: p.tipo === "combo" ? cfg.slots.map(s => ({ ...s })) : null,
    precoUnit: calcularPreco(p, { ...cfg, adic }), precoOriginal: p.tipo === "combo" ? p.precoOriginal : null,
    resumo: descreverItem(p, cfg),
    extras: adic.map(id => ADICIONAIS.find(a => a.id === id).nome),
  };
  item.chave = JSON.stringify([item.produtoId, item.tam, item.bolas, item.emb, item.adic, item.obs, item.slots]);   // itens iguais se juntam
  return item;
}

/* ---------- CARREGAMENTO ----------
   Só aparece quando a espera passa de "atraso" ms (rápido não pisca): um aviso com a roda girando. */
function carregando(promessa, texto = "Carregando...", atraso = 450) {
  let el; const t = setTimeout(() => {
    el = document.createElement("div"); el.className = "carga"; el.setAttribute("role", "status");
    el.innerHTML = `<span class="carga__roda" aria-hidden="true"></span><span>${esc(texto)}</span>`;
    document.body.appendChild(el); requestAnimationFrame(() => el.classList.add("on"));
  }, atraso);
  return Promise.resolve(promessa).finally(() => { clearTimeout(t); if (el) { el.classList.remove("on"); setTimeout(() => el.remove(), 250); } });
}

/* ---------- 3. API FALSA DE PEDIDOS ----------
   Hoje grava no localStorage. Para ligar no banco, troque o miolo de criar() e listar()
   por chamadas (fetch/Supabase) e mantenha o mesmo formato de pedido. */
const PedidoAPI = {
  chave: "borges.pedidos",
  listar() { return lerLocal(this.chave, []); },
  guardar(pedido) { gravarLocal(this.chave, [pedido, ...this.listar()].slice(0, 20)); },

  /* Com o banco conectado, o pedido vai para o Supabase (função criar_pedido_site).
     Sem banco, vira um pedido de demonstração salvo só no navegador. */
  async criar(pedido) {
    if (Banco.ativo) {
      const r = await carregando(Banco.criarPedido(montarPayloadBanco(pedido)), "Enviando seu pedido...", 300);
      const salvo = { ...pedido, numero: r.numero, codigo: r.codigo, idBanco: r.id, origem: "banco", criadoEm: Date.now(),
                      totais: { total: Number(r.total), economia: Number(r.desconto) } };
      this.guardar(salvo);
      return salvo;
    }
    await new Promise(ok => setTimeout(ok, reduzir ? 200 : 1300));
    const numero = lerLocal("borges.ultimoPedido", 1000) + 1;
    gravarLocal("borges.ultimoPedido", numero);
    const letras = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const codigo = "BRG-" + Array.from({ length: 3 }, () => letras[Math.floor(Math.random() * letras.length)]).join("");
    const salvo = { ...pedido, numero, codigo, origem: "demo", criadoEm: Date.now() };
    this.guardar(salvo);
    return salvo;
  },

  /* Andamento do pedido: 0 recebido, 1 preparando, 2 pronto, -1 cancelado.
     Do banco: lê o status que o dashboard atualiza. Demonstração: simulação acelerada por tempo. */
  async andamento(pedido) {
    if (pedido.origem === "banco") {
      try {
        const r = await carregando(Banco.consultarPedido(pedido.numero, pedido.codigo), "Buscando seu pedido...", 700);
        if (r) return { n: { recebido: 0, preparando: 1, pronto: 2, retirado: 2, cancelado: -1 }[r.status] ?? 0, status: r.status };
      } catch (erro) { console.warn("Não consegui consultar o pedido:", erro.message); }
      return { n: 0, status: "recebido" };
    }
    const s = (Date.now() - pedido.criadoEm) / 1000;
    return { n: s < 6 ? 0 : s < 20 ? 1 : 2 };
  },
};

/* Converte o pedido do carrinho no formato da função criar_pedido_site() do banco.
   Só vão IDs e quantidades: os preços são calculados pelo próprio banco. */
function montarPayloadBanco(pedido) {
  const dbAdic = i => i.adic.map(slug => ADICIONAIS.find(a => a.id === slug)?.dbId).filter(Boolean);
  const itens = [];
  pedido.itens.forEach(i => {
    const p = produtoPorId(i.produtoId);
    if (!p) throw new Error(`O item "${i.nome}" não existe mais no cardápio. Remova-o da sacola.`);
    if (i.tipo === "milkshake") itens.push({ tipo: "milkshake", id_tamanho: TAMANHOS[i.tam].id, id_sabor_milkshake: p.dbId, quantidade: i.qtd, observacao: i.obs, adicionais: dbAdic(i) });
    else if (i.tipo === "sorvete") itens.push({ tipo: "sorvete", id_porcao: p.porcoes[BOLAS[i.bolas].n].id, embalagem: EMBALAGENS[i.emb], quantidade: i.qtd, observacao: i.obs, adicionais: dbAdic(i) });
    else i.slots.forEach((sl, k) => {                              // combo: cada parte vira um item, ligados pelo mesmo "grupo"
      const def = p.slots[k], base = { quantidade: i.qtd, observacao: k === 0 ? i.obs : "", adicionais: [], grupo: i.uid, id_combo: p.dbId };
      if (def.tipo === "milkshake") itens.push({ ...base, tipo: "milkshake", id_tamanho: TAMANHOS[def.tam].id, id_sabor_milkshake: SABORES[sl.sabor].dbId });
      else itens.push({ ...base, tipo: "sorvete", id_porcao: SORVETES[sl.sabor].porcoes[BOLAS[def.bolas].n].id, embalagem: EMBALAGENS[sl.emb] });
    });
  });
  return {
    cliente: pedido.cliente, id_loja: LOJAS[pedido.loja.indice].id, retirada: pedido.retirada,
    pagamento: { id_forma_pagamento: FORMAS_PAGAMENTO.find(f => f.chave === pedido.pagamento.chave).id, troco_para: pedido.pagamento.trocoPara || 0 },
    itens,
  };
}

/* Mostra como o pedido ficaria nas tabelas do dashboard (venda, item_venda, personalizacao, pagamento).
   A tabela "pedido" (cliente, loja, retirada, status) é NOVA: o dashboard ainda não tem. */
function paraTabelasDashboard(p) {
  const idProduto = { milkshake: 1, sorvete: 2 };
  return {
    pedido: { numero: p.numero, codigo: p.codigo, cliente_nome: p.cliente.nome, cliente_telefone: p.cliente.telefone,
              loja: p.loja.nome, retirada_tipo: p.retirada.tipo, retirada_prevista: p.retirada.previsto, status: "recebido" },
    venda: { data_venda: new Date(p.criadoEm).toISOString(), desconto_total: p.totais.economia, valor_total: p.totais.total },
    item_venda: p.itens.map(i => ({
      id_produto: idProduto[i.tipo] ?? null, produto: i.nome,
      id_tamanho: i.tam != null ? TAMANHOS[i.tam].id : null, id_porcao: i.bolas != null ? (produtoPorId(i.produtoId)?.porcoes?.[BOLAS[i.bolas].n]?.id ?? null) : null,
      quantidade: i.qtd, preco_unitario: i.precoUnit, valor_total: arredondar(i.precoUnit * i.qtd), observacao: i.obs || null,
      personalizacao: i.adic.map(id => ({ tipo: "complemento", complemento: id, valor_adicional: ADICIONAIS.find(a => a.id === id).preco })),
    })),
    pagamento: { id_forma_pagamento: FORMAS_PAGAMENTO.find(f => f.chave === p.pagamento.chave).id, valor: p.totais.total, troco: p.pagamento.troco ?? 0 },
  };
}

/* ---------- 4. SACOLA ---------- */
const Sacola = {
  itens: lerLocal("borges.sacola", []),
  salvar() { gravarLocal("borges.sacola", this.itens); atualizarIndicadores(); if ($("#gaveta").open && etapa === "sacola") renderSacola(); },
  adicionar(item) {
    const igual = this.itens.find(x => x.chave === item.chave);
    if (igual) igual.qtd += item.qtd; else this.itens.push(item);
    this.salvar();
  },
  mudarQtd(uid, delta) {
    const it = this.itens.find(x => x.uid === uid);
    if (!it) return;
    it.qtd += delta;
    if (it.qtd <= 0) this.itens = this.itens.filter(x => x !== it);
    this.salvar();
  },
  remover(uid) { this.itens = this.itens.filter(x => x.uid !== uid); this.salvar(); },
  limpar() { this.itens = []; this.salvar(); },
  quantidade() { return this.itens.reduce((s, i) => s + i.qtd, 0); },
  total() { return arredondar(this.itens.reduce((s, i) => s + i.precoUnit * i.qtd, 0)); },
  economia() { return arredondar(this.itens.reduce((s, i) => s + (i.precoOriginal ? (i.precoOriginal - i.precoUnit) * i.qtd : 0), 0)); },
};

/* Contador do cabeçalho e barra "Ver sacola" */
function atualizarIndicadores() {
  const n = Sacola.quantidade(), contador = $("#contadorSacola"), barra = $("#barraSacola");
  contador.textContent = n; contador.hidden = n === 0;
  contador.classList.remove("pulo"); void contador.offsetWidth; contador.classList.add("pulo");
  barra.classList.toggle("ativo", n > 0 && !$("#gaveta").open);
  $("#barraSacolaTexto").textContent = `${n} ${n === 1 ? "item" : "itens"}`;
  animarValor($("#barraSacolaTotal"), Sacola.total());
}

/* ---------- 5. CARDÁPIO NA TELA ---------- */
const CATEGORIAS = [
  { id: "todos",      nome: "Todos" },
  { id: "destaque",   nome: "Destaque" },
  { id: "combos",     nome: "Combos" },
  { id: "milkshakes", nome: "Milkshakes" },
  { id: "sorvetes",   nome: "Sorvetes" },
];
let categoriaAtiva = "todos";
const fotosAchadas = {};                                       // slug -> { src, credito }

function cartaoProduto(p) {
  const aPartir = p.tipo === "milkshake" ? TAMANHOS[0].preco : p.tipo === "sorvete" ? BOLAS[0].preco : p.preco;
  const preco = p.tipo === "combo"
    ? `<span class="produto__preco">${moeda(p.preco)} <s>${moeda(p.precoOriginal)}</s></span>`
    : `<span class="produto__preco"><small>a partir de</small> ${moeda(aPartir)}</span>`;
  return `<article class="produto" tabindex="0" role="button" data-id="${p.id}" data-slug="${p.slug}" aria-label="${esc(p.nome)}, ${moeda(aPartir)}">
    <div class="produto__foto" style="--tom:${tomDe(p)}">${arteDe(p)}${p.selo ? `<span class="produto__selo">${esc(p.selo)}</span>` : ""}</div>
    <div class="produto__corpo">
      <p class="produto__tema">${esc(p.tema)}</p><h3>${esc(p.nome)}</h3><p class="produto__desc">${esc(p.desc)}</p>
      <div class="produto__rodape">${preco}<span class="produto__mais" aria-hidden="true">+</span></div>
    </div></article>`;
}

function renderCatalogo(filtro = "") {
  const q = semAcento(filtro.trim());
  const passa = p => !q || semAcento([p.nome, p.desc, p.tema, ...(p.tags || [])].join(" ")).includes(q);
  const especial = PRODUTOS.find(x => x.especial) || PRODUTOS.find(x => x.tipo === "milkshake");
  const quer = c => categoriaAtiva === "todos" || categoriaAtiva === c;

  const banner = quer("destaque") && passa(especial) ? `<article class="banner produto" tabindex="0" role="button" data-id="${especial.id}" data-slug="${especial.slug}" aria-label="${esc(especial.nome)}">
      <span class="banner__fita">Especial da casa</span>
      <div class="produto__foto banner__foto" style="--tom:#FFE49A">${arteDe(especial)}</div>
      <div class="banner__texto">
        <p class="produto__tema">${esc(especial.tema)}</p><h3>${esc(especial.nome)}</h3><p>${esc(especial.desc)}</p>
        <div class="produto__rodape"><span class="produto__preco"><small>a partir de</small> ${moeda(TAMANHOS[0].preco)}</span><span class="btn btn--rosa">Pedir agora</span></div>
      </div></article>` : "";

  const lista = [
    ...(quer("combos") ? PRODUTOS.filter(p => p.tipo === "combo" && passa(p)) : []),
    ...(quer("milkshakes") ? PRODUTOS.filter(p => p.tipo === "milkshake" && !p.especial && passa(p)) : []),
    ...(quer("sorvetes") ? PRODUTOS.filter(p => p.tipo === "sorvete" && passa(p)) : []),
  ];
  const html = banner + lista.map(cartaoProduto).join("");
  $("#catalogo").innerHTML = html ? `<div class="cat__grade">${html}</div>` : `<p class="vazio">Nada encontrado${q ? ` para "${esc(filtro)}"` : ""}. Tente outro nome ou sabor.</p>`;
  Object.keys(fotosAchadas).forEach(aplicarFoto);               // reaplica as fotos já encontradas
}

/* Barra de categorias à esquerda + busca */
function contarCat(id) {
  const n = t => PRODUTOS.filter(p => p.tipo === t && !p.especial).length;
  return id === "todos" ? PRODUTOS.length : id === "destaque" ? 1 : id === "combos" ? n("combo") : id === "milkshakes" ? n("milkshake") : n("sorvete");
}
function desenharAbas() {
  $("#abasCardapio").innerHTML = `<p class="abas__titulo">Categorias</p>
    <div class="abas__lista" role="tablist" aria-label="Categorias do cardápio">${CATEGORIAS.map(c => `<button type="button" role="tab" data-cat="${c.id}" aria-selected="${c.id === categoriaAtiva}" class="${c.id === categoriaAtiva ? "ativa" : ""}">${c.nome}<span class="abas__n">${contarCat(c.id)}</span></button>`).join("")}</div>
    <label class="busca"><span class="sr">Buscar no cardápio</span><input type="search" id="busca" placeholder="Buscar sabor ou combo" value="${esc($("#busca")?.value || "")}"></label>`;
}
/* Só troca a aba marcada (não redesenha): a rolagem da lista e o foco da busca ficam como estão */
function marcarAba() {
  $$("#abasCardapio button[data-cat]").forEach(b => { const on = b.dataset.cat === categoriaAtiva; b.classList.toggle("ativa", on); b.setAttribute("aria-selected", on); if (on && b.parentElement.scrollWidth > b.parentElement.clientWidth) b.parentElement.scrollTo({ left: b.offsetLeft - (b.parentElement.clientWidth - b.offsetWidth) / 2, behavior: "auto" }); });
}
function escolherCategoria(id, rolar) {
  categoriaAtiva = CATEGORIAS.some(c => c.id === id) ? id : "todos";
  marcarAba(); renderCatalogo($("#busca").value);
  /* o card tem rolagem própria: ao trocar de categoria, a lista volta ao topo */
  $(".cardapio__lista").scrollTo({ top: 0, behavior: "instant" });
  if (rolar) document.getElementById("cardapio")?.scrollIntoView({ behavior: reduzir ? "auto" : "smooth", block: "start" });
}
desenharAbas();
$("#abasCardapio").addEventListener("click", e => { const b = e.target.closest("button[data-cat]"); if (b) escolherCategoria(b.dataset.cat, false); });
$("#abasCardapio").addEventListener("input", e => { if (e.target.id === "busca") { renderCatalogo(e.target.value); $(".cardapio__lista").scrollTo({ top: 0, behavior: "instant" }); } });
/* Links "Sorvetes" do topo/rodapé/início abrem o cardápio já filtrado */
document.addEventListener("click", e => {
  const a = e.target.closest('a[href="#sorvetes"]'); if (!a) return;
  e.preventDefault(); escolherCategoria("sorvetes", true);
});

/* Abrir o produto: clique ou Enter/Espaço no cartão */
$("#catalogo").addEventListener("click", e => { const c = e.target.closest(".produto"); if (c) abrirProduto(produtoPorId(c.dataset.id)); });
$("#catalogo").addEventListener("keydown", e => {
  if (e.key !== "Enter" && e.key !== " ") return;
  const c = e.target.closest(".produto"); if (c) { e.preventDefault(); abrirProduto(produtoPorId(c.dataset.id)); }
});

/* Barra "Retirar em": loja escolhida + situação (aberta ou fechada). A loja é escolhida num mapa, como nos apps de fast-food. */
const cliente = lerLocal("borges.cliente", { loja: null, nome: "", tel: "", pag: 0, quando: "agora" });
function atualizarBarraLoja() {
  const loja = cliente.loja != null ? LOJAS[cliente.loja] : null;
  $("#trocarLoja").firstChild.textContent = loja ? `${loja.nome}, ${loja.cidade} ` : "Escolher a loja de retirada ";
  const st = loja ? statusLoja(loja) : null;
  $("#lojaStatus").textContent = st ? st.texto : "Escolha a loja para ver o horário";
  $("#lojaStatus").classList.toggle("fechada", !!st && !st.aberto);
}
$("#trocarLoja").addEventListener("click", () => abrirSeletorLoja());
$("#abrirHistorico").addEventListener("click", () => abrirGaveta("historico"));
atualizarBarraLoja();

/* Se ainda não escolheu a loja, pede antes de seguir (como o McDonald's e o BK) */
function exigirLoja(seguir) { if (cliente.loja == null) abrirSeletorLoja(seguir); else seguir(); }

/* ---------- 5b. SELETOR DE LOJA (mapa real + lista + "usar minha localização") ---------- */
const modalLoja = $("#modalLoja");
let mapaSeletor = null, posicaoCliente = null, aoEscolherLoja = null;

function distanciaKm(a, b) {                                   // fórmula de haversine
  const r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}
function abrirSeletorLoja(depois) {
  aoEscolherLoja = depois || null;
  modalLoja.innerHTML = `<button type="button" class="janela__fechar" data-acao="fechar-loja" aria-label="Fechar">&times;</button>
    <div class="seletor-loja">
      <div class="seletor-loja__topo"><h2>Onde você vai retirar?</h2><p>Toque em um ponto do mapa ou escolha na lista.</p>
        <button type="button" class="btn btn--contorno btn--pequeno" data-acao="usar-local">Usar minha localização</button><p class="campo__ajuda" id="localMsg"></p></div>
      <div class="seletor-loja__mapa" id="mapaSeletor"></div>
      <ul class="seletor-loja__lista" id="listaSeletor"></ul>
    </div>`;
  abrirDialogo(modalLoja);
  desenharListaSeletor();
  mapaSeletor = null;
  if (!window.L) { $("#mapaSeletor").hidden = true; return; }       // sem mapa, só a lista
  mapaSeletor = L.map("mapaSeletor", { scrollWheelZoom: false, dragging: !L.Browser.mobile });
  criarCamadaMapa(mapaSeletor);
  LOJAS.forEach((l, i) => L.marker([l.lat, l.lng], { icon: iconePino(), title: l.nome }).addTo(mapaSeletor)
    .bindTooltip(l.cidade, { permanent: true, direction: "bottom", offset: [0, 4], className: "marcador__rotulo" })
    .on("click", () => escolherLoja(i)));
  mapaSeletor.fitBounds(LOJAS.map(l => [l.lat, l.lng]), { padding: [40, 40] });
  setTimeout(() => mapaSeletor.invalidateSize(), 80);
}
function desenharListaSeletor() {
  const itens = LOJAS.map((l, i) => ({ l, i, km: posicaoCliente ? distanciaKm(posicaoCliente, l) : null }));
  if (posicaoCliente) itens.sort((a, b) => a.km - b.km);                 // a mais perto primeiro
  $("#listaSeletor").innerHTML = itens.map(({ l, i, km }) => { const st = statusLoja(l);
    return `<li class="${cliente.loja === i ? "ativa" : ""}"><div><strong>${esc(l.nome)}</strong>
      <small>${esc(l.endereco)}, ${esc(l.cidade)}</small>
      <small class="${st.aberto ? "" : "fechada"}">${esc(st.texto)}${km != null ? `, a ${km.toFixed(1).replace(".", ",")} km de você` : ""}</small></div>
      <button type="button" class="btn btn--rosa btn--pequeno" data-acao="escolher-loja" data-i="${i}">Retirar aqui</button></li>`; }).join("");
}
function escolherLoja(i) {
  cliente.loja = i; gravarLocal("borges.cliente", cliente); atualizarBarraLoja();
  const seguir = aoEscolherLoja; aoEscolherLoja = null;
  fecharDialogo(modalLoja);
  aviso(`Retirada em ${LOJAS[i].nome}`);
  if (seguir) setTimeout(seguir, 300);
}
function usarMinhaLocalizacao() {
  const msg = $("#localMsg");
  if (!navigator.geolocation) { msg.textContent = "Seu navegador não permite localização."; return; }
  msg.textContent = "Procurando a loja mais perto...";
  navigator.geolocation.getCurrentPosition(pos => {
    posicaoCliente = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    desenharListaSeletor();
    const perto = LOJAS.map((l, i) => ({ i, km: distanciaKm(posicaoCliente, l) })).sort((a, b) => a.km - b.km)[0];
    msg.textContent = `Mais perto de você: ${LOJAS[perto.i].nome} (${perto.km.toFixed(1).replace(".", ",")} km).`;
    if (mapaSeletor) { L.circleMarker([posicaoCliente.lat, posicaoCliente.lng], { radius: 8, color: "#fff", weight: 3, fillColor: "#2F6F50", fillOpacity: 1 }).addTo(mapaSeletor);
      mapaSeletor.fitBounds([[posicaoCliente.lat, posicaoCliente.lng], [LOJAS[perto.i].lat, LOJAS[perto.i].lng]], { padding: [50, 50] }); }
  }, () => { msg.textContent = "Não foi possível obter sua localização (o navegador só permite em https ou localhost)."; }, { timeout: 8000 });
}

/* ---------- 6. JANELA DO PRODUTO ---------- */
const modal = $("#modalProduto");

function abrirProduto(p) {
  const ehShake = p.tipo === "milkshake", ehSorvete = p.tipo === "sorvete", ehCombo = p.tipo === "combo";
  const e = { tam: 1, bolas: 1, emb: 0, adic: [], obs: "", qtd: 1, slots: (p.slots || []).map(() => ({ sabor: 0, emb: 0 })) };

  const chips = ADICIONAIS.map(a => `<label class="chip"><input type="checkbox" value="${a.id}"><span>${a.nome} <b>+ ${moeda(a.preco)}</b></span></label>`).join("");
  const blocoAdicionais = `<h4>Adicionais</h4><div class="chips">${chips}</div>`;
  let opcoes = "";
  if (ehShake) opcoes = `<h4>Tamanho</h4><div id="mvTam" class="tamanhos-botoes"></div>
    <div class="comp"><div class="comp__barra"><span class="comp__sorvete">Sorvete 150 g</span><span class="comp__leite"></span></div><p class="comp__texto"></p></div>` + blocoAdicionais;
  if (ehSorvete) opcoes = `<h4>Quantas bolas?</h4><div id="mvBolas" class="tamanhos-botoes"></div><p class="comp__texto" id="mvBolasTxt"></p>
    <h4>Como servir?</h4><div class="opcoes">${EMBALAGENS.map((n, i) => `<label class="opcao"><input type="radio" name="emb" value="${i}" ${i === 0 ? "checked" : ""}><span>${n}</span></label>`).join("")}</div>` + blocoAdicionais;
  if (ehCombo) opcoes = `<h4>Monte o seu combo</h4>` + p.slots.map((sl, i) => {
    const lista = sl.tipo === "milkshake" ? SABORES : SORVETES;
    const rotulo = sl.tipo === "milkshake" ? `Milkshake de ${TAMANHOS[sl.tam].ml} ml` : `Sorvete de ${BOLAS[sl.bolas].n} bolas`;
    return `<div class="slot"><label>${rotulo}<select data-slot="${i}" data-campo="sabor">${lista.map((s, k) => `<option value="${k}">${s.nome}</option>`).join("")}</select></label>`
      + (sl.tipo === "sorvete" ? `<label>Servir em<select data-slot="${i}" data-campo="emb">${EMBALAGENS.map((n, k) => `<option value="${k}">${n}</option>`).join("")}</select></label>` : "") + `</div>`;
  }).join("");

  modal.innerHTML = `
    <button type="button" class="janela__fechar" data-acao="fechar-produto" aria-label="Fechar">&times;</button>
    <div class="janela__visual" style="--tom:${tomDe(p)}"><div class="janela__arte" id="mvArte">${arteDe(p, BOLAS[e.bolas].n)}</div></div>
    <div class="janela__conteudo">
      <p class="produto__tema">${esc(p.tema)}</p><h2>${esc(p.nome)}</h2><p>${esc(p.desc)}</p><p class="produto__ing">${esc(p.ing)}</p>
      ${opcoes}
      <label class="obs">Observação <textarea id="mvObs" maxlength="120" rows="2" placeholder="Ex.: sem canudo, pouca calda"></textarea></label>
    </div>
    <footer class="janela__rodape">
      <div class="qtd"><button type="button" id="mvMenos" aria-label="Menos um">&minus;</button><output id="mvQtd">1</output><button type="button" id="mvMais" aria-label="Mais um">+</button></div>
      <button type="button" class="btn btn--rosa" id="mvAdd">Adicionar <span id="mvTotal"></span></button>
    </footer>`;

  /* Atualiza tudo que depende das escolhas: desenho, composição, total */
  const arte = $("#mvArte");
  const atualizar = () => {
    const cfg = { ...e };
    if (ehShake) {
      const t = TAMANHOS[e.tam], leite = t.ml - 150;
      arte.style.setProperty("--escala", ([0.88, 1, 1.12][e.tam] ?? 1));                    // o copo cresce com o tamanho
      $(".comp__barra", modal).style.setProperty("--largura", (t.ml / 700 * 100) + "%");
      const l = $(".comp__leite", modal); l.style.setProperty("--leite", leite); l.textContent = `Leite ${leite} ml`;
      $(".comp__texto", modal).textContent = `Copo de ${t.ml} ml: 150 g de sorvete + ${leite} ml de leite.`;
    }
    if (ehSorvete) {
      const b = BOLAS[e.bolas];
      arte.innerHTML = desenharSorvete(b.n, p); arte.firstElementChild.classList.add("pop");
      $("#mvBolasTxt").textContent = `${b.n} bola${b.n > 1 ? "s" : ""}: ${b.n * 60} g de sorvete.`;
    }
    animarValor($("#mvTotal"), arredondar(calcularPreco(p, cfg) * e.qtd));
    $("#mvQtd").textContent = e.qtd;
  };

  if (ehShake) criarSeletor($("#mvTam"), TAMANHOS.map((t, i) => `${iconeCopo([26, 32, 38][i] ?? 32)}<strong>${t.ml} ml</strong><span class="seletor__preco">${moeda(t.preco)}</span>`), e.tam, i => { e.tam = i; atualizar(); });
  if (ehSorvete) criarSeletor($("#mvBolas"), BOLAS.map(b => `${iconeCone(b.n)}<strong>${b.n} bola${b.n > 1 ? "s" : ""}</strong><span class="seletor__preco">${moeda(b.preco)}</span>`), e.bolas, i => { e.bolas = i; atualizar(); });

  modal.onchange = ev => {
    const alvo = ev.target;
    if (alvo.matches(".chip input")) e.adic = $$(".chip input:checked", modal).map(x => x.value);
    if (alvo.name === "emb") e.emb = Number(alvo.value);
    if (alvo.matches("select[data-slot]")) e.slots[alvo.dataset.slot][alvo.dataset.campo] = Number(alvo.value);
    atualizar();
  };
  $("#mvObs").oninput = ev => { e.obs = ev.target.value; };
  $("#mvMenos").onclick = () => { e.qtd = Math.max(1, e.qtd - 1); atualizar(); };
  $("#mvMais").onclick = () => { e.qtd = Math.min(20, e.qtd + 1); atualizar(); };
  $("#mvAdd").onclick = () => exigirLoja(() => {
    const item = criarItem(p, e);
    Sacola.adicionar(item);
    fecharDialogo(modal);
    aviso(`${item.qtd}x ${item.nome} na sacola`, true);
  });
  atualizar();
  abrirDialogo(modal);
}
modal.addEventListener("click", e => { if (e.target.closest('[data-acao="fechar-produto"]')) fecharDialogo(modal); });

/* ---------- 7. GAVETA: SACOLA, RETIRADA, CONFIRMAÇÃO E HISTÓRICO ---------- */
const gaveta = $("#gaveta"), gCorpo = $("#gavetaCorpo"), gRodape = $("#gavetaRodape"), gTitulo = $("#gavetaTitulo"), gVoltar = $("#gavetaVoltar");
let etapa = "sacola", temporizadorTrilha = null;

function abrirGaveta(nome = "sacola", dado) { mostrarEtapa(nome, dado); abrirDialogo(gaveta); atualizarIndicadores(); }
function mostrarEtapa(nome, dado) {
  etapa = nome; clearInterval(temporizadorTrilha);
  gVoltar.hidden = nome === "sacola";
  ({ sacola: renderSacola, retirada: renderRetirada, confirmado: () => renderConfirmado(dado), historico: renderHistorico })[nome]();
  gCorpo.scrollTop = 0;
}
gVoltar.addEventListener("click", () => mostrarEtapa("sacola"));
gaveta.addEventListener("close", atualizarIndicadores);

/* Miniatura do item na sacola */
function miniatura(item) {
  const p = produtoPorId(item.produtoId);
  return `<div class="linha__arte" style="--tom:${p ? tomDe(p) : "#FFE49A"}">${p ? arteDe(p, item.bolas != null ? BOLAS[item.bolas].n : 2) : ""}</div>`;
}

/* Sugestões rápidas da sacola ("Que tal incluir?") */
const SUGESTOES = [
  { produto: "sorvete-chocolate", cfg: { tam: 0, bolas: 0, emb: 0, adic: [], obs: "", qtd: 1, slots: [] }, rotulo: "Sorvete de chocolate, 1 bola" },
  { produto: "ms-borgesshake",    cfg: { tam: 0, bolas: 0, emb: 0, adic: [], obs: "", qtd: 1, slots: [] }, rotulo: "BorgesShake 300 ml" },
];

function renderSacola() {
  gTitulo.textContent = "Sua sacola";
  if (!Sacola.itens.length) {
    gCorpo.innerHTML = `<div class="vazio"><p><strong>Sua sacola está vazia.</strong></p><p>Escolha um milkshake ou sorvete no cardápio.</p></div>`;
    gRodape.innerHTML = `<button type="button" class="btn btn--rosa btn--cheio" data-acao="fechar-gaveta">Ver cardápio</button>
      <button type="button" class="btn btn--contorno btn--cheio" data-acao="historico">Meus pedidos</button>`;
    return;
  }
  gCorpo.innerHTML = `<ul class="linhas">` + Sacola.itens.map(i => `<li class="linha">${miniatura(i)}
      <div class="linha__info"><strong>${esc(i.nome)}</strong><small>${esc(i.resumo)}</small>
        ${i.extras.length ? `<small>+ ${esc(i.extras.join(", "))}</small>` : ""}${i.obs ? `<small>Obs.: ${esc(i.obs)}</small>` : ""}
        <button type="button" class="linha__remover" data-acao="remover" data-uid="${i.uid}">Remover</button></div>
      <div class="linha__dir"><span class="linha__preco">${moeda(i.precoUnit * i.qtd)}</span>
        <div class="qtd qtd--mini"><button type="button" data-acao="menos" data-uid="${i.uid}" aria-label="Menos um">&minus;</button><output>${i.qtd}</output><button type="button" data-acao="mais" data-uid="${i.uid}" aria-label="Mais um">+</button></div></div>
    </li>`).join("") + `</ul>
    <div class="sugestao"><h4>Que tal incluir?</h4><div class="sugestao__lista">${SUGESTOES.map((s, k) => `<button type="button" data-acao="sugestao" data-k="${k}">+ ${s.rotulo}</button>`).join("")}</div></div>`;
  const eco = Sacola.economia();
  gRodape.innerHTML = `<div class="totais">${eco ? `<p class="totais__eco">Você economiza ${moeda(eco)} com combos</p>` : ""}
      <p class="totais__linha"><span>Total</span><strong>${moeda(Sacola.total())}</strong></p></div>
    <button type="button" class="btn btn--rosa btn--cheio" data-acao="ir-retirada">Continuar para retirada</button>`;
}

/* Horários disponíveis para agendar (de 15 em 15 min, respeitando o expediente da loja) */
function gerarHorarios(loja) {
  const lista = [], agora = new Date(), minimo = new Date(agora.getTime() + 20 * 60000);
  for (let d = 0; d < 3 && lista.length < 16; d++) {
    const dia = new Date(agora); dia.setDate(agora.getDate() + d);
    const exp = loja.horas[dia.getDay()]; if (!exp) continue;
    for (let h = exp[0]; h <= exp[1] - 0.25 && lista.length < 16; h += 0.25) {
      const t = new Date(dia); t.setHours(Math.floor(h), Math.round((h % 1) * 60), 0, 0);
      if (t >= minimo) lista.push({ t, rotulo: `${d === 0 ? "Hoje" : d === 1 ? "Amanhã" : DIAS[dia.getDay()]}, ${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}` });
    }
  }
  return lista;
}
const horaCurta = d => String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");

function renderRetirada() {
  gTitulo.textContent = "Retirada e pagamento";
  const f = cliente;
  gCorpo.innerHTML = `<form id="formRetirada" novalidate>
    <fieldset><legend>Retirar em</legend>
      <select id="fLoja" aria-label="Loja">${LOJAS.map((l, i) => `<option value="${i}">${l.nome}, ${l.cidade}</option>`).join("")}</select>
      <p class="campo__ajuda" id="fLojaInfo"></p>
      <div class="radios">
        <label class="opcao"><input type="radio" name="quando" value="agora"><span>O quanto antes <small id="fAgoraTxt"></small></span></label>
        <label class="opcao"><input type="radio" name="quando" value="agendar"><span>Agendar um horário</span></label>
      </div>
      <select id="fHora" aria-label="Horário de retirada"></select>
    </fieldset>
    <fieldset><legend>Seus dados</legend>
      <label class="campo">Nome<input id="fNome" autocomplete="name" value="${esc(f.nome)}" placeholder="Como devemos te chamar?"></label>
      <label class="campo">Celular<input id="fTel" inputmode="tel" autocomplete="tel" value="${esc(f.tel)}" placeholder="(51) 90000-0000"></label>
    </fieldset>
    <fieldset><legend>Pagamento na retirada</legend>
      <div class="radios">${FORMAS_PAGAMENTO.map((fp, i) => `<label class="opcao"><input type="radio" name="pag" value="${i}"><span>${fp.nome}</span></label>`).join("")}</div>
      <label class="campo" id="fTrocoCampo" hidden>Troco para quanto? (opcional)<input id="fTroco" inputmode="decimal" placeholder="Ex.: 50"></label>
      <p class="campo__ajuda" id="fPixInfo" hidden>No fim do pedido você recebe um QR Code Pix de demonstração.</p>
    </fieldset>
    <p class="erro" id="fErro" role="alert"></p>
  </form>`;
  gRodape.innerHTML = `<div class="totais"><p class="totais__linha"><span>Total</span><strong>${moeda(Sacola.total())}</strong></p></div>
    <button type="submit" form="formRetirada" class="btn btn--rosa btn--cheio" id="fConfirmar">Confirmar pedido</button>
    <p class="aviso-demo">${Banco.ativo ? "Você paga na retirada. O pedido é enviado direto para a loja." : "Pedido de demonstração: nada é cobrado nem enviado."}</p>`;

  const form = $("#formRetirada");
  const atualizarLoja = () => {
    const loja = LOJAS[Number($("#fLoja").value)], st = statusLoja(loja), horarios = gerarHorarios(loja);
    $("#fLojaInfo").textContent = `${loja.endereco}. ${st.texto}.`;
    const agoraRadio = $('input[name="quando"][value="agora"]', form);
    agoraRadio.disabled = !st.aberto;
    $("#fAgoraTxt").textContent = st.aberto ? "(pronto em cerca de 15 a 20 min)" : "(loja fechada agora)";
    $("#fHora").innerHTML = horarios.length ? horarios.map(h => `<option value="${h.t.toISOString()}">${h.rotulo}</option>`).join("") : `<option value="">Sem horários disponíveis</option>`;
    if (!st.aberto && agoraRadio.checked) $('input[name="quando"][value="agendar"]', form).checked = true;
    $("#fHora").hidden = $('input[name="quando"]:checked', form).value !== "agendar";
  };
  $("#fLoja").value = f.loja ?? 0;
  $(`input[name="quando"][value="${f.quando}"]`, form).checked = true;
  $(`input[name="pag"][value="${f.pag}"]`, form).checked = true;
  const atualizarPagamento = () => {
    const chave = FORMAS_PAGAMENTO[Number($('input[name="pag"]:checked', form).value)].chave;
    $("#fTrocoCampo").hidden = chave !== "dinheiro"; $("#fPixInfo").hidden = chave !== "pix";
  };
  form.addEventListener("change", e => { if (e.target.id === "fLoja" || e.target.name === "quando") atualizarLoja(); if (e.target.name === "pag") atualizarPagamento(); });
  $("#fTel").addEventListener("input", e => {                 // máscara (00) 00000-0000
    const n = e.target.value.replace(/\D/g, "").slice(0, 11);
    e.target.value = n.length > 6 ? `(${n.slice(0, 2)}) ${n.slice(2, n.length > 10 ? 7 : 6)}-${n.slice(n.length > 10 ? 7 : 6)}` : n.length > 2 ? `(${n.slice(0, 2)}) ${n.slice(2)}` : n;
  });
  atualizarLoja(); atualizarPagamento();
  form.addEventListener("submit", enviarPedido);
}

/* Valida o formulário e "envia" o pedido para a API falsa */
function enviarPedido(ev) {
  ev.preventDefault();
  const form = ev.target, erro = $("#fErro");
  const nome = $("#fNome").value.trim(), tel = $("#fTel").value, digitos = tel.replace(/\D/g, "");
  const lojaIdx = Number($("#fLoja").value), loja = LOJAS[lojaIdx];
  const quando = $('input[name="quando"]:checked', form).value, hora = $("#fHora").value;
  const pagIdx = Number($('input[name="pag"]:checked', form).value), forma = FORMAS_PAGAMENTO[pagIdx];
  const falha = !Sacola.itens.length ? "Sua sacola está vazia."
    : nome.length < 2 ? "Informe seu nome."
    : digitos.length < 10 ? "Informe um celular com DDD."
    : quando === "agendar" && !hora ? "Escolha um horário para retirar."
    : null;
  if (falha) { erro.textContent = falha; return; }
  erro.textContent = "";
  Object.assign(cliente, { loja: lojaIdx, nome, tel, pag: pagIdx, quando }); gravarLocal("borges.cliente", cliente);

  const total = Sacola.total(), trocoPara = Number(($("#fTroco").value || "").replace(",", "."));
  const pedido = {
    cliente: { nome, telefone: tel },
    loja: { indice: lojaIdx, nome: loja.nome, cidade: loja.cidade, endereco: loja.endereco, lat: loja.lat, lng: loja.lng },
    retirada: { tipo: quando, previsto: quando === "agendar" ? hora : new Date(Date.now() + 18 * 60000).toISOString() },
    itens: Sacola.itens.map(i => ({ ...i })),
    pagamento: { chave: forma.chave, nome: forma.nome, trocoPara: trocoPara || 0, troco: forma.chave === "dinheiro" && trocoPara > total ? arredondar(trocoPara - total) : 0 },
    totais: { total, economia: Sacola.economia() },
  };
  const botao = $("#fConfirmar"); botao.disabled = true; botao.textContent = "Enviando pedido..."; botao.classList.add("girando");
  PedidoAPI.criar(pedido)
    .then(salvo => { Sacola.limpar(); mostrarEtapa("confirmado", salvo); })
    .catch(err => {                                         // erro do banco: mostra e deixa tentar de novo
      erro.textContent = "Não foi possível enviar o pedido: " + err.message;
      botao.disabled = false; botao.textContent = "Confirmar pedido"; botao.classList.remove("girando");
    });
}

/* QR Code Pix de mentira: desenho estável gerado a partir do número do pedido */
function qrFalso(semente) {
  const n = 25; let s = semente * 9301 + 49297;
  const sorteio = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  const finder = (x, y) => `<rect x="${x}" y="${y}" width="7" height="7" fill="#1C4A35"/><rect x="${x + 1}" y="${y + 1}" width="5" height="5" fill="#fff"/><rect x="${x + 2}" y="${y + 2}" width="3" height="3" fill="#1C4A35"/>`;
  let celulas = "";
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const canto = (x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9);
    if (!canto && sorteio() > 0.52) celulas += `<rect x="${x}" y="${y}" width="1" height="1"/>`;
  }
  return `<svg class="qr" viewBox="-1 -1 ${n + 2} ${n + 2}" shape-rendering="crispEdges" role="img" aria-label="QR Code Pix de demonstração"><rect x="-1" y="-1" width="${n + 2}" height="${n + 2}" fill="#fff"/>
    <g fill="#1C4A35">${celulas}</g>${finder(0, 0)}${finder(n - 7, 0)}${finder(0, n - 7)}</svg>`;
}

const ETAPAS_TRILHA = ["Pedido recebido", "Preparando seu pedido", "Pronto para retirar"];
function renderConfirmado(p) {
  gTitulo.textContent = `Pedido #${p.numero}`;
  const previsto = new Date(p.retirada.previsto);
  const pix = p.pagamento.chave === "pix";
  gCorpo.innerHTML = `
    <div class="ok"><svg class="ok__check" viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="24"/><path d="M15 27l8 8 15-17"/></svg>
      <h3>Pedido confirmado!</h3>
      <p>Retire ${p.retirada.tipo === "agendar" ? "às" : "por volta das"} <strong>${horaCurta(previsto)}</strong> em <strong>${esc(p.loja.nome)}</strong>.</p></div>
    <div class="codigo"><small>Código de retirada</small><strong>${p.codigo}</strong></div>
    <ol class="trilha" id="trilha" data-etapa="0">${ETAPAS_TRILHA.map(t => `<li>${t}</li>`).join("")}</ol>
    <p class="trilha__txt" id="trilhaTxt"></p>
    ${pix ? `<div class="pix"><h4>Pagamento via Pix (demonstração)</h4>${qrFalso(p.numero)}
        <code id="pixCodigo">00020126DEMO-BORGES-${p.numero}-5204000053039865802BR5920MILKSHAKE DO BORGES6304FAKE</code>
        <button type="button" class="btn btn--contorno btn--pequeno" data-acao="copiar-pix">Copiar código</button></div>` : ""}
    <div class="cartao-loja"><strong>${esc(p.loja.nome)}</strong><address>${esc(p.loja.endereco)}, ${esc(p.loja.cidade)}, RS</address>
      <a class="btn btn--contorno btn--pequeno" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=${p.loja.lat},${p.loja.lng}">Como chegar</a></div>
    <h4>Resumo</h4>
    <ul class="resumo-itens">${p.itens.map(i => `<li><span>${i.qtd}x ${esc(i.nome)} <small>${esc(i.resumo)}${i.extras.length ? "; + " + esc(i.extras.join(", ")) : ""}</small></span><b>${moeda(i.precoUnit * i.qtd)}</b></li>`).join("")}</ul>
    <p class="totais__linha"><span>Total (pagar na retirada, ${esc(p.pagamento.nome)})</span><strong>${moeda(p.totais.total)}</strong></p>
    ${p.pagamento.troco ? `<p class="campo__ajuda">Troco a levar: ${moeda(p.pagamento.troco)}</p>` : ""}
    ${p.origem === "banco" ? `<p class="aviso-demo">Pedido registrado na loja. O andamento é atualizado automaticamente.</p>` : `<p class="aviso-demo">Simulação: o andamento do pedido é acelerado e nada foi enviado de verdade.</p>`}`;
  gRodape.innerHTML = `<button type="button" class="btn btn--rosa btn--cheio" data-acao="fechar-gaveta">Fazer novo pedido</button>
    <button type="button" class="btn btn--contorno btn--cheio" data-acao="historico">Meus pedidos</button>`;

  const atualizarTrilha = async () => {
    const { n } = await PedidoAPI.andamento(p);
    if (etapa !== "confirmado" || !$("#trilha")) return;
    $("#trilha").dataset.etapa = n;
    $("#trilhaTxt").textContent = n === -1 ? "Este pedido foi cancelado pela loja." : n === 0 ? "A loja recebeu o seu pedido." : n === 1 ? "Estamos batendo o seu milkshake agora." : `Pronto! Retire no balcão com o código ${p.codigo}.`;
    if (n === 2 || n === -1) clearInterval(temporizadorTrilha);
  };
  atualizarTrilha();
  temporizadorTrilha = setInterval(atualizarTrilha, p.origem === "banco" ? 5000 : 1000);     // do banco: consulta a cada 5 s
}

function renderHistorico() {
  gTitulo.textContent = "Meus pedidos";
  const lista = PedidoAPI.listar();
  gCorpo.innerHTML = lista.length ? `<ul class="historico">${lista.map(p => `<li><div><strong>Pedido #${p.numero}</strong>
      <small>${new Date(p.criadoEm).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}, ${esc(p.loja.cidade)}</small>
      <small>${p.itens.map(i => `${i.qtd}x ${esc(i.nome)}`).join(", ")}</small></div>
      <div class="historico__dir"><b>${moeda(p.totais.total)}</b><span class="selo-status">${p.origem === "banco" ? "Enviado" : "Demonstração"}</span>
      <button type="button" class="linha__remover" data-acao="ver-pedido" data-numero="${p.numero}">Ver</button>
      <button type="button" class="linha__remover" data-acao="repetir" data-numero="${p.numero}">Pedir de novo</button></div></li>`).join("")}</ul>`
    : `<div class="vazio"><p><strong>Você ainda não fez pedidos.</strong></p><p>Os pedidos de demonstração aparecem aqui.</p></div>`;
  gRodape.innerHTML = `<button type="button" class="btn btn--rosa btn--cheio" data-acao="fechar-gaveta">Ver cardápio</button>`;
}

/* Todos os botões da gaveta e da barra "Ver sacola" passam por aqui (data-acao) */
document.addEventListener("click", ev => {
  const alvo = ev.target.closest("[data-acao]"); if (!alvo) return;
  const { acao, uid, k, numero } = alvo.dataset;
  const pedido = numero ? PedidoAPI.listar().find(x => x.numero === Number(numero)) : null;
  switch (acao) {
    case "abrir-sacola":   abrirGaveta("sacola"); break;
    case "fechar-gaveta":  fecharDialogo(gaveta); break;
    case "ir-retirada":    mostrarEtapa("retirada"); break;
    case "historico":      mostrarEtapa("historico"); break;
    case "mais":           Sacola.mudarQtd(uid, +1); break;
    case "menos":          Sacola.mudarQtd(uid, -1); break;
    case "remover":        Sacola.remover(uid); break;
    case "sugestao":       { const s = SUGESTOES[Number(k)]; Sacola.adicionar(criarItem(produtoPorId(s.produto), s.cfg)); break; }
    case "ver-pedido":     if (pedido) mostrarEtapa("confirmado", pedido); break;
    case "repetir":        if (pedido) { pedido.itens.forEach(i => Sacola.adicionar({ ...i, uid: novoId() })); mostrarEtapa("sacola"); } break;
    case "usar-local":     usarMinhaLocalizacao(); break;
    case "escolher-loja":  escolherLoja(Number(alvo.dataset.i)); break;
    case "fechar-loja":    fecharDialogo(modalLoja); break;
    case "copiar-pix":     navigator.clipboard?.writeText($("#pixCodigo").textContent); alvo.textContent = "Copiado!"; break;
  }
});

/* ---------- 8. FOTOS REAIS DOS PRODUTOS ----------
   Ordem de tentativa para cada produto:
   1) foto sua em assets/img/cardapio/<slug>.jpg
   2) foto específica (fotoFixa) do Wikimedia Commons
   3) Unsplash, se você colocar sua chave abaixo
   4) busca no Wikimedia Commons (licença livre), com crédito do autor
   5) se nada carregar, fica a ilustração desenhada. */
const UNSPLASH_KEY = "";   // opcional: chave grátis em unsplash.com/developers
const fotosUsadas = new Set();
const limpar = t => (t || "").replace(/<[^>]*>/g, "").trim();
const creditoHtml = f => `<a class="produto__credito" href="${f.pagina}" target="_blank" rel="noopener">Foto: ${esc(f.autor)} (${esc(f.licenca)})</a>`;

function aplicarFoto(slug) {
  const f = fotosAchadas[slug]; if (!f) return;
  $$(`.produto[data-slug="${slug}"] .produto__foto`).forEach(area => {
    if ($(".produto__img", area)) return;
    const img = new Image();
    img.className = "produto__img"; img.alt = "Foto de " + slug.replace(/-/g, " ");
    img.onload = () => { const s = $("svg, .combo-arte", area); if (s) s.style.display = "none"; area.prepend(img); if (f.credito) area.insertAdjacentHTML("beforeend", f.credito); };
    img.src = f.src;
  });
}
async function buscarUnsplash(termo) {
  const url = `https://api.unsplash.com/search/photos?per_page=8&orientation=squarish&query=${encodeURIComponent(termo)}&client_id=${UNSPLASH_KEY}`;
  const dados = await fetch(url).then(r => r.json());
  const f = (dados.results || []).find(r => !fotosUsadas.has(r.urls.small));
  return f && { src: f.urls.small, autor: f.user.name, licenca: "Unsplash", pagina: f.links.html };
}
async function buscarCommons(termo) {
  const url = "https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrnamespace=6&gsrlimit=15"
    + "&gsrsearch=" + encodeURIComponent(termo + " filetype:bitmap") + "&prop=imageinfo&iiprop=url|mime|size|extmetadata&iiurlwidth=700";
  const dados = await fetch(url).then(r => r.json());
  const paginas = Object.values(dados.query?.pages || {}).sort((a, b) => a.index - b.index);
  for (const pg of paginas) {
    const i = pg.imageinfo?.[0];
    if (!i || i.mime !== "image/jpeg" || i.width < 700 || i.height < 500 || fotosUsadas.has(i.thumburl)) continue;
    return { src: i.thumburl, autor: limpar(i.extmetadata?.Artist?.value) || "autor desconhecido",
             licenca: limpar(i.extmetadata?.LicenseShortName?.value) || "licença livre", pagina: i.descriptionurl };
  }
  return null;
}
async function carregarFotos() {
  for (const item of [...SABORES.filter(s => !s.imagem), ...SORVETES]) {
    const local = `assets/img/cardapio/${item.slug}.jpg`;
    const temLocal = await new Promise(res => { const t = new Image(); t.onload = () => res(true); t.onerror = () => res(false); t.src = local; });
    if (temLocal) { fotosAchadas[item.slug] = { src: local }; aplicarFoto(item.slug); continue; }
    if (item.fotoFixa) {
      const arq = item.fotoFixa.arquivo, src = "https://commons.wikimedia.org/wiki/Special:FilePath/" + encodeURIComponent(arq) + "?width=700";
      fotosUsadas.add(src);
      fotosAchadas[item.slug] = { src, credito: creditoHtml({ pagina: "https://commons.wikimedia.org/wiki/File:" + encodeURIComponent(arq), autor: "Wikimedia Commons", licenca: "ver licença" }) };
      aplicarFoto(item.slug); continue;
    }
    for (const termo of item.buscas) {
      try {
        const f = (UNSPLASH_KEY && await buscarUnsplash(termo)) || await buscarCommons(termo);
        if (f) { fotosUsadas.add(f.src); fotosAchadas[item.slug] = { src: f.src, credito: creditoHtml(f) }; aplicarFoto(item.slug); break; }
      } catch (erro) { console.warn("Foto indisponível:", termo, erro); }
    }
  }
}

/* ---------- 9. CATÁLOGO DO BANCO (Supabase) ----------
   Troca o conteúdo dos arrays locais (cardapio-dados.js) pelos dados do banco, mantendo as cores e
   os desenhos do site. O que o banco manda: sabores ativos, preços, adicionais, combos, lojas. */
function aplicarCatalogoDoBanco(d) {
  const porSlug = lista => Object.fromEntries(lista.map(x => [x.slug, x]));
  const locSab = porSlug(SABORES), locSor = porSlug(SORVETES), locCombo = porSlug(COMBOS);
  const ativos = l => l.filter(x => x.ativo !== false).sort((a, b) => (a.ordem ?? a.id) - (b.ordem ?? b.id));

  const padraoShake = { cor: "#F8D5E0", cor2: "#E8558E", topo: "#C93573", enfeite: "cereja", tags: [] };
  const sabores = ativos(d.sabor_milkshake).map(r => { const l = locSab[r.slug] || {};
    return { ...padraoShake, ...l, dbId: r.id, slug: r.slug || "sabor-" + r.id, nome: r.nome, tema: r.tema ?? l.tema ?? "Milkshake",
             desc: r.descricao ?? l.desc ?? "", ing: r.ingredientes ?? l.ing ?? "", selo: r.selo ?? l.selo, especial: !!r.destaque,
             buscas: l.buscas || [r.nome + " milkshake"] }; });

  const idProduto = d.sabor_milkshake[0]?.id_produto;
  const tamanhos = d.tamanho_milkshake.filter(t => t.id_produto === idProduto).sort((a, b) => (a.ordem ?? a.volume_ml) - (b.ordem ?? b.volume_ml))
    .map(t => ({ id: t.id, ml: Number(t.volume_ml), preco: Number(t.preco_venda) }));

  const padraoSor = { c: ["#F6D6E3", "#F28DB0", "#D95A8A"] };
  const sorvetes = ativos(d.sabor_sorvete).map(r => { const l = locSor[r.slug] || {}, porcoes = {};
    d.porcao_sorvete.filter(x => x.id_sabor === r.id).forEach(x => { porcoes[Number(x.qtd_bolas)] = { id: x.id, preco: Number(x.preco_venda) }; });
    return { ...padraoSor, ...l, dbId: r.id, slug: r.slug || "sorvete-" + r.id, nome: r.nome, desc: r.descricao ?? l.desc ?? "", porcoes, buscas: l.buscas || [r.nome + " ice cream"] }; })
    .filter(s => Object.keys(s.porcoes).length);
  const nBolas = [...new Set(sorvetes.flatMap(s => Object.keys(s.porcoes).map(Number)))].sort((a, b) => a - b);
  const bolas = nBolas.map(n => ({ n, preco: sorvetes.find(s => s.porcoes[n]).porcoes[n].preco }));

  const adicionais = d.complemento.filter(c => c.ativo !== false).map(r => ({ id: r.slug || "adicional-" + r.id, dbId: r.id, nome: r.nome, preco: Number(r.preco_venda) }));

  const combos = d.combo.filter(c => c.ativo !== false).map(r => { const l = locCombo[r.slug] || {}, slots = [];
    d.combo_item.filter(ci => ci.id_combo === r.id).forEach(ci => { for (let k = 0; k < (Number(ci.quantidade) || 1); k++)
      slots.push(ci.tipo === "milkshake" ? { tipo: "milkshake", tam: tamanhos.findIndex(t => t.ml === Number(ci.volume_ml)) } : { tipo: "sorvete", bolas: bolas.findIndex(b => b.n === Number(ci.qtd_bolas)) }); });
    if (!slots.length || slots.some(s => (s.tam ?? s.bolas) < 0)) return null;           // combo com tamanho que não existe mais
    const original = slots.reduce((s, sl) => s + (sl.tipo === "milkshake" ? tamanhos[sl.tam].preco : bolas[sl.bolas].preco), 0);
    return { ...l, dbId: r.id, id: "combo-" + (r.slug || r.id), slug: r.slug || "combo-" + r.id, nome: r.nome, tema: "Combo", desc: r.descricao ?? l.desc ?? "", ing: l.ing ?? "Combo do Borges", preco: Number(r.preco_venda), precoOriginal: original, slots }; }).filter(Boolean);

  const bonitas = { dinheiro: "Dinheiro", cartao_debito: "Cartão de débito", cartao_credito: "Cartão de crédito", pix: "Pix" };
  const formas = d.forma_pagamento.filter(f => f.ativo !== false).map(f => ({ id: f.id, chave: f.nome, nome: bonitas[f.nome] || f.nome }));

  const lojas = d.loja.filter(l => l.ativo !== false).map(r => { let horas; try { horas = JSON.parse(r.horarios); } catch { /* usa o padrão */ }
    if (!Array.isArray(horas) || horas.length !== 7) horas = Array(7).fill([12, 22]);
    const l = LOJAS.find(x => x.nome === r.nome) || {};
    return { id: r.id, nome: r.nome, cidade: r.cidade || "", endereco: r.endereco || "", telefone: r.telefone || "", lat: Number(r.lat), lng: Number(r.lng),
             chip: l.chip || "", horas, horarioTexto: l.horarioTexto || resumoHorarios(horas) }; });

  if (!sabores.length || !tamanhos.length || !sorvetes.length || !formas.length || !lojas.length)
    throw new Error("Catálogo vazio no banco. Rode admin/supabase/03-catalogo-site.sql.");
  const troca = (alvo, novo) => alvo.splice(0, alvo.length, ...novo);
  troca(SABORES, sabores); troca(TAMANHOS, tamanhos); troca(SORVETES, sorvetes); troca(BOLAS, bolas);
  troca(ADICIONAIS, adicionais); troca(COMBOS, combos); troca(FORMAS_PAGAMENTO, formas); troca(LOJAS, lojas);
}

async function carregarDoBanco() {
  const aviso = $("#statusBanco");
  try {
    $("#catalogo").classList.add("carregando");
    aplicarCatalogoDoBanco(await carregando(Banco.carregarCatalogo(), "Carregando o cardápio...", 400));
    Banco.ativo = true;
    aviso.textContent = "Conectado ao banco: pedidos vão direto para a loja";
    aviso.className = "retirada__banco ok";
    $("#introPedido").textContent = "Escolha, monte e retire na loja. Você paga só na retirada.";
    if (cliente.loja != null && !LOJAS[cliente.loja]) cliente.loja = null;
    montarProdutos(); renderCatalogo(); desenharAbas(); atualizarBarraLoja();
    window.montarFaixaRodape?.(); window.montarLojas?.();
  } catch (erro) {
    console.warn("Cardápio do banco indisponível, usando o cardápio local:", erro.message);
    aviso.textContent = "Modo demonstração: sem conexão com o banco (" + erro.message + ")";
    aviso.className = "retirada__banco";
  } finally { $("#catalogo").classList.remove("carregando"); }
}

/* ---------- INÍCIO ---------- */
renderCatalogo();
atualizarIndicadores();
carregarDoBanco().finally(carregarFotos);                       // primeiro o cardápio do banco, depois as fotos
window.BorgesPedidos = { PedidoAPI, Sacola, Banco, paraTabelasDashboard };   // para testar no console
})();
