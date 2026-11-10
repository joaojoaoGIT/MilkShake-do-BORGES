/* =========================================================
   Milkshake do Borges - desenhos em SVG
   Copo de milkshake e casquinha de sorvete, usados no cardápio
   enquanto a foto real carrega (ou se ela não existir).
   ========================================================= */
let uid = 0;   // cada SVG precisa de ids de gradiente únicos

/* Enfeite que fica em cima do chantilly, de acordo com o sabor */
function desenharEnfeite(tipo) {
  const f = {
    mirtilo:  `<g fill="#4F5FC4"><circle cx="52" cy="40" r="5"/><circle cx="64" cy="36" r="5.2"/><circle cx="72" cy="42" r="4.4"/></g><g fill="#8FA3F2"><circle cx="50.5" cy="38.5" r="1.4"/><circle cx="62.5" cy="34.5" r="1.4"/></g>`,
    polarizado: `<circle cx="50" cy="40" r="7.5" fill="#E23A6E"/><circle cx="48" cy="38" r="2" fill="#fff" opacity=".6"/><circle cx="72" cy="40" r="7.5" fill="#4F5FC4"/><circle cx="70" cy="38" r="2" fill="#fff" opacity=".5"/>`,
    avela:    `<circle cx="60" cy="38" r="9" fill="#8B5A3C"/><circle cx="57" cy="34.5" r="2.6" fill="#fff" opacity=".5"/><path d="M52 42q8 6 16 0" stroke="#E5B25D" stroke-width="2" fill="none"/>`,
    crocante: `<g fill="#B8742A"><circle cx="48" cy="40" r="3.4"/><circle cx="56" cy="34" r="3.8"/><circle cx="66" cy="37" r="3.4"/><circle cx="74" cy="42" r="3"/></g><g fill="#E5B25D"><circle cx="61" cy="43" r="2.6"/><circle cx="52" cy="45" r="2.2"/></g>`,
    biscoito: `<g><circle cx="52" cy="40" r="8" fill="#2E2220"/><circle cx="52" cy="40" r="4.2" fill="#F5EFE8"/><circle cx="70" cy="36" r="8" fill="#2E2220"/><circle cx="70" cy="36" r="4.2" fill="#F5EFE8"/></g>`,
    cereja:   `<path d="M62 36q4-14 12-16" stroke="#2F6F50" stroke-width="2.2" fill="none"/><circle cx="60" cy="40" r="8.5" fill="#D2264D"/><circle cx="57" cy="37" r="2.2" fill="#fff" opacity=".7"/>`,
    morango:  `<path d="M52 34c0-6 18-6 18 0 0 10-9 16-9 16s-9-6-9-16z" fill="#E23A6E"/><path d="M54 31l7-5 7 5-7 3z" fill="#3F9A63"/><circle cx="57" cy="39" r="1" fill="#FFE49A"/><circle cx="64" cy="40" r="1" fill="#FFE49A"/><circle cx="61" cy="45" r="1" fill="#FFE49A"/>`,
    menta:    `<path d="M60 40c-12-4-14-18-8-22 10 0 14 12 8 22z" fill="#4DB486"/><path d="M62 40c10-6 20-4 22-12-10-3-22 2-22 12z" fill="#6CCB9F"/><circle cx="46" cy="40" r="3" fill="#4E2C1F"/><circle cx="76" cy="42" r="3" fill="#4E2C1F"/>`,
    pistache: `<g fill="#7FB04A"><circle cx="48" cy="40" r="3.2"/><circle cx="58" cy="35" r="3.6"/><circle cx="68" cy="38" r="3.2"/><circle cx="76" cy="43" r="2.8"/><circle cx="54" cy="44" r="2.6"/></g><path d="M46 38h12" stroke="#E5B25D" stroke-width="2" opacity="0"/>`,
    maracuja: `<circle cx="60" cy="38" r="12" fill="#F5B93E"/><circle cx="60" cy="38" r="8.5" fill="#FFE58F"/><g fill="#5B3A1E"><circle cx="57" cy="36" r="1.4"/><circle cx="63" cy="35" r="1.4"/><circle cx="60" cy="41" r="1.4"/><circle cx="56" cy="41" r="1.2"/><circle cx="64" cy="41" r="1.2"/></g>`,
    pipoca:   `<g fill="#FFF3CF" stroke="#E0B25A" stroke-width="1.2"><circle cx="50" cy="40" r="5.5"/><circle cx="60" cy="34" r="6.5"/><circle cx="70" cy="39" r="5.5"/><circle cx="62" cy="43" r="4.5"/></g>`,
  };
  return f[tipo] || "";
}

/* Copo de milkshake: vidro, milkshake em degradê, calda, chantilly, canudo e enfeite */
function desenharCopo(s) {
  const id = "c" + (++uid);
  const vidro = "M24 72h72l-8 118q-1 8-9 8H41q-8 0-9-8z";
  return `
  <svg viewBox="0 0 120 210" role="img" aria-label="Copo de milkshake sabor ${s.nome}">
    <defs>
      <linearGradient id="${id}a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${s.cor}"/><stop offset="1" stop-color="${s.cor2}"/></linearGradient>
      <linearGradient id="${id}b" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".6"/><stop offset=".28" stop-color="#fff" stop-opacity=".04"/><stop offset=".78" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".2"/></linearGradient>
      <radialGradient id="${id}c" cx=".4" cy=".25" r=".8"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#FFE9F0"/></radialGradient>
      <clipPath id="${id}d"><path d="${vidro}"/></clipPath>
    </defs>
    <ellipse cx="60" cy="204" rx="40" ry="5.5" fill="#000" opacity=".13"/>
    <g transform="rotate(11 72 60)"><rect x="66" y="-4" width="9" height="104" rx="4.5" fill="#fff"/>
      <path d="M66 8l9-4M66 22l9-4M66 36l9-4M66 50l9-4M66 64l9-4M66 78l9-4" stroke="${s.cor2}" stroke-width="3.4"/></g>
    <g clip-path="url(#${id}d)">
      ${s.metade
        ? `<rect y="66" width="60" height="140" fill="${s.cor}"/><rect x="60" y="66" width="60" height="140" fill="${s.cor2}"/><rect x="58.5" y="66" width="3" height="140" fill="#fff" opacity=".7"/>`
        : `<rect y="66" width="120" height="140" fill="url(#${id}a)"/>`}
      <path d="M18 116c22 16 54-14 84 2v20c-30-16-62 14-84-2z" fill="${s.topo}" opacity=".28"/>
      <path d="M24 74h72v9q-5 16-10 2t-9 8-9-6-9 11-9-9-8 7-8-12z" fill="${s.topo}"/>
      <g fill="#fff" opacity=".28"><circle cx="46" cy="152" r="3"/><circle cx="70" cy="140" r="2"/><circle cx="62" cy="170" r="3.4"/><circle cx="78" cy="160" r="1.8"/></g>
    </g>
    <path d="${vidro}" fill="url(#${id}b)"/>
    <path d="${vidro}" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="1.6"/>
    <path d="M34 84l5 98" stroke="#fff" stroke-width="4.5" stroke-linecap="round" opacity=".5"/>
    <path d="M30 64c-7-16 9-24 19-17 3-15 27-15 30 0 13-7 26 4 19 17z" fill="url(#${id}c)"/>
    <path d="M42 47c3-14 33-14 36 0-7-6-29-6-36 0z" fill="#fff"/>
    <path d="M36 62q12 7 24 0t24 0" stroke="${s.topo}" stroke-width="3.2" fill="none" stroke-linecap="round" opacity=".85"/>
    ${desenharEnfeite(s.enfeite)}
  </svg>`;
}

/* Casquinha com N bolas do sabor f (waffle, calda escorrendo, brilho e granulados).
   O desenho usa sempre a altura de 3 bolas, assim todos ficam na mesma escala. */
function desenharSorvete(n, f) {
  const id = "s" + (++uid), topoCone = 44 + (n - 1) * 46, H = topoCone + 100, HMAX = 44 + 2 * 46 + 100;
  let bolas = "";
  for (let i = 0; i < n; i++) {
    const y = topoCone - 6 - i * 46;
    bolas += `<circle cx="60" cy="${y}" r="35" fill="url(#${id}b)"/>
      <path d="M26 ${y + 8}c5 10 9 4 13 12s9 0 13 9 9-3 13 5 9-9 14-7 9-6 14-16c-6 18-20 28-34 28s-30-14-33-31z" fill="${f.c[2]}" opacity=".45"/>
      <ellipse cx="45" cy="${y - 14}" rx="9" ry="5" fill="#fff" opacity=".42" transform="rotate(-25 45 ${y - 14})"/>
      <rect x="62" y="${y - 20}" width="3" height="8" rx="1.5" fill="#FFE49A" transform="rotate(30 62 ${y - 20})"/>
      <rect x="74" y="${y - 6}" width="3" height="8" rx="1.5" fill="#F7A6C2" transform="rotate(-40 74 ${y - 6})"/>`;
  }
  return `<svg viewBox="0 0 120 ${HMAX}" role="img" aria-label="Sorvete de ${f.nome} com ${n} bola${n > 1 ? "s" : ""} na casquinha"><g transform="translate(0 ${HMAX - H})">
    <defs>
      <radialGradient id="${id}b" cx=".38" cy=".3" r=".85"><stop offset="0" stop-color="${f.c[0]}"/><stop offset=".6" stop-color="${f.c[1]}"/><stop offset="1" stop-color="${f.c[2]}"/></radialGradient>
      <linearGradient id="${id}c" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#F2C984"/><stop offset=".6" stop-color="#E0A752"/><stop offset="1" stop-color="#C98B3A"/></linearGradient>
      <clipPath id="${id}d"><path d="M26 ${topoCone}h68L60 ${H - 4}z"/></clipPath>
    </defs>
    <ellipse cx="60" cy="${H - 2}" rx="12" ry="3" fill="#000" opacity=".12"/>
    <path d="M26 ${topoCone}h68L60 ${H - 4}z" fill="url(#${id}c)"/>
    <g clip-path="url(#${id}d)" stroke="#B87A2B" stroke-width="1.6" opacity=".8" fill="none">
      <path d="M20 ${topoCone + 10}l90 70M20 ${topoCone + 38}l90 70M20 ${topoCone + 66}l60 46M110 ${topoCone + 10}l-90 70M110 ${topoCone + 38}l-90 70M110 ${topoCone + 66}l-60 46"/></g>
    <rect x="24" y="${topoCone - 3}" width="72" height="9" rx="4.5" fill="#E9B766"/>
    ${bolas}
  </g></svg>`;
}

