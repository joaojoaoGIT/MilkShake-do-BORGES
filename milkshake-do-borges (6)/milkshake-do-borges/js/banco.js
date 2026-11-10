/* =========================================================
   Milkshake do Borges - ligação do site com o Supabase
   Usa a MESMA chave "publishable" (anon) do dashboard: ela é feita para ficar no navegador.
   O que ela pode fazer é limitado pelas regras (RLS) de admin/supabase/02-site-pedidos.sql:
   o site só LÊ o catálogo e CRIA pedidos pela função criar_pedido_site(). Nunca coloque aqui
   a chave "service_role".
   Sem internet ou sem a biblioteca, o site continua em modo demonstração (pedido só no navegador).
   ========================================================= */
const SUPABASE_URL = 'https://wnzyzenmxxqpbhuvcdxg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_hJ4A0V-Spv8KGCmvrfdFLw_NnZFbuUA';

const Banco = {
  cliente: null,
  ativo: false,                         // vira true quando o catálogo do banco é carregado

  iniciar() {
    if (!window.supabase) return false;
    // persistSession: false -> o site nunca reaproveita o login do painel admin (mesma origem)
    this.cliente = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    return true;
  },

  /* Lê as tabelas públicas do catálogo (com limite de tempo para não travar o site) */
  async carregarCatalogo() {
    if (!this.cliente && !this.iniciar()) throw new Error("Biblioteca do Supabase indisponível.");
    const ler = t => this.cliente.from(t).select("*").then(({ data, error }) => { if (error) throw new Error(t + ": " + error.message); return data; });
    const tabelas = ["sabor_milkshake", "tamanho_milkshake", "sabor_sorvete", "porcao_sorvete", "complemento", "combo", "combo_item", "forma_pagamento", "loja"];
    const limite = new Promise((_, rejeita) => setTimeout(() => rejeita(new Error("O banco demorou para responder.")), 8000));
    const lista = await Promise.race([Promise.all(tabelas.map(ler)), limite]);
    return Object.fromEntries(tabelas.map((t, i) => [t, lista[i]]));
  },

  /* Cria o pedido: o banco confere preços, baixa o estoque e registra o custo da venda */
  async criarPedido(payload) {
    const { data, error } = await this.cliente.rpc("criar_pedido_site", { payload });
    if (error) throw new Error(error.message);
    return data;
  },

  /* Consulta o andamento de um pedido (precisa do número e do código de retirada) */
  async consultarPedido(numero, codigo) {
    const { data, error } = await this.cliente.rpc("consultar_pedido_site", { p_numero: numero, p_codigo: codigo });
    if (error) throw new Error(error.message);
    return data;
  },
};
