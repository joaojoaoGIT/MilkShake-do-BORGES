-- Dados iniciais (de data/seed.json). Rode DEPOIS do schema.sql

insert into public.categoria_item (id,nome) values (1,'Sorvete') on conflict (id) do nothing;
insert into public.categoria_item (id,nome) values (2,'Leite') on conflict (id) do nothing;
insert into public.categoria_item (id,nome) values (3,'Embalagem') on conflict (id) do nothing;
insert into public.categoria_item (id,nome) values (4,'Complemento') on conflict (id) do nothing;
insert into public.item_estoque (id,id_categoria,nome,tipo,unidade_medida,custo_unitario_medio,estoque_minimo,ativo) values (1,1,'Sorvete artesanal (caixa 5kg R$190)','ingrediente','g',0.038,1000,true) on conflict (id) do nothing;
insert into public.item_estoque (id,id_categoria,nome,tipo,unidade_medida,custo_unitario_medio,estoque_minimo,ativo) values (2,2,'Leite','ingrediente','ml',0.005,3000,true) on conflict (id) do nothing;
insert into public.item_estoque (id,id_categoria,nome,tipo,unidade_medida,custo_unitario_medio,estoque_minimo,ativo) values (3,3,'Copo 300ml','embalagem','unidade',1.2,30,true) on conflict (id) do nothing;
insert into public.item_estoque (id,id_categoria,nome,tipo,unidade_medida,custo_unitario_medio,estoque_minimo,ativo) values (4,3,'Copo 500ml','embalagem','unidade',1.5,30,true) on conflict (id) do nothing;
insert into public.item_estoque (id,id_categoria,nome,tipo,unidade_medida,custo_unitario_medio,estoque_minimo,ativo) values (5,3,'Copo 700ml','embalagem','unidade',1.9,30,true) on conflict (id) do nothing;
insert into public.item_estoque (id,id_categoria,nome,tipo,unidade_medida,custo_unitario_medio,estoque_minimo,ativo) values (6,3,'Canudo','embalagem','unidade',1,50,true) on conflict (id) do nothing;
insert into public.item_estoque (id,id_categoria,nome,tipo,unidade_medida,custo_unitario_medio,estoque_minimo,ativo) values (7,3,'Casquinha','embalagem','unidade',0,20,true) on conflict (id) do nothing;
insert into public.item_estoque (id,id_categoria,nome,tipo,unidade_medida,custo_unitario_medio,estoque_minimo,ativo) values (8,3,'Cascão','embalagem','unidade',0,20,true) on conflict (id) do nothing;
insert into public.estoque_atual (id,id_item_estoque,quantidade_disponivel) values (1,1,5000) on conflict (id) do nothing;
insert into public.estoque_atual (id,id_item_estoque,quantidade_disponivel) values (2,2,10000) on conflict (id) do nothing;
insert into public.estoque_atual (id,id_item_estoque,quantidade_disponivel) values (3,3,100) on conflict (id) do nothing;
insert into public.estoque_atual (id,id_item_estoque,quantidade_disponivel) values (4,4,100) on conflict (id) do nothing;
insert into public.estoque_atual (id,id_item_estoque,quantidade_disponivel) values (5,5,100) on conflict (id) do nothing;
insert into public.estoque_atual (id,id_item_estoque,quantidade_disponivel) values (6,6,300) on conflict (id) do nothing;
insert into public.estoque_atual (id,id_item_estoque,quantidade_disponivel) values (7,7,50) on conflict (id) do nothing;
insert into public.estoque_atual (id,id_item_estoque,quantidade_disponivel) values (8,8,50) on conflict (id) do nothing;
insert into public.produto (id,nome,tipo,personalizavel,ativo) values (1,'Milkshake','milkshake',true,true) on conflict (id) do nothing;
insert into public.produto (id,nome,tipo,personalizavel,ativo) values (2,'Sorvete (bolas)','sorvete',false,true) on conflict (id) do nothing;
insert into public.tamanho_milkshake (id,id_produto,volume_ml,preco_venda,ordem) values (1,1,300,15,1) on conflict (id) do nothing;
insert into public.tamanho_milkshake (id,id_produto,volume_ml,preco_venda,ordem) values (2,1,500,17,2) on conflict (id) do nothing;
insert into public.tamanho_milkshake (id,id_produto,volume_ml,preco_venda,ordem) values (3,1,700,21,3) on conflict (id) do nothing;
insert into public.composicao_milkshake (id,id_tamanho,id_item_estoque,quantidade,unidade) values (1,1,1,150,'g') on conflict (id) do nothing;
insert into public.composicao_milkshake (id,id_tamanho,id_item_estoque,quantidade,unidade) values (2,1,2,150,'ml') on conflict (id) do nothing;
insert into public.composicao_milkshake (id,id_tamanho,id_item_estoque,quantidade,unidade) values (3,1,3,1,'unidade') on conflict (id) do nothing;
insert into public.composicao_milkshake (id,id_tamanho,id_item_estoque,quantidade,unidade) values (4,1,6,1,'unidade') on conflict (id) do nothing;
insert into public.composicao_milkshake (id,id_tamanho,id_item_estoque,quantidade,unidade) values (5,2,1,150,'g') on conflict (id) do nothing;
insert into public.composicao_milkshake (id,id_tamanho,id_item_estoque,quantidade,unidade) values (6,2,2,350,'ml') on conflict (id) do nothing;
insert into public.composicao_milkshake (id,id_tamanho,id_item_estoque,quantidade,unidade) values (7,2,4,1,'unidade') on conflict (id) do nothing;
insert into public.composicao_milkshake (id,id_tamanho,id_item_estoque,quantidade,unidade) values (8,2,6,1,'unidade') on conflict (id) do nothing;
insert into public.composicao_milkshake (id,id_tamanho,id_item_estoque,quantidade,unidade) values (9,3,1,150,'g') on conflict (id) do nothing;
insert into public.composicao_milkshake (id,id_tamanho,id_item_estoque,quantidade,unidade) values (10,3,2,550,'ml') on conflict (id) do nothing;
insert into public.composicao_milkshake (id,id_tamanho,id_item_estoque,quantidade,unidade) values (11,3,5,1,'unidade') on conflict (id) do nothing;
insert into public.composicao_milkshake (id,id_tamanho,id_item_estoque,quantidade,unidade) values (12,3,6,1,'unidade') on conflict (id) do nothing;
insert into public.sabor_sorvete (id,id_produto,nome,peso_por_bola_g,ativo) values (1,2,'Chocolate',60,true) on conflict (id) do nothing;
insert into public.porcao_sorvete (id,id_sabor,qtd_bolas,preco_venda,ordem) values (1,1,1,6,1) on conflict (id) do nothing;
insert into public.porcao_sorvete (id,id_sabor,qtd_bolas,preco_venda,ordem) values (2,1,2,10,2) on conflict (id) do nothing;
insert into public.porcao_sorvete (id,id_sabor,qtd_bolas,preco_venda,ordem) values (3,1,3,15,3) on conflict (id) do nothing;
insert into public.forma_pagamento (id,nome,ativo) values (1,'dinheiro',true) on conflict (id) do nothing;
insert into public.forma_pagamento (id,nome,ativo) values (2,'cartao_debito',true) on conflict (id) do nothing;
insert into public.forma_pagamento (id,nome,ativo) values (3,'cartao_credito',true) on conflict (id) do nothing;
insert into public.forma_pagamento (id,nome,ativo) values (4,'pix',true) on conflict (id) do nothing;
insert into public.usuario (id,nome,login,senha_hash,perfil,ativo) values (1,'Administrador','admin','240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9','admin',true) on conflict (id) do nothing;

insert into public.produto (id,nome,tipo,personalizavel,descricao,ativo) values
  (3,'Milkshake de Chocolate','milkshake',false,'Milkshake sabor Chocolate',true),
  (4,'Milkshake de Morango','milkshake',false,'Milkshake sabor Morango',true),
  (5,'Milkshake de Baunilha','milkshake',false,'Milkshake sabor Baunilha',true),
  (6,'Milkshake de Ovomaltine','milkshake',false,'Milkshake sabor Ovomaltine',true),
  (7,'Milkshake de Doce de Leite','milkshake',false,'Milkshake sabor Doce de Leite',true),
  (8,'Milkshake de Paçoca','milkshake',false,'Milkshake sabor Paçoca',true),
  (9,'Milkshake de Cookies & Cream','milkshake',false,'Milkshake sabor Cookies & Cream',true),
  (10,'Milkshake de Ninho com Nutella','milkshake',false,'Milkshake sabor Ninho com Nutella',true)
on conflict (id) do nothing;

insert into public.sabor_sorvete (id,id_produto,nome,peso_por_bola_g,ativo) values
  (2,2,'Morango',60,true),
  (3,2,'Baunilha',60,true),
  (4,2,'Creme',60,true),
  (5,2,'Maracujá',60,true),
  (6,2,'Coco',60,true),
  (7,2,'Doce de Leite',60,true),
  (8,2,'Pistache',60,true),
  (9,2,'Flocos',60,true)
on conflict (id) do nothing;

insert into public.porcao_sorvete (id,id_sabor,qtd_bolas,preco_venda,ordem) values
  (4,2,1,6,1),(5,2,2,10,2),(6,2,3,15,3),
  (7,3,1,6,1),(8,3,2,10,2),(9,3,3,15,3),
  (10,4,1,6,1),(11,4,2,10,2),(12,4,3,15,3),
  (13,5,1,6,1),(14,5,2,10,2),(15,5,3,15,3),
  (16,6,1,6,1),(17,6,2,10,2),(18,6,3,15,3),
  (19,7,1,6,1),(20,7,2,10,2),(21,7,3,15,3),
  (22,8,1,6,1),(23,8,2,10,2),(24,8,3,15,3),
  (25,9,1,6,1),(26,9,2,10,2),(27,9,3,15,3)
on conflict (id) do nothing;
