-- =====================================================================
-- Milkshake do Borges - catálogo do site no banco (sabores IGUAIS aos do site)
-- Rode DEPOIS de 02-site-pedidos.sql. Gerado a partir de js/cardapio-dados.js.
-- Depois de rodado, o banco manda: o site mostra exatamente os sabores ATIVOS daqui.
-- Para mudar sabor, preço ou loja, use o dashboard (não rode este arquivo de novo,
-- ele recoloca os textos originais dos sabores de sorvete).
-- =====================================================================

-- ----- Lojas (FICTÍCIAS: troque pelos dados reais no dashboard) -----
insert into public.loja (id,nome,cidade,endereco,telefone,lat,lng,horarios,ativo) values (1,'Borges Cidade Baixa','Porto Alegre','Rua José do Patrocínio, 480, Cidade Baixa','(51) 90000-0001',-30.0436,-51.22,'[[12,23],[12,23],[12,23],[12,23],[12,23],[12,23],[12,23]]',true) on conflict (id) do nothing;
insert into public.loja (id,nome,cidade,endereco,telefone,lat,lng,horarios,ativo) values (2,'Borges Canoas','Canoas','Avenida Guilherme Schell, 1250, Centro','(51) 90000-0002',-29.9178,-51.1839,'[[12,22],[12,22],[12,22],[12,22],[12,22],[12,22],[12,22]]',true) on conflict (id) do nothing;
insert into public.loja (id,nome,cidade,endereco,telefone,lat,lng,horarios,ativo) values (3,'Borges Sapucaia','Sapucaia do Sul','Avenida Getúlio Vargas, 2100, Centro','(51) 90000-0003',-29.8276,-51.1456,'[[13,22],null,[13,22],[13,22],[13,22],[13,22],[13,22]]',true) on conflict (id) do nothing;

-- ----- Milkshakes: produto 1 "Milkshake" tem tamanhos e composição; cada sabor fica em sabor_milkshake -----
update public.produto set nome = 'Milkshake', slug = 'milkshake' where id = 1;
update public.produto set slug = 'sorvete' where id = 2;
-- produtos antigos "Milkshake de ..." (3 a 10) não tinham tamanho nem composição: ficam inativos, sem apagar histórico
update public.produto set ativo = false where id between 3 and 10;
insert into public.sabor_milkshake (id,id_produto,nome,slug,tema,descricao,ingredientes,selo,destaque,ordem,ativo) values (1,1,'BorgesShake','borgesshake','Leite direto do Borges','O campeão da casa: leite fresquinho tirado de manhã cedo na fazenda do Borges, sorvete de creme, calda de doce de leite e chantilly de verdade.','Sorvete de creme, leite fresco da fazenda do Borges, doce de leite e chantilly','Especial da casa',true,1,true) on conflict (id) do nothing;
insert into public.sabor_milkshake (id,id_produto,nome,slug,tema,descricao,ingredientes,selo,destaque,ordem,ativo) values (2,1,'Delação Premiada','delacao-premiada','Entrega tudo no final','Um recheio de doce de leite que só entrega tudo no último gole. Ninho com avelã.','Sorvete de leite Ninho, leite, creme de avelã, doce de leite e chantilly','Novo',false,2,true) on conflict (id) do nothing;
insert into public.sabor_milkshake (id,id_produto,nome,slug,tema,descricao,ingredientes,selo,destaque,ordem,ativo) values (3,1,'Fake News de Baunilha','fake-news-de-baunilha','Todo mundo jura que é morango','Parece morango e foi repassado como morango, mas é baunilha com calda de frutas vermelhas. Confira antes de compartilhar.','Sorvete de baunilha, leite e calda de frutas vermelhas','Mais pedido',false,3,true) on conflict (id) do nothing;
insert into public.sabor_milkshake (id,id_produto,nome,slug,tema,descricao,ingredientes,selo,destaque,ordem,ativo) values (4,1,'Foro Privilegiado','foro-privilegiado','Só para poucos','Sabor de acesso restrito: pistache de verdade com chocolate branco e muita elegância.','Sorvete de pistache, leite, calda de chocolate branco e pistache triturado',null,false,4,true) on conflict (id) do nothing;
insert into public.sabor_milkshake (id,id_produto,nome,slug,tema,descricao,ingredientes,selo,destaque,ordem,ativo) values (5,1,'Polarizado','polarizado','Dois lados que não se misturam','Morango de um lado, mirtilo do outro, e nenhum dos dois cede. Só se encontram no canudo.','Sorvete de morango, sorvete de mirtilo, leite e chantilly',null,false,5,true) on conflict (id) do nothing;
insert into public.sabor_milkshake (id,id_produto,nome,slug,tema,descricao,ingredientes,selo,destaque,ordem,ativo) values (6,1,'Segundo Turno','segundo-turno','Rodada decisiva','Maracujá e pistache disputando o mesmo copo. Quem leva? Você decide no último gole.','Sorvete de creme, leite, calda de maracujá e calda de pistache',null,false,6,true) on conflict (id) do nothing;
insert into public.sabor_milkshake (id,id_produto,nome,slug,tema,descricao,ingredientes,selo,destaque,ordem,ativo) values (7,1,'Pasta de Dente','pasta-de-dente','A polêmica que divide a mesa','Menta com chocolate: pasta de dente ou obra-prima? Prove e tome a sua posição.','Sorvete de menta, leite e gotas de chocolate','Polêmico',false,7,true) on conflict (id) do nothing;

-- ----- Sorvetes: mesmos 8 sabores do site; os antigos que não existem no site ficam inativos -----
update public.sabor_sorvete set ativo = false where id in (4, 6, 9);   -- Creme, Coco e Flocos
insert into public.sabor_sorvete (id,id_produto,nome,slug,descricao,peso_por_bola_g,ordem,ativo) values (1,2,'Chocolate','sorvete-chocolate','Cremoso e intenso, o clássico da casa.',60,1,true)
  on conflict (id) do update set nome = excluded.nome, slug = excluded.slug, descricao = excluded.descricao, ordem = excluded.ordem, ativo = true;
insert into public.sabor_sorvete (id,id_produto,nome,slug,descricao,peso_por_bola_g,ordem,ativo) values (3,2,'Baunilha','sorvete-baunilha','Suave e cremoso, combina com qualquer calda.',60,2,true)
  on conflict (id) do update set nome = excluded.nome, slug = excluded.slug, descricao = excluded.descricao, ordem = excluded.ordem, ativo = true;
insert into public.sabor_sorvete (id,id_produto,nome,slug,descricao,peso_por_bola_g,ordem,ativo) values (2,2,'Morango','sorvete-morango','Doce e fresquinho, com sabor de fruta de verdade.',60,3,true)
  on conflict (id) do update set nome = excluded.nome, slug = excluded.slug, descricao = excluded.descricao, ordem = excluded.ordem, ativo = true;
insert into public.sabor_sorvete (id,id_produto,nome,slug,descricao,peso_por_bola_g,ordem,ativo) values (8,2,'Pistache','sorvete-pistache','Verde, elegante e cheio de sabor.',60,4,true)
  on conflict (id) do update set nome = excluded.nome, slug = excluded.slug, descricao = excluded.descricao, ordem = excluded.ordem, ativo = true;
insert into public.sabor_sorvete (id,id_produto,nome,slug,descricao,peso_por_bola_g,ordem,ativo) values (10,2,'Menta com chocolate','sorvete-menta','Refrescante, com gotinhas de chocolate.',60,5,true)
  on conflict (id) do update set nome = excluded.nome, slug = excluded.slug, descricao = excluded.descricao, ordem = excluded.ordem, ativo = true;
insert into public.sabor_sorvete (id,id_produto,nome,slug,descricao,peso_por_bola_g,ordem,ativo) values (7,2,'Doce de leite','sorvete-doce-de-leite','Caramelo, leite e nenhuma culpa.',60,6,true)
  on conflict (id) do update set nome = excluded.nome, slug = excluded.slug, descricao = excluded.descricao, ordem = excluded.ordem, ativo = true;
insert into public.sabor_sorvete (id,id_produto,nome,slug,descricao,peso_por_bola_g,ordem,ativo) values (5,2,'Maracujá','sorvete-maracuja','Azedinho na medida, ótimo para dias quentes.',60,7,true)
  on conflict (id) do update set nome = excluded.nome, slug = excluded.slug, descricao = excluded.descricao, ordem = excluded.ordem, ativo = true;
insert into public.sabor_sorvete (id,id_produto,nome,slug,descricao,peso_por_bola_g,ordem,ativo) values (11,2,'Maltado crocante','sorvete-maltado','Sorvete maltado com pedacinhos crocantes.',60,8,true)
  on conflict (id) do update set nome = excluded.nome, slug = excluded.slug, descricao = excluded.descricao, ordem = excluded.ordem, ativo = true;
insert into public.porcao_sorvete (id,id_sabor,qtd_bolas,preco_venda,ordem) values (28,10,1,6,1) on conflict (id) do nothing;
insert into public.porcao_sorvete (id,id_sabor,qtd_bolas,preco_venda,ordem) values (29,10,2,10,2) on conflict (id) do nothing;
insert into public.porcao_sorvete (id,id_sabor,qtd_bolas,preco_venda,ordem) values (30,10,3,15,3) on conflict (id) do nothing;
insert into public.porcao_sorvete (id,id_sabor,qtd_bolas,preco_venda,ordem) values (31,11,1,6,1) on conflict (id) do nothing;
insert into public.porcao_sorvete (id,id_sabor,qtd_bolas,preco_venda,ordem) values (32,11,2,10,2) on conflict (id) do nothing;
insert into public.porcao_sorvete (id,id_sabor,qtd_bolas,preco_venda,ordem) values (33,11,3,15,3) on conflict (id) do nothing;

-- ----- Adicionais: itens de estoque da categoria Complemento (CUSTOS DE EXEMPLO: ajuste no dashboard) -----
insert into public.categoria_item (id,nome) values (4,'Complemento') on conflict (id) do nothing;
insert into public.item_estoque (id,id_categoria,nome,tipo,unidade_medida,custo_unitario_medio,estoque_minimo,ativo) values (9,4,'Chantilly extra','complemento','g',0.02,500,true) on conflict (id) do nothing;
insert into public.estoque_atual (id,id_item_estoque,quantidade_disponivel) values (9,9,2000) on conflict (id) do nothing;
insert into public.complemento (id,id_item_estoque,nome,slug,preco_venda,quantidade_uso,unidade,ativo) values (1,9,'Chantilly extra','chantilly',3,30,'g',true) on conflict (id) do nothing;
insert into public.item_estoque (id,id_categoria,nome,tipo,unidade_medida,custo_unitario_medio,estoque_minimo,ativo) values (10,4,'Calda extra','complemento','ml',0.015,500,true) on conflict (id) do nothing;
insert into public.estoque_atual (id,id_item_estoque,quantidade_disponivel) values (10,10,2000) on conflict (id) do nothing;
insert into public.complemento (id,id_item_estoque,nome,slug,preco_venda,quantidade_uso,unidade,ativo) values (2,10,'Calda extra','calda',2,20,'ml',true) on conflict (id) do nothing;
insert into public.item_estoque (id,id_categoria,nome,tipo,unidade_medida,custo_unitario_medio,estoque_minimo,ativo) values (11,4,'Granulados','complemento','g',0.02,300,true) on conflict (id) do nothing;
insert into public.estoque_atual (id,id_item_estoque,quantidade_disponivel) values (11,11,1200) on conflict (id) do nothing;
insert into public.complemento (id,id_item_estoque,nome,slug,preco_venda,quantidade_uso,unidade,ativo) values (3,11,'Granulados','granulado',2,10,'g',true) on conflict (id) do nothing;
insert into public.item_estoque (id,id_categoria,nome,tipo,unidade_medida,custo_unitario_medio,estoque_minimo,ativo) values (12,4,'Fio de doce de leite','complemento','g',0.03,500,true) on conflict (id) do nothing;
insert into public.estoque_atual (id,id_item_estoque,quantidade_disponivel) values (12,12,2000) on conflict (id) do nothing;
insert into public.complemento (id,id_item_estoque,nome,slug,preco_venda,quantidade_uso,unidade,ativo) values (4,12,'Fio de doce de leite','doce-de-leite',3,25,'g',true) on conflict (id) do nothing;

-- ----- Combos (preços de exemplo, sempre menores que a soma dos itens) -----
insert into public.combo (id,nome,slug,descricao,preco_venda,ativo) values (1,'Dupla Polêmica','combo-dupla','Dois milkshakes de 500 ml, cada um de um sabor. Para dividir ou para discordar.',31,true) on conflict (id) do nothing;
insert into public.combo_item (id,id_combo,tipo,volume_ml,qtd_bolas,quantidade) values (1,1,'milkshake',500,null,2) on conflict (id) do nothing;
insert into public.combo (id,nome,slug,descricao,preco_venda,ativo) values (2,'Sobremesa do Borges','combo-sobremesa','Um milkshake de 300 ml e uma bola de sorvete para fechar a refeição.',19,true) on conflict (id) do nothing;
insert into public.combo_item (id,id_combo,tipo,volume_ml,qtd_bolas,quantidade) values (2,2,'milkshake',300,null,1) on conflict (id) do nothing;
insert into public.combo_item (id,id_combo,tipo,volume_ml,qtd_bolas,quantidade) values (3,2,'sorvete',null,1,1) on conflict (id) do nothing;
insert into public.combo (id,nome,slug,descricao,preco_venda,ativo) values (3,'Turma do Borges','combo-turma','Três milkshakes de 500 ml e um sorvete de 3 bolas. Chame a turma.',59,true) on conflict (id) do nothing;
insert into public.combo_item (id,id_combo,tipo,volume_ml,qtd_bolas,quantidade) values (4,3,'milkshake',500,null,3) on conflict (id) do nothing;
insert into public.combo_item (id,id_combo,tipo,volume_ml,qtd_bolas,quantidade) values (5,3,'sorvete',null,3,1) on conflict (id) do nothing;

notify pgrst, 'reload schema';
