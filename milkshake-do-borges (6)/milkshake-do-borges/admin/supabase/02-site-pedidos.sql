-- =====================================================================
-- Milkshake do Borges - pedidos do site + custo por venda
-- Rode no SQL Editor do Supabase DEPOIS de schema.sql e seed.sql.
-- É seguro rodar mais de uma vez (usa "if not exists" / "or replace").
--
-- O que este arquivo faz:
--  1) cria loja, sabor_milkshake, complemento, combo, combo_item e pedido;
--  2) acrescenta colunas de custo e de origem em venda / item_venda / movimentacao_estoque;
--  3) cria a função criar_pedido_site(): o site chama ela e o BANCO calcula preços,
--     baixa o estoque e grava o custo de tudo o que foi gasto em cada venda;
--  4) libera só a LEITURA do catálogo para o site (custos e estoque continuam privados);
--  5) estorna o estoque quando um pedido é marcado como "cancelado".
--
-- IDs: o dashboard gera ids com "maior id + 1". Para os dois nunca colidirem, tudo que o
-- site cria usa uma sequência que começa em 1.000.000.000 (o dashboard ignora essa faixa).
-- =====================================================================

create sequence if not exists public.seq_site_id start 1000000000;
create sequence if not exists public.seq_pedido_numero start 1001;

-- ---------------------------------------------------------------------
-- 1) Tabelas novas
-- ---------------------------------------------------------------------
create table if not exists public.loja (
  id bigint primary key,
  nome text not null,
  cidade text,
  endereco text,
  telefone text,
  lat numeric,
  lng numeric,
  horarios text,                       -- JSON: [[abre,fecha] ou null] de domingo (0) a sábado (6)
  ativo boolean default true
);

create table if not exists public.sabor_milkshake (
  id bigint primary key,
  id_produto bigint references public.produto(id),
  nome text not null,
  slug text,
  tema text,
  descricao text,
  ingredientes text,
  selo text,
  destaque boolean default false,
  ordem numeric,
  ativo boolean default true
);

-- Adicionais vendidos à parte (chantilly extra etc). O custo fica no item_estoque ligado.
create table if not exists public.complemento (
  id bigint primary key,
  id_item_estoque bigint references public.item_estoque(id),
  nome text not null,
  slug text,
  preco_venda numeric not null default 0,
  quantidade_uso numeric default 1,    -- quanto do estoque cada porção consome
  unidade text,
  ativo boolean default true
);

create table if not exists public.combo (
  id bigint primary key,
  nome text not null,
  slug text,
  descricao text,
  preco_venda numeric not null,
  ativo boolean default true
);

create table if not exists public.combo_item (
  id bigint primary key,
  id_combo bigint references public.combo(id),
  tipo text check (tipo in ('milkshake','sorvete')),
  volume_ml numeric,                   -- para tipo milkshake
  qtd_bolas numeric,                   -- para tipo sorvete
  quantidade numeric default 1
);

create table if not exists public.pedido (
  id bigint primary key,
  numero bigint unique,
  codigo text,
  id_venda bigint references public.venda(id),
  id_loja bigint references public.loja(id),
  cliente_nome text,
  cliente_telefone text,
  retirada_tipo text check (retirada_tipo in ('agora','agendar')),
  retirada_prevista timestamp,
  status text default 'recebido' check (status in ('recebido','preparando','pronto','retirado','cancelado')),
  observacao text,
  criado_em timestamp,
  atualizado_em timestamp
);

-- ---------------------------------------------------------------------
-- 2) Colunas novas nas tabelas que já existem
-- ---------------------------------------------------------------------
alter table public.produto        add column if not exists slug text;
alter table public.sabor_sorvete  add column if not exists slug text;
alter table public.sabor_sorvete  add column if not exists ordem numeric;

alter table public.venda add column if not exists id_loja bigint references public.loja(id);
alter table public.venda add column if not exists origem text default 'balcao';
alter table public.venda add column if not exists status text default 'concluida';
alter table public.venda add column if not exists custo_total numeric default 0;   -- tudo que foi gasto nesta venda

alter table public.item_venda add column if not exists id_sabor_milkshake bigint references public.sabor_milkshake(id);
alter table public.item_venda add column if not exists id_combo bigint references public.combo(id);
alter table public.item_venda add column if not exists custo_total numeric default 0;

alter table public.movimentacao_estoque add column if not exists id_item_venda bigint;  -- de qual item da venda saiu

-- Usuário "do sistema" que assina as vendas feitas pelo site (não consegue fazer login)
insert into public.usuario (id, nome, login, senha_hash, perfil, ativo)
values (1000000000, 'Pedido online (site)', 'site@pedido.online', '-', 'operador', false)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- 3) Baixa de estoque com custo (usada só pela função do pedido)
-- ---------------------------------------------------------------------
create or replace function public.baixar_estoque_venda(
  p_item_estoque bigint, p_qtd numeric, p_venda bigint, p_item_venda bigint, p_agora timestamp, p_obs text
) returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_custo numeric;
begin
  if p_item_estoque is null or p_qtd is null or p_qtd <= 0 then
    return 0;
  end if;

  select coalesce(custo_unitario_medio, 0) into v_custo
    from public.item_estoque where id = p_item_estoque;

  update public.estoque_atual
     set quantidade_disponivel = round(coalesce(quantidade_disponivel, 0) - p_qtd, 3),
         data_atualizacao = p_agora
   where id_item_estoque = p_item_estoque;

  if not found then
    insert into public.estoque_atual (id, id_item_estoque, quantidade_disponivel, data_atualizacao)
    values (nextval('public.seq_site_id'), p_item_estoque, -p_qtd, p_agora);
  end if;

  insert into public.movimentacao_estoque
    (id, id_item_estoque, id_usuario, data_hora, tipo_movimentacao, quantidade, custo_unitario,
     referencia_tipo, referencia_id, id_item_venda, observacao)
  values
    (nextval('public.seq_site_id'), p_item_estoque, 1000000000, p_agora, 'saida', p_qtd, coalesce(v_custo, 0),
     'venda', p_venda, p_item_venda, p_obs);

  return round(p_qtd * coalesce(v_custo, 0), 4);
end
$$;

revoke all on function public.baixar_estoque_venda(bigint, numeric, bigint, bigint, timestamp, text) from public;

-- ---------------------------------------------------------------------
-- 4) criar_pedido_site(payload): cria venda, itens, personalizações, pagamento,
--    baixa de estoque, custo e o pedido de retirada. Os PREÇOS vêm do banco,
--    nunca do navegador.
--
-- payload esperado:
-- { "cliente": {"nome": "...", "telefone": "..."},
--   "id_loja": 1,
--   "retirada": {"tipo": "agora" | "agendar", "previsto": "2026-11-04T21:30:00Z"},
--   "pagamento": {"id_forma_pagamento": 4, "troco_para": 50},
--   "observacao": "...",
--   "itens": [
--     {"tipo": "milkshake", "id_tamanho": 2, "id_sabor_milkshake": 3, "quantidade": 1, "observacao": "",
--      "adicionais": [1, 3]},
--     {"tipo": "sorvete", "id_porcao": 5, "embalagem": "Casquinha", "quantidade": 2, "adicionais": [],
--      "grupo": "g1", "id_combo": 2}          -- grupo/id_combo só quando o item faz parte de um combo
--   ] }
-- ---------------------------------------------------------------------
create or replace function public.criar_pedido_site(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c_usuario constant bigint := 1000000000;
  c_letras  constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_agora   timestamp := (now() at time zone 'America/Sao_Paulo');
  v_nome text; v_tel text; v_tipo_ret text; v_previsto timestamp;
  v_loja public.loja%rowtype;
  v_forma public.forma_pagamento%rowtype;
  v_venda bigint; v_pedido bigint; v_numero bigint; v_codigo text;
  it jsonb; ad_id bigint;
  v_tipo text; v_qtd int; v_base numeric; v_extras numeric; v_unit numeric; v_valor numeric;
  v_item bigint; v_prod bigint; v_id_tam bigint; v_id_sab bigint; v_id_por bigint;
  v_tam public.tamanho_milkshake%rowtype;
  v_sm public.sabor_milkshake%rowtype;
  v_por public.porcao_sorvete%rowtype;
  v_ss public.sabor_sorvete%rowtype;
  v_comp public.complemento%rowtype;
  v_sorvete_id bigint; v_emb_id bigint; v_emb_nome text;
  v_custo_item numeric; v_custo_total numeric := 0;
  v_subtotal numeric := 0; v_desconto numeric := 0; v_total numeric; v_troco numeric := 0;
  v_sig text; v_grupo text; v_id_combo bigint;
  grupos jsonb := '{}'::jsonb;
  g text; v_combo public.combo%rowtype; v_esperado text[]; v_recebido text[];
  comp record;
begin
  -- ----- validações básicas -----
  v_nome := left(trim(coalesce(payload #>> '{cliente,nome}', '')), 80);
  v_tel  := left(regexp_replace(coalesce(payload #>> '{cliente,telefone}', ''), '[^0-9()+ -]', '', 'g'), 20);
  if char_length(v_nome) < 2 then raise exception 'Informe o nome do cliente.'; end if;
  if char_length(regexp_replace(v_tel, '[^0-9]', '', 'g')) < 10 then raise exception 'Informe um celular com DDD.'; end if;

  if jsonb_typeof(payload -> 'itens') is distinct from 'array'
     or jsonb_array_length(payload -> 'itens') not between 1 and 30 then
    raise exception 'O pedido precisa ter entre 1 e 30 itens.';
  end if;

  select * into v_loja from public.loja where id = (payload ->> 'id_loja')::bigint and coalesce(ativo, true);
  if not found then raise exception 'Loja de retirada inválida.'; end if;

  select * into v_forma from public.forma_pagamento
   where id = (payload #>> '{pagamento,id_forma_pagamento}')::bigint and coalesce(ativo, true);
  if not found then raise exception 'Forma de pagamento inválida.'; end if;

  v_tipo_ret := case when payload #>> '{retirada,tipo}' = 'agendar' then 'agendar' else 'agora' end;
  begin
    v_previsto := ((payload #>> '{retirada,previsto}')::timestamptz at time zone 'America/Sao_Paulo');
  exception when others then
    v_previsto := v_agora + interval '18 minutes';
  end;
  if v_previsto is null then v_previsto := v_agora + interval '18 minutes'; end if;

  v_venda  := nextval('public.seq_site_id');
  v_pedido := nextval('public.seq_site_id');
  v_numero := nextval('public.seq_pedido_numero');
  v_codigo := 'BRG-' || substr(c_letras, 1 + floor(random() * 32)::int, 1)
                     || substr(c_letras, 1 + floor(random() * 32)::int, 1)
                     || substr(c_letras, 1 + floor(random() * 32)::int, 1);

  insert into public.venda (id, id_usuario, id_loja, origem, status, data_venda, desconto_total, valor_total, custo_total)
  values (v_venda, c_usuario, v_loja.id, 'site', 'concluida', v_agora, 0, 0, 0);

  select id into v_sorvete_id from public.item_estoque
   where coalesce(ativo, true) and nome ilike '%sorvete%' order by id limit 1;

  -- ----- itens -----
  for it in select * from jsonb_array_elements(payload -> 'itens') loop
    v_tipo := it ->> 'tipo';
    v_qtd  := least(greatest(coalesce((it ->> 'quantidade')::int, 1), 1), 20);
    v_extras := 0; v_emb_id := null; v_emb_nome := null; v_id_sab := null; v_id_tam := null; v_id_por := null;

    if v_tipo = 'milkshake' then
      select * into v_tam from public.tamanho_milkshake where id = (it ->> 'id_tamanho')::bigint;
      if not found then raise exception 'Tamanho de milkshake inválido.'; end if;
      select * into v_sm from public.sabor_milkshake
       where id = (it ->> 'id_sabor_milkshake')::bigint and coalesce(ativo, true);
      if not found then raise exception 'Sabor de milkshake inválido ou indisponível.'; end if;
      v_prod := v_tam.id_produto; v_id_tam := v_tam.id; v_id_sab := v_sm.id; v_base := v_tam.preco_venda;
      v_sig := 'milkshake:' || trim_scale(v_tam.volume_ml)::text;

    elsif v_tipo = 'sorvete' then
      select * into v_por from public.porcao_sorvete where id = (it ->> 'id_porcao')::bigint;
      if not found then raise exception 'Porção de sorvete inválida.'; end if;
      select * into v_ss from public.sabor_sorvete where id = v_por.id_sabor and coalesce(ativo, true);
      if not found then raise exception 'Sabor de sorvete indisponível.'; end if;
      v_prod := v_ss.id_produto; v_id_por := v_por.id; v_base := v_por.preco_venda;
      v_sig := 'sorvete:' || trim_scale(v_por.qtd_bolas)::text;
      v_emb_nome := nullif(trim(coalesce(it ->> 'embalagem', '')), '');
      if v_emb_nome is not null then
        select id into v_emb_id from public.item_estoque
         where tipo = 'embalagem' and coalesce(ativo, true) and lower(nome) = lower(v_emb_nome) limit 1;
      end if;
    else
      raise exception 'Tipo de item inválido.';
    end if;

    -- adicionais: preço vem da tabela complemento
    for ad_id in select (x)::bigint from jsonb_array_elements_text(coalesce(it -> 'adicionais', '[]'::jsonb)) x loop
      select * into v_comp from public.complemento where id = ad_id and coalesce(ativo, true);
      if not found then raise exception 'Adicional indisponível.'; end if;
      v_extras := v_extras + v_comp.preco_venda;
    end loop;

    v_unit  := v_base + v_extras;
    v_valor := round(v_unit * v_qtd, 2);
    v_subtotal := v_subtotal + v_valor;
    v_item := nextval('public.seq_site_id');
    v_id_combo := nullif(it ->> 'id_combo', '')::bigint;
    v_grupo := nullif(it ->> 'grupo', '');

    insert into public.item_venda
      (id, id_venda, id_produto, id_tamanho, id_sabor_milkshake, id_porcao, id_combo,
       quantidade, preco_unitario, valor_total, custo_total, observacao)
    values
      (v_item, v_venda, v_prod, v_id_tam, v_id_sab, v_id_por, case when v_grupo is null then null else v_id_combo end,
       v_qtd, v_unit, v_valor, 0, left(coalesce(it ->> 'observacao', ''), 120));

    -- ----- tudo que foi gasto neste item -----
    v_custo_item := 0;
    if v_tipo = 'milkshake' then
      for comp in select id_item_estoque, quantidade from public.composicao_milkshake where id_tamanho = v_tam.id loop
        v_custo_item := v_custo_item + public.baixar_estoque_venda(comp.id_item_estoque, comp.quantidade * v_qtd,
                          v_venda, v_item, v_agora, 'Pedido online #' || v_numero);
      end loop;
    else
      v_custo_item := v_custo_item + public.baixar_estoque_venda(v_sorvete_id,
                        v_por.qtd_bolas * coalesce(v_ss.peso_por_bola_g, 60) * v_qtd, v_venda, v_item, v_agora, 'Pedido online #' || v_numero);
      if v_emb_id is not null then
        v_custo_item := v_custo_item + public.baixar_estoque_venda(v_emb_id, v_qtd, v_venda, v_item, v_agora, 'Pedido online #' || v_numero);
        insert into public.personalizacao (id, id_item_venda, id_item_estoque, tipo, quantidade, unidade, valor_adicional)
        values (nextval('public.seq_site_id'), v_item, v_emb_id, 'complemento', v_qtd, 'unidade', 0);
      end if;
    end if;

    for ad_id in select (x)::bigint from jsonb_array_elements_text(coalesce(it -> 'adicionais', '[]'::jsonb)) x loop
      select * into v_comp from public.complemento where id = ad_id;
      v_custo_item := v_custo_item + public.baixar_estoque_venda(v_comp.id_item_estoque,
                        coalesce(v_comp.quantidade_uso, 1) * v_qtd, v_venda, v_item, v_agora, 'Pedido online #' || v_numero);
      insert into public.personalizacao (id, id_item_venda, id_item_estoque, tipo, quantidade, unidade, valor_adicional)
      values (nextval('public.seq_site_id'), v_item, v_comp.id_item_estoque, 'complemento',
              coalesce(v_comp.quantidade_uso, 1) * v_qtd, v_comp.unidade, v_comp.preco_venda);
    end loop;

    update public.item_venda set custo_total = v_custo_item where id = v_item;
    v_custo_total := v_custo_total + v_custo_item;

    -- anota o item no grupo do combo (para conferir o combo depois)
    if v_grupo is not null then
      grupos := jsonb_set(grupos, array[v_grupo], jsonb_build_object(
                  'id_combo', v_id_combo,
                  'qtd', v_qtd,
                  'total', coalesce((grupos -> v_grupo ->> 'total')::numeric, 0) + v_valor,
                  'sigs', coalesce(grupos -> v_grupo -> 'sigs', '[]'::jsonb) || to_jsonb(v_sig)), true);
    end if;
  end loop;

  -- ----- combos: confere a composição e calcula o desconto pelo preço do combo -----
  for g in select jsonb_object_keys(grupos) loop
    select * into v_combo from public.combo
     where id = (grupos -> g ->> 'id_combo')::bigint and coalesce(ativo, true);
    if not found then raise exception 'Combo indisponível.'; end if;

    select coalesce(array_agg(s order by s), '{}') into v_esperado from (
      select ci.tipo || ':' || trim_scale(coalesce(ci.volume_ml, ci.qtd_bolas))::text as s
        from public.combo_item ci, generate_series(1, greatest(ci.quantidade, 1)::int)
       where ci.id_combo = v_combo.id) t;
    select coalesce(array_agg(x order by x), '{}') into v_recebido
      from jsonb_array_elements_text(grupos -> g -> 'sigs') x;
    if v_esperado is distinct from v_recebido then raise exception 'Os itens do combo "%" não conferem.', v_combo.nome; end if;

    v_desconto := v_desconto + greatest((grupos -> g ->> 'total')::numeric - v_combo.preco_venda * (grupos -> g ->> 'qtd')::int, 0);
  end loop;

  v_total := round(v_subtotal - v_desconto, 2);
  if v_forma.nome = 'dinheiro' then
    v_troco := greatest(coalesce(nullif(payload #>> '{pagamento,troco_para}', '')::numeric, 0) - v_total, 0);
  end if;

  update public.venda
     set desconto_total = round(v_desconto, 2), valor_total = v_total, custo_total = round(v_custo_total, 2)
   where id = v_venda;

  insert into public.pagamento (id, id_venda, id_forma_pagamento, valor, troco, observacao)
  values (nextval('public.seq_site_id'), v_venda, v_forma.id, v_total, round(v_troco, 2), 'A pagar na retirada (pedido do site)');

  insert into public.pedido
    (id, numero, codigo, id_venda, id_loja, cliente_nome, cliente_telefone, retirada_tipo, retirada_prevista,
     status, observacao, criado_em, atualizado_em)
  values
    (v_pedido, v_numero, v_codigo, v_venda, v_loja.id, v_nome, v_tel, v_tipo_ret, v_previsto,
     'recebido', left(coalesce(payload ->> 'observacao', ''), 200), v_agora, v_agora);

  -- ----- alertas de estoque (mesma regra do dashboard) -----
  update public.alerta_estoque a
     set quantidade_atual = e.quantidade_disponivel
    from public.estoque_atual e
   where a.id_item_estoque = e.id_item_estoque and a.status = 'pendente';

  insert into public.alerta_estoque (id, id_item_estoque, data_alerta, quantidade_atual, limite_configurado, status)
  select nextval('public.seq_site_id'), i.id, v_agora::date, e.quantidade_disponivel, i.estoque_minimo, 'pendente'
    from public.item_estoque i
    join public.estoque_atual e on e.id_item_estoque = i.id
   where coalesce(i.ativo, true)
     and e.quantidade_disponivel <= coalesce(i.estoque_minimo, 0)
     and not exists (select 1 from public.alerta_estoque a where a.id_item_estoque = i.id and a.status = 'pendente');

  return jsonb_build_object('ok', true, 'id', v_pedido, 'numero', v_numero, 'codigo', v_codigo,
                            'id_venda', v_venda, 'total', v_total, 'desconto', round(v_desconto, 2),
                            'status', 'recebido', 'criado_em', v_agora);
end
$$;

revoke all on function public.criar_pedido_site(jsonb) from public;
grant execute on function public.criar_pedido_site(jsonb) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 5) Acompanhar o pedido no site (só com número + código de retirada)
-- ---------------------------------------------------------------------
create or replace function public.consultar_pedido_site(p_numero bigint, p_codigo text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object('numero', p.numero, 'status', p.status, 'retirada_prevista', p.retirada_prevista,
                            'loja', l.nome, 'atualizado_em', p.atualizado_em)
    from public.pedido p
    left join public.loja l on l.id = p.id_loja
   where p.numero = p_numero and upper(p.codigo) = upper(coalesce(p_codigo, ''))
$$;

revoke all on function public.consultar_pedido_site(bigint, text) from public;
grant execute on function public.consultar_pedido_site(bigint, text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 6) Pedido cancelado: devolve o estoque e marca a venda como cancelada
-- ---------------------------------------------------------------------
create or replace function public.pedido_status_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  m record;
  v_agora timestamp := (now() at time zone 'America/Sao_Paulo');
begin
  new.atualizado_em := v_agora;

  if new.status = 'cancelado' and old.status is distinct from 'cancelado' and new.id_venda is not null then
    for m in select * from public.movimentacao_estoque
              where referencia_tipo = 'venda' and referencia_id = new.id_venda and tipo_movimentacao = 'saida' loop
      update public.estoque_atual
         set quantidade_disponivel = round(coalesce(quantidade_disponivel, 0) + m.quantidade, 3), data_atualizacao = v_agora
       where id_item_estoque = m.id_item_estoque;

      insert into public.movimentacao_estoque
        (id, id_item_estoque, id_usuario, data_hora, tipo_movimentacao, quantidade, custo_unitario,
         referencia_tipo, referencia_id, id_item_venda, observacao)
      values
        (nextval('public.seq_site_id'), m.id_item_estoque, m.id_usuario, v_agora, 'entrada', m.quantidade, m.custo_unitario,
         'ajuste', new.id_venda, m.id_item_venda, 'Estorno do pedido #' || new.numero);
    end loop;

    update public.venda set status = 'cancelada' where id = new.id_venda;
  end if;

  return new;
end
$$;

drop trigger if exists trg_pedido_status on public.pedido;
create trigger trg_pedido_status before update on public.pedido
  for each row execute function public.pedido_status_trigger();

-- ---------------------------------------------------------------------
-- 7) Segurança (RLS): dashboard (login) acessa tudo; o site (anon) só LÊ o catálogo
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['loja','sabor_milkshake','complemento','combo','combo_item','pedido'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', 'auth_all_' || t, t);
    execute format('create policy %I on public.%I for all to authenticated using (true) with check (true)', 'auth_all_' || t, t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;

  foreach t in array array['produto','tamanho_milkshake','sabor_milkshake','sabor_sorvete','porcao_sorvete',
                           'complemento','combo','combo_item','forma_pagamento','loja'] loop
    execute format('drop policy if exists %I on public.%I', 'site_le_' || t, t);
    execute format('create policy %I on public.%I for select to anon using (true)', 'site_le_' || t, t);
    execute format('grant select on public.%I to anon', t);
  end loop;
end
$$;

-- Custo das vendas antigas (calculado das movimentações; vendas feitas sem custo continuam 0)
update public.venda v
   set custo_total = coalesce((select sum(m.quantidade * coalesce(m.custo_unitario, 0))
                                 from public.movimentacao_estoque m
                                where m.referencia_tipo = 'venda' and m.referencia_id = v.id
                                  and m.tipo_movimentacao = 'saida'), 0)
 where coalesce(v.custo_total, 0) = 0;

-- Avisa a API do Supabase para reconhecer as tabelas novas (evita o erro "schema cache")
notify pgrst, 'reload schema';
