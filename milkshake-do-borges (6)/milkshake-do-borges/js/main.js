/* =========================================================
   Milkshake do Borges - comportamento geral da página
   (o cardápio e o pedido ficam em js/pedido.js)
   1) Lojas e redes sociais (dados)
   2) Montagem: redes, faixa, rodapé, granulados e ondas
   3) Lojas: mapa real (Leaflet) + cartões
   4) Cabeçalho, rolagem e animações
   ========================================================= */
document.documentElement.classList.add("js");   // liga os efeitos de rolagem do CSS
const reduzir = matchMedia("(prefers-reduced-motion: reduce)").matches;   // quem prefere menos movimento

/* Lojas FICTÍCIAS na Grande Porto Alegre (troque pelos dados reais).
   lat e lng = posição no mapa real | x e y = posição no mapa desenhado (plano B) | horas = [abre, fecha] de domingo (0) a sábado (6), ou null se fechado */
const LOJAS = [
  { nome: "Borges Cidade Baixa", cidade: "Porto Alegre", chip: "Loja principal",
    endereco: "Rua José do Patrocínio, 480, Cidade Baixa", telefone: "(51) 90000-0001", lat: -30.0436, lng: -51.2200, x: 170, y: 312,
    horarioTexto: "Todos os dias, 12h às 23h", horas: [[12, 23], [12, 23], [12, 23], [12, 23], [12, 23], [12, 23], [12, 23]] },
  { nome: "Borges Canoas", cidade: "Canoas", chip: "Com estacionamento",
    endereco: "Avenida Guilherme Schell, 1250, Centro", telefone: "(51) 90000-0002", lat: -29.9178, lng: -51.1839, x: 228, y: 232,
    horarioTexto: "Todos os dias, 12h às 22h", horas: [[12, 22], [12, 22], [12, 22], [12, 22], [12, 22], [12, 22], [12, 22]] },
  { nome: "Borges Sapucaia", cidade: "Sapucaia do Sul", chip: "Mais perto da fazenda",
    endereco: "Avenida Getúlio Vargas, 2100, Centro", telefone: "(51) 90000-0003", lat: -29.8276, lng: -51.1456, x: 264, y: 150,
    horarioTexto: "Terça a domingo, 13h às 22h", horas: [[13, 22], null, [13, 22], [13, 22], [13, 22], [13, 22], [13, 22]] },
];

/* Redes sociais FICTÍCIAS: troque href pelos links reais.
   O ícone vem da API Iconify (api.iconify.design); se falhar, aparece a sigla. */
const REDES = [
  { nome: "Instagram", slug: "instagram", sigla: "IG", href: "#" },
  { nome: "WhatsApp",  slug: "whatsapp",  sigla: "WA", href: "#" },
  { nome: "TikTok",    slug: "tiktok",    sigla: "TT", href: "#" },
  { nome: "YouTube",   slug: "youtube",   sigla: "YT", href: "#" },
];

/* ---------- 3. MONTAGEM ---------- */
/* Redes sociais: cada ".redes[data-redes]" recebe os ícones na cor indicada */
document.querySelectorAll("[data-redes]").forEach(box => {
  const cor = box.dataset.redes;
  box.innerHTML = REDES.map(r => `
    <a class="social" href="${r.href}" aria-label="${r.nome}" title="${r.nome}">
      <span>${r.sigla}</span>
      <img src="https://api.iconify.design/simple-icons/${r.slug}.svg?color=%23${cor}" alt=""
           onload="this.previousElementSibling.hidden=true" onerror="this.remove()">
    </a>`).join("");
});

/* Faixa amarela do hero e lista de sabores do rodapé (refeitos quando o cardápio vem do banco) */
function montarFaixaRodape() {
  const nomes = [...SABORES.map(s => s.nome), "Leite direto do Borges"].map(n => n + " ✦").join(" ");
  const bloco = `<span>${(nomes + " ").repeat(3)}</span>`;
  document.getElementById("faixa").innerHTML = bloco + bloco;      // duas cópias para o loop ficar contínuo
  document.getElementById("rodapeSabores").innerHTML = SABORES.map(s => `<li>${s.nome}</li>`).join("");
}
montarFaixaRodape();
document.getElementById("ano").textContent = new Date().getFullYear();

/* Granulados flutuando no hero */
const cores = ["#E8558E", "#FFE49A", "#5BB88C", "#FFFFFF"];
const box = document.getElementById("granulados");
for (let i = 0; i < 16; i++) {
  const g = document.createElement("i");
  g.style.left = Math.random() * 95 + "%";
  g.style.top  = Math.random() * 80 + "%";
  g.style.background = cores[i % cores.length];
  g.style.rotate = Math.random() * 180 + "deg";
  g.style.animationDelay = Math.random() * 4 + "s";
  box.appendChild(g);
}

/* Granulados de fundo: confete discreto espalhado em cada seção.
   Usa um gerador de números repetível, assim a posição não muda a cada visita. */
let semente = 7;
const sorteio = () => (semente = (semente * 16807) % 2147483647) / 2147483647;
const coresFundo = ["#E8558E", "#F5B93E", "#5BB88C", "#FFFFFF", "#F28DB0"];
document.querySelectorAll(".secao").forEach(secao => {
  const camada = document.createElement("div");
  camada.className = "granulados-fundo";
  camada.setAttribute("aria-hidden", "true");
  for (let i = 0; i < 26; i++) {
    const g = document.createElement("i");
    g.style.cssText = `left:${sorteio() * 98}%;top:${sorteio() * 98}%;background:${coresFundo[i % coresFundo.length]};rotate:${sorteio() * 180}deg`;
    camada.appendChild(g);
  }
  /* bolhas de leite: círculos translúcidos que flutuam devagar */
  for (let i = 0; i < 5; i++) {
    const b = document.createElement("b");
    const tam = 60 + sorteio() * 150;
    b.className = "bolha";
    b.style.cssText = `width:${tam}px;height:${tam}px;left:${sorteio() * 92}%;top:${sorteio() * 88}%;animation-delay:${-sorteio() * 12}s;animation-duration:${12 + sorteio() * 10}s`;
    camada.appendChild(b);
  }
  secao.prepend(camada);
});

/* Ondas no topo de cada seção (e do rodapé): a cor vem da variável --fundo da própria seção */
const ONDAS = [
  "M0 60V30C150 0 300 0 450 24S750 60 900 30 1100 6 1200 28V60Z",
  "M0 60V22C200 58 400 58 600 28S1000 4 1200 24V60Z",
  "M0 60V34Q50 2 100 34T200 34T300 34T400 34T500 34T600 34T700 34T800 34T900 34T1000 34T1100 34T1200 34V60Z",
];
document.querySelectorAll(".secao:not(.cardapio), .rodape").forEach((el, i) => {
  el.insertAdjacentHTML("afterbegin", `<svg class="onda" viewBox="0 0 1200 60" preserveAspectRatio="none" aria-hidden="true"><path d="${ONDAS[i % ONDAS.length]}"/></svg>`);
});

/* ---------- LOJAS: mapa real + cartões ---------- */
const DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

/* Diz se a loja está aberta agora, usando o relógio de quem visita o site */
function statusLoja(loja) {
  const agora = new Date(), dia = agora.getDay(), hora = agora.getHours() + agora.getMinutes() / 60;
  const hoje = loja.horas[dia];
  if (hoje && hora >= hoje[0] && hora < hoje[1]) return { aberto: true, texto: `Aberto agora, fecha às ${hoje[1]}h` };
  for (let k = 0; k < 8; k++) {                                   // procura o próximo dia com expediente
    const d = (dia + k) % 7, p = loja.horas[d];
    if (p && (k > 0 || hora < p[0])) {
      const quando = k === 0 ? "hoje" : k === 1 ? "amanhã" : DIAS[d];
      return { aberto: false, texto: `Fechado, abre ${quando} às ${p[0]}h` };
    }
  }
  return { aberto: false, texto: "Fechado" };
}

/* Resume os horários de uma loja que veio do banco (ex.: "Seg a sex, 12h às 22h; Dom fechado") */
function resumoHorarios(horas) {
  const ordem = [1, 2, 3, 4, 5, 6, 0], nomes = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const grupos = [];
  ordem.forEach(d => {
    const h = horas[d] ? `${horas[d][0]}h às ${horas[d][1]}h` : "fechado", ult = grupos[grupos.length - 1];
    if (ult && ult.h === h) ult.fim = d; else grupos.push({ h, ini: d, fim: d });
  });
  if (grupos.length === 1) return grupos[0].h === "fechado" ? "Fechado" : "Todos os dias, " + grupos[0].h;
  return grupos.map(g => `${g.ini === g.fim ? nomes[g.ini] : nomes[g.ini] + " a " + nomes[g.fim]}, ${g.h}`).join("; ");
}

/* Mapas gratuitos e SEM chave (API key). O botão no canto do mapa troca entre eles, e se os blocos do
   primeiro não carregarem o site passa sozinho para o próximo:
   Esri (ruas) > OpenStreetMap > CARTO (claro) > Esri (satélite).
   Dica: abra o site por um servidor local (python -m http.server) em vez de dar dois cliques no arquivo,
   porque alguns serviços de mapa bloqueiam páginas abertas direto do disco. */
const FONTES_MAPA = [
  { nome: "Ruas (Esri)", url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}", opcoes: { maxZoom: 19, attribution: "Tiles &copy; Esri" } },
  { nome: "OpenStreetMap", url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png", opcoes: { maxZoom: 19, attribution: "&copy; OpenStreetMap contributors" } },
  { nome: "Claro (CARTO)", url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", opcoes: { subdomains: "abcd", maxZoom: 19, attribution: "&copy; OpenStreetMap contributors &copy; CARTO" } },
  { nome: "Satélite (Esri)", url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", opcoes: { maxZoom: 19, attribution: "Tiles &copy; Esri" } },
];
function criarCamadaMapa(mapaLeaflet) {
  const camadas = FONTES_MAPA.map(f => L.tileLayer(f.url, f.opcoes));
  let atual = 0, erros = 0, automatico = true, trocaAutomatica = false;
  camadas[0].addTo(mapaLeaflet);
  L.control.layers(Object.fromEntries(FONTES_MAPA.map((f, i) => [f.nome, camadas[i]])), null, { position: "topright" }).addTo(mapaLeaflet);
  mapaLeaflet.on("baselayerchange", () => { if (trocaAutomatica) trocaAutomatica = false; else automatico = false; });   // escolha manual desliga a troca automática
  camadas.slice(0, 3).forEach((camada, i) => camada.on("tileerror", () => {
    if (!automatico || i !== atual || ++erros < 3 || atual >= 2) return;                                                   // 3 erros seguidos: próximo mapa
    erros = 0; trocaAutomatica = true;
    mapaLeaflet.removeLayer(camadas[atual]); atual++; camadas[atual].addTo(mapaLeaflet);
  }));
}

/* Ícone de pino do mapa real */
const iconePino = () => L.divIcon({
  className: "marcador", iconSize: [36, 46], iconAnchor: [18, 46],
  html: `<svg viewBox="0 0 36 46" aria-hidden="true"><path d="M18 46C4 24 0 16 0 12a18 18 0 1 1 36 0c0 4-4 12-18 34Z"/><circle cx="18" cy="12" r="7" fill="#fff"/></svg>`,
});

const listaLojas = document.getElementById("listaLojas");
const pinos = document.getElementById("pinos");
let mapa = null, marcadores = [];

/* Posição de uma loja no mapa desenhado (plano B). Sem x/y, calcula a partir de lat/lng. */
const posX = l => l.x ?? 170 + (l.lng + 51.22) * 1263;
const posY = l => l.y ?? 312 - (l.lat + 30.0436) * 750;

/* Cartões, pinos do mapa desenhado e marcadores do mapa real (refeitos quando as lojas vêm do banco) */
function montarLojas() {
  listaLojas.innerHTML = LOJAS.map((l, i) => {
    const st = statusLoja(l);
    const rota = `https://www.google.com/maps/dir/?api=1&destination=${l.lat},${l.lng}`;
    return `<article class="loja" data-i="${i}" tabindex="0" data-revela>
      <div class="loja__topo"><h3>${l.nome}</h3>${l.chip ? `<span class="loja__chip">${l.chip}</span>` : ""}</div>
      <address>${l.endereco}<br>${l.cidade}, RS</address>
      <p class="loja__info">${l.horarioTexto}<br>${l.telefone}</p>
      <p class="loja__status ${st.aberto ? "" : "loja__status--fechado"}">${st.texto}</p>
      <a class="btn btn--rosa btn--pequeno" href="${rota}" target="_blank" rel="noopener">Como chegar</a>
    </article>`;
  }).join("");
  pinos.innerHTML = LOJAS.map((l, i) => `
    <g class="pino" data-i="${i}" transform="translate(${posX(l)} ${posY(l)})" tabindex="0" role="button" aria-label="${l.nome}, ${l.cidade}">
      <ellipse class="pino__sombra" cx="0" cy="2" rx="12" ry="4"/>
      <g class="pino__corpo"><path d="M0 0C-14-22-18-30-18-40a18 18 0 1 1 36 0C18-30 14-22 0 0Z"/><circle cx="0" cy="-40" r="7" fill="#fff"/></g>
      <text class="pino__nome" x="0" y="22" text-anchor="middle">${l.cidade}</text>
    </g>`).join("");
  document.querySelectorAll("#listaLojas [data-revela]").forEach(el => { el.classList.add("visivel"); });
  desenharMarcadores();
  selecionarLoja(0, false);
}

/* Mapa real (Leaflet). Sem internet/biblioteca, continua o mapa desenhado em SVG. */
function iniciarMapaReal() {
  if (!window.L) return;
  const caixa = document.getElementById("mapaReal");
  caixa.hidden = false;
  document.querySelector(".mapa > svg").style.display = "none";
  mapa = L.map(caixa, { scrollWheelZoom: false, dragging: !L.Browser.mobile });     // sem "prender" a rolagem da página
  criarCamadaMapa(mapa);
  mapa.on("focus", () => mapa.scrollWheelZoom.enable());                           // zoom com a roda só depois de clicar no mapa
  mapa.on("blur", () => mapa.scrollWheelZoom.disable());
  document.querySelector(".lojas__nota").textContent = "Mapas gratuitos (Esri, OpenStreetMap e CARTO), sem chave. Endereços, telefones e horários de exemplo.";
}
function desenharMarcadores() {
  if (!mapa) return;
  marcadores.forEach(mk => mk.remove());
  marcadores = LOJAS.map((l, i) => {
    const mk = L.marker([l.lat, l.lng], { icon: iconePino(), title: l.nome, alt: l.nome }).addTo(mapa);
    mk.bindTooltip(l.cidade, { permanent: true, direction: "bottom", offset: [0, 4], className: "marcador__rotulo" });
    mk.on("click", () => selecionarLoja(i));
    return mk;
  });
  mapa.fitBounds(LOJAS.map(l => [l.lat, l.lng]), { padding: [50, 50] });             // enquadra todas as lojas
}

/* Seleciona uma loja: destaca o cartão e o pino; no mapa real, voa até a loja */
function selecionarLoja(i, mover = true) {
  listaLojas.querySelectorAll(".loja").forEach((el, k) => el.classList.toggle("loja--ativa", k === i));
  pinos.querySelectorAll(".pino").forEach((el, k) => el.classList.toggle("ativo", k === i));
  marcadores.forEach((mk, k) => mk.getElement()?.classList.toggle("ativo", k === i));
  if (mapa && mover && LOJAS[i]) mapa.flyTo([LOJAS[i].lat, LOJAS[i].lng], Math.max(mapa.getZoom(), 14), { duration: 0.8 });
}
[listaLojas, pinos].forEach(caixa => {
  caixa.addEventListener("click", e => { const el = e.target.closest("[data-i]"); if (el && !e.target.closest("a")) selecionarLoja(Number(el.dataset.i)); });
  caixa.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { const el = e.target.closest("[data-i]"); if (el) { e.preventDefault(); selecionarLoja(Number(el.dataset.i)); } } });
});
iniciarMapaReal();
montarLojas();

/* ---------- 4. CABEÇALHO, ROLAGEM E ANIMAÇÕES ---------- */
const topo = document.getElementById("topo");
const progresso = document.getElementById("progresso");
const foto = document.querySelector("#heroFoto img");

/* Tudo que depende da rolagem fica aqui; requestAnimationFrame evita travar */
let esperando = false;
function aoRolar() {
  const y = scrollY;
  const total = document.documentElement.scrollHeight - innerHeight;
  topo.classList.toggle("rolou", y > 30);                       // cria o fundo do cabeçalho
  progresso.style.width = (y / total * 100) + "%";               // barra de progresso
  if (!reduzir && y < innerHeight * 1.2) {
    foto.style.transform = `translateY(${y * 0.05}px)`;           // foto desce bem de leve (parallax)
  }
  esperando = false;
}
addEventListener("scroll", () => { if (!esperando) { esperando = true; requestAnimationFrame(aoRolar); } }, { passive: true });
aoRolar();

/* Menu do celular */
const burger = document.getElementById("burger");
const menu = document.getElementById("menu");
burger.addEventListener("click", () => {
  const aberto = menu.classList.toggle("aberto");
  burger.setAttribute("aria-expanded", aberto);
});
menu.addEventListener("click", e => { if (e.target.tagName === "A") { menu.classList.remove("aberto"); burger.setAttribute("aria-expanded", false); } });

/* Revelar elementos ao entrar na tela, com atraso escalonado entre irmãos (--i) */
const observador = new IntersectionObserver(entradas => {
  entradas.forEach(e => { if (e.isIntersecting) {
    e.target.classList.add("visivel"); observador.unobserve(e.target);
  } });
}, { threshold: 0.15 });
document.querySelectorAll("[data-revela]").forEach(el => {
  const irmaos = [...el.parentElement.querySelectorAll(":scope > [data-revela]")];
  el.style.setProperty("--i", irmaos.indexOf(el));
  observador.observe(el);
});
