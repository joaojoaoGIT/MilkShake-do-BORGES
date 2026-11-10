-- Milkshake Admin: schema para Supabase (gerado de data/schema.json)

create table if not exists public.fornecedor (
  id bigint primary key,
  nome text,
  marca text,
  qualidade text,
  telefone text,
  email text,
  endereco text,
  ativo boolean default true
);

create table if not exists public.compra (
  id bigint primary key,
  id_fornecedor bigint,
  data_compra date,
  valor_total numeric,
  observacao text
);

create table if not exists public.categoria_item (
  id bigint primary key,
  nome text,
  descricao text
);

create table if not exists public.item_estoque (
  id bigint primary key,
  id_categoria bigint,
  nome text,
  tipo text check (tipo in ('ingrediente','embalagem','complemento')),
  unidade_medida text check (unidade_medida in ('unidade','ml','g','kg')),
  custo_unitario_medio numeric,
  estoque_minimo numeric,
  ativo boolean default true
);

create table if not exists public.estoque_atual (
  id bigint primary key,
  id_item_estoque bigint,
  quantidade_disponivel numeric,
  data_atualizacao timestamp
);

create table if not exists public.alerta_estoque (
  id bigint primary key,
  id_item_estoque bigint,
  data_alerta date,
  quantidade_atual numeric,
  limite_configurado numeric,
  status text check (status in ('pendente','resolvido')),
  data_resolucao date
);

create table if not exists public.produto (
  id bigint primary key,
  nome text,
  tipo text check (tipo in ('milkshake','sorvete','outro')),
  personalizavel boolean default true,
  descricao text,
  ativo boolean default true
);

create table if not exists public.tamanho_milkshake (
  id bigint primary key,
  id_produto bigint,
  volume_ml numeric,
  preco_venda numeric,
  ordem numeric
);

create table if not exists public.composicao_milkshake (
  id bigint primary key,
  id_tamanho bigint,
  id_item_estoque bigint,
  quantidade numeric,
  unidade text check (unidade in ('unidade','ml','g'))
);

create table if not exists public.sabor_sorvete (
  id bigint primary key,
  id_produto bigint,
  nome text,
  descricao text,
  peso_por_bola_g numeric,
  ativo boolean default true
);

create table if not exists public.porcao_sorvete (
  id bigint primary key,
  id_sabor bigint,
  qtd_bolas numeric,
  preco_venda numeric,
  ordem numeric
);

create table if not exists public.forma_pagamento (
  id bigint primary key,
  nome text,
  ativo boolean default true
);

create table if not exists public.usuario (
  id bigint primary key,
  nome text,
  login text,
  senha_hash text,
  perfil text check (perfil in ('admin','gerente','operador')),
  ativo boolean default true,
  auth_user_id uuid unique references auth.users(id) on delete set null
);

alter table public.usuario
  add column if not exists auth_user_id uuid unique references auth.users(id) on delete set null;

create table if not exists public.item_compra (
  id bigint primary key,
  id_compra bigint,
  id_item_estoque bigint,
  quantidade numeric,
  preco_unitario numeric,
  desconto numeric,
  valor_total numeric
);

create table if not exists public.movimentacao_estoque (
  id bigint primary key,
  id_item_estoque bigint,
  id_usuario bigint,
  data_hora timestamp,
  tipo_movimentacao text check (tipo_movimentacao in ('entrada','saida','ajuste')),
  quantidade numeric,
  custo_unitario numeric,
  referencia_tipo text check (referencia_tipo in ('compra','venda','perda','ajuste')),
  referencia_id numeric,
  observacao text
);

create table if not exists public.perda_estoque (
  id bigint primary key,
  id_movimentacao bigint,
  motivo text,
  quantidade numeric,
  valor_estimado numeric
);

create table if not exists public.venda (
  id bigint primary key,
  id_usuario bigint,
  data_venda timestamp,
  desconto_total numeric,
  valor_total numeric
);

create table if not exists public.item_venda (
  id bigint primary key,
  id_venda bigint,
  id_produto bigint,
  id_tamanho bigint,
  id_porcao bigint,
  quantidade numeric,
  preco_unitario numeric,
  valor_total numeric,
  observacao text
);

create table if not exists public.personalizacao (
  id bigint primary key,
  id_item_venda bigint,
  id_item_estoque bigint,
  tipo text check (tipo in ('sabor','complemento')),
  quantidade numeric,
  unidade text,
  valor_adicional numeric
);

create table if not exists public.pagamento (
  id bigint primary key,
  id_venda bigint,
  id_forma_pagamento bigint,
  valor numeric,
  troco numeric,
  observacao text
);

-- Chaves estrangeiras (depois, para evitar problemas de ordem)
alter table public.compra add constraint fk_compra_id_fornecedor foreign key (id_fornecedor) references public.fornecedor(id);
alter table public.item_estoque add constraint fk_item_estoque_id_categoria foreign key (id_categoria) references public.categoria_item(id);
alter table public.estoque_atual add constraint fk_estoque_atual_id_item_estoque foreign key (id_item_estoque) references public.item_estoque(id);
alter table public.alerta_estoque add constraint fk_alerta_estoque_id_item_estoque foreign key (id_item_estoque) references public.item_estoque(id);
alter table public.tamanho_milkshake add constraint fk_tamanho_milkshake_id_produto foreign key (id_produto) references public.produto(id);
alter table public.composicao_milkshake add constraint fk_composicao_milkshake_id_tamanho foreign key (id_tamanho) references public.tamanho_milkshake(id);
alter table public.composicao_milkshake add constraint fk_composicao_milkshake_id_item_estoque foreign key (id_item_estoque) references public.item_estoque(id);
alter table public.sabor_sorvete add constraint fk_sabor_sorvete_id_produto foreign key (id_produto) references public.produto(id);
alter table public.porcao_sorvete add constraint fk_porcao_sorvete_id_sabor foreign key (id_sabor) references public.sabor_sorvete(id);
alter table public.item_compra add constraint fk_item_compra_id_compra foreign key (id_compra) references public.compra(id);
alter table public.item_compra add constraint fk_item_compra_id_item_estoque foreign key (id_item_estoque) references public.item_estoque(id);
alter table public.movimentacao_estoque add constraint fk_movimentacao_estoque_id_item_estoque foreign key (id_item_estoque) references public.item_estoque(id);
alter table public.movimentacao_estoque add constraint fk_movimentacao_estoque_id_usuario foreign key (id_usuario) references public.usuario(id);
alter table public.perda_estoque add constraint fk_perda_estoque_id_movimentacao foreign key (id_movimentacao) references public.movimentacao_estoque(id);
alter table public.venda add constraint fk_venda_id_usuario foreign key (id_usuario) references public.usuario(id);
alter table public.item_venda add constraint fk_item_venda_id_venda foreign key (id_venda) references public.venda(id);
alter table public.item_venda add constraint fk_item_venda_id_produto foreign key (id_produto) references public.produto(id);
alter table public.item_venda add constraint fk_item_venda_id_tamanho foreign key (id_tamanho) references public.tamanho_milkshake(id);
alter table public.item_venda add constraint fk_item_venda_id_porcao foreign key (id_porcao) references public.porcao_sorvete(id);
alter table public.personalizacao add constraint fk_personalizacao_id_item_venda foreign key (id_item_venda) references public.item_venda(id);
alter table public.personalizacao add constraint fk_personalizacao_id_item_estoque foreign key (id_item_estoque) references public.item_estoque(id);
alter table public.pagamento add constraint fk_pagamento_id_venda foreign key (id_venda) references public.venda(id);
alter table public.pagamento add constraint fk_pagamento_id_forma_pagamento foreign key (id_forma_pagamento) references public.forma_pagamento(id);

-- RLS: só usuários autenticados acessam
alter table public.fornecedor enable row level security;
create policy "auth_all_fornecedor" on public.fornecedor for all to authenticated using (true) with check (true);
alter table public.compra enable row level security;
create policy "auth_all_compra" on public.compra for all to authenticated using (true) with check (true);
alter table public.categoria_item enable row level security;
create policy "auth_all_categoria_item" on public.categoria_item for all to authenticated using (true) with check (true);
alter table public.item_estoque enable row level security;
create policy "auth_all_item_estoque" on public.item_estoque for all to authenticated using (true) with check (true);
alter table public.estoque_atual enable row level security;
create policy "auth_all_estoque_atual" on public.estoque_atual for all to authenticated using (true) with check (true);
alter table public.alerta_estoque enable row level security;
create policy "auth_all_alerta_estoque" on public.alerta_estoque for all to authenticated using (true) with check (true);
alter table public.produto enable row level security;
create policy "auth_all_produto" on public.produto for all to authenticated using (true) with check (true);
alter table public.tamanho_milkshake enable row level security;
create policy "auth_all_tamanho_milkshake" on public.tamanho_milkshake for all to authenticated using (true) with check (true);
alter table public.composicao_milkshake enable row level security;
create policy "auth_all_composicao_milkshake" on public.composicao_milkshake for all to authenticated using (true) with check (true);
alter table public.sabor_sorvete enable row level security;
create policy "auth_all_sabor_sorvete" on public.sabor_sorvete for all to authenticated using (true) with check (true);
alter table public.porcao_sorvete enable row level security;
create policy "auth_all_porcao_sorvete" on public.porcao_sorvete for all to authenticated using (true) with check (true);
alter table public.forma_pagamento enable row level security;
create policy "auth_all_forma_pagamento" on public.forma_pagamento for all to authenticated using (true) with check (true);
alter table public.usuario enable row level security;
create policy "auth_all_usuario" on public.usuario for all to authenticated using (true) with check (true);
alter table public.item_compra enable row level security;
create policy "auth_all_item_compra" on public.item_compra for all to authenticated using (true) with check (true);
alter table public.movimentacao_estoque enable row level security;
create policy "auth_all_movimentacao_estoque" on public.movimentacao_estoque for all to authenticated using (true) with check (true);
alter table public.perda_estoque enable row level security;
create policy "auth_all_perda_estoque" on public.perda_estoque for all to authenticated using (true) with check (true);
alter table public.venda enable row level security;
create policy "auth_all_venda" on public.venda for all to authenticated using (true) with check (true);
alter table public.item_venda enable row level security;
create policy "auth_all_item_venda" on public.item_venda for all to authenticated using (true) with check (true);
alter table public.personalizacao enable row level security;
create policy "auth_all_personalizacao" on public.personalizacao for all to authenticated using (true) with check (true);
alter table public.pagamento enable row level security;
create policy "auth_all_pagamento" on public.pagamento for all to authenticated using (true) with check (true);
