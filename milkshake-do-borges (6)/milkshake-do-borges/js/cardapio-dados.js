/* =========================================================
   Milkshake do Borges - dados do cardápio
   Estrutura pensada para ser trocada depois por dados do dashboard:
   TAMANHOS/BOLAS/EMBALAGENS/FORMAS_PAGAMENTO espelham as tabelas dele.
   ========================================================= */
/* ---------- DADOS DO CARDÁPIO ----------
   Os preços de milkshake e sorvete são os do dashboard (tamanho_milkshake e porcao_sorvete).
   Para adicionar um sabor, copie um bloco e mude os campos.
   cor/cor2 = cores do milkshake | topo = calda | enfeite = decoração do copo
   slug = nome do arquivo de foto opcional (assets/img/cardapio/<slug>.jpg)
   buscas = termos usados, em ordem, para procurar uma foto (Unsplash, se houver chave, ou Wikimedia Commons)
   fotoFixa = (opcional) arquivo específico do Wikimedia Commons */
const SABORES = [
  { slug: "borgesshake", especial: true, selo: "Especial da casa", imagem: "assets/img/logo-completa.png",
    nome: "BorgesShake", tema: "Leite direto do Borges", tags: ["Leite fresco", "Doce de leite", "Edição do Borges"],
    cor: "#F8B9D0", cor2: "#8FD9B6", topo: "#E8558E", enfeite: "cereja",
    desc: "O campeão da casa: leite fresquinho tirado de manhã cedo na fazenda do Borges, sorvete de creme, calda de doce de leite e chantilly de verdade.",
    ing: "Sorvete de creme, leite fresco da fazenda do Borges, doce de leite e chantilly" },
  { slug: "delacao-premiada", selo: "Novo", nome: "Delação Premiada", tema: "Entrega tudo no final", tags: ["Cremoso", "Avelã", "Recheio surpresa"],
    cor: "#CDA283", cor2: "#7B4B35", topo: "#4A2A1C", enfeite: "avela",
    buscas: ["hazelnut chocolate milkshake", "chocolate milkshake"],
    desc: "Um recheio de doce de leite que só entrega tudo no último gole. Ninho com avelã.",
    ing: "Sorvete de leite Ninho, leite, creme de avelã, doce de leite e chantilly" },
  { slug: "fake-news-de-baunilha", selo: "Mais pedido", nome: "Fake News de Baunilha", tema: "Todo mundo jura que é morango", tags: ["Baunilha", "Frutas vermelhas", "Plot twist"],
    cor: "#FBD3DF", cor2: "#F28DB0", topo: "#E0457B", enfeite: "morango",
    buscas: ["vanilla milkshake strawberry sauce", "vanilla milkshake"],
    fotoFixa: { arquivo: "Strawberry_milk_shake_(cropped).jpg" },
    desc: "Parece morango e foi repassado como morango, mas é baunilha com calda de frutas vermelhas. Confira antes de compartilhar.",
    ing: "Sorvete de baunilha, leite e calda de frutas vermelhas" },
  { slug: "foro-privilegiado", nome: "Foro Privilegiado", tema: "Só para poucos", tags: ["Premium", "Pistache", "Chocolate branco"],
    cor: "#D5EDB0", cor2: "#93C45F", topo: "#F5E6C4", enfeite: "pistache",
    buscas: ["pistachio ice cream", "pistachio milkshake"],
    desc: "Sabor de acesso restrito: pistache de verdade com chocolate branco e muita elegância.",
    ing: "Sorvete de pistache, leite, calda de chocolate branco e pistache triturado" },
  { slug: "polarizado", nome: "Polarizado", tema: "Dois lados que não se misturam", tags: ["Morango", "Mirtilo", "Meio a meio"], metade: true,
    cor: "#F9B4CB", cor2: "#8FA3F2", topo: "#6B7FDB", enfeite: "polarizado",
    buscas: ["blueberry strawberry milkshake", "blueberry milkshake"],
    desc: "Morango de um lado, mirtilo do outro, e nenhum dos dois cede. Só se encontram no canudo.",
    ing: "Sorvete de morango, sorvete de mirtilo, leite e chantilly" },
  { slug: "segundo-turno", nome: "Segundo Turno", tema: "Rodada decisiva", tags: ["Cítrico", "Cremoso", "Dois sabores"],
    cor: "#FFE58F", cor2: "#F5B93E", topo: "#7BC79B", enfeite: "maracuja",
    buscas: ["passion fruit milkshake", "passion fruit ice cream"],
    desc: "Maracujá e pistache disputando o mesmo copo. Quem leva? Você decide no último gole.",
    ing: "Sorvete de creme, leite, calda de maracujá e calda de pistache" },
  { slug: "pasta-de-dente", selo: "Polêmico", nome: "Pasta de Dente", tema: "A polêmica que divide a mesa", tags: ["Refrescante", "Polêmico", "Crocante"],
    cor: "#BDEBD3", cor2: "#5BBE92", topo: "#4E2C1F", enfeite: "menta",
    buscas: ["mint chocolate chip ice cream", "mint milkshake"],
    desc: "Menta com chocolate: pasta de dente ou obra-prima? Prove e tome a sua posição.",
    ing: "Sorvete de menta, leite e gotas de chocolate" },
];

/* Tamanhos e preços (os mesmos do dashboard) */
const TAMANHOS = [
  { id: 1, ml: 300, preco: 15 }, { id: 2, ml: 500, preco: 17 }, { id: 3, ml: 700, preco: 21 },
];

/* Sorvete em bolas (preços do dashboard; embalagens: casquinha e cascão) */
const BOLAS = [
  { id: 1, n: 1, preco: 6 }, { id: 2, n: 2, preco: 10 }, { id: 3, n: 3, preco: 15 },
];

/* Sabores de sorvete. c = [cor clara, cor média, cor escura] da bola | buscas = termos para achar uma foto */
const SORVETES = [
  { slug: "sorvete-chocolate", nome: "Chocolate", desc: "Cremoso e intenso, o clássico da casa.", c: ["#B27A5C", "#7A4733", "#4A2519"], buscas: ["chocolate ice cream scoop", "chocolate ice cream"] },
  { slug: "sorvete-baunilha", nome: "Baunilha", desc: "Suave e cremoso, combina com qualquer calda.", c: ["#FFF3CF", "#F3DDA0", "#D9B96A"], buscas: ["vanilla ice cream scoop", "vanilla ice cream"] },
  { slug: "sorvete-morango", nome: "Morango", desc: "Doce e fresquinho, com sabor de fruta de verdade.", c: ["#FFC2D4", "#F28DB0", "#D95A8A"], buscas: ["strawberry ice cream scoop", "strawberry ice cream"] },
  { slug: "sorvete-pistache", nome: "Pistache", desc: "Verde, elegante e cheio de sabor.", c: ["#D9EDB5", "#A6CF6E", "#7BA84A"], buscas: ["pistachio ice cream scoop", "pistachio ice cream"] },
  { slug: "sorvete-menta", nome: "Menta com chocolate", desc: "Refrescante, com gotinhas de chocolate.", c: ["#C7F0DC", "#7FD2AB", "#4DAE84"], buscas: ["mint chocolate chip ice cream scoop", "mint ice cream"] },
  { slug: "sorvete-doce-de-leite", nome: "Doce de leite", desc: "Caramelo, leite e nenhuma culpa.", c: ["#F2C98A", "#D79A4B", "#A8702B"], buscas: ["dulce de leche ice cream", "caramel ice cream scoop"] },
  { slug: "sorvete-maracuja", nome: "Maracujá", desc: "Azedinho na medida, ótimo para dias quentes.", c: ["#FFE88A", "#F7C640", "#D9A11F"], buscas: ["passion fruit sorbet", "mango sorbet scoop"] },
  { slug: "sorvete-maltado", nome: "Maltado crocante", desc: "Sorvete maltado com pedacinhos crocantes.", c: ["#E9C58E", "#C48C4A", "#8F5E2B"], buscas: ["cookie crunch ice cream", "coffee ice cream scoop"] },
];

/* Embalagens do sorvete (item_estoque "Casquinha" e "Cascão" do dashboard) */
const EMBALAGENS = ["Casquinha", "Cascão"];

/* Adicionais (futuros itens de estoque da categoria "Complemento"). PREÇOS DE EXEMPLO. */
const ADICIONAIS = [
  { id: "chantilly",     nome: "Chantilly extra",      preco: 3 },
  { id: "calda",         nome: "Calda extra",          preco: 2 },
  { id: "granulado",     nome: "Granulados",           preco: 2 },
  { id: "doce-de-leite", nome: "Fio de doce de leite", preco: 3 },
];

/* Combos (ideia para o dashboard; preços de exemplo, sempre menores que a soma dos itens).
   slots: tam = posição em TAMANHOS | bolas = posição em BOLAS */
const COMBOS = [
  { id: "combo-dupla", slug: "combo-dupla", nome: "Dupla Polêmica", tema: "Combo", preco: 31, precoOriginal: 34,
    desc: "Dois milkshakes de 500 ml, cada um de um sabor. Para dividir ou para discordar.",
    ing: "2 milkshakes de 500 ml à sua escolha", slots: [{ tipo: "milkshake", tam: 1 }, { tipo: "milkshake", tam: 1 }] },
  { id: "combo-sobremesa", slug: "combo-sobremesa", nome: "Sobremesa do Borges", tema: "Combo", preco: 19, precoOriginal: 21,
    desc: "Um milkshake de 300 ml e uma bola de sorvete para fechar a refeição.",
    ing: "1 milkshake de 300 ml + 1 bola de sorvete", slots: [{ tipo: "milkshake", tam: 0 }, { tipo: "sorvete", bolas: 0 }] },
  { id: "combo-turma", slug: "combo-turma", nome: "Turma do Borges", tema: "Combo", preco: 59, precoOriginal: 66,
    desc: "Três milkshakes de 500 ml e um sorvete de 3 bolas. Chame a turma.",
    ing: "3 milkshakes de 500 ml + sorvete de 3 bolas", slots: [{ tipo: "milkshake", tam: 1 }, { tipo: "milkshake", tam: 1 }, { tipo: "milkshake", tam: 1 }, { tipo: "sorvete", bolas: 2 }] },
];

/* Formas de pagamento (as mesmas da tabela forma_pagamento do dashboard) */
const FORMAS_PAGAMENTO = [
  { id: 1, chave: "dinheiro",       nome: "Dinheiro" },
  { id: 2, chave: "cartao_debito",  nome: "Cartão de débito" },
  { id: 3, chave: "cartao_credito", nome: "Cartão de crédito" },
  { id: 4, chave: "pix",            nome: "Pix" },
];

