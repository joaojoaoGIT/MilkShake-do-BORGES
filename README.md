<div align="center">

# 🥤 Milkshake do Borges

### Feito com leite de Borges!

**Sabores polêmicos, milkshakes cremosos e uma experiência completa de pedidos.**

[🎨 **Acessar apresentação do projeto no Canva**](https://canva.link/yfej9ecudhpuied)

</div>

---

## 📖 Sobre o projeto

O **Milkshake do Borges** é um projeto de site para uma marca fictícia de milkshakes e sorvetes. A proposta combina uma identidade visual divertida e temática com uma experiência de compra inspirada em grandes redes de fast-food.

O projeto conta com duas partes integradas:

- **Site do cliente:** apresenta a marca, exibe o cardápio, permite personalizar produtos, selecionar uma loja e montar pedidos para retirada.
- **Painel administrativo:** permite acompanhar pedidos e gerenciar informações da operação, com dados armazenados no Supabase.

A interface foi desenvolvida para funcionar em computadores e celulares, mantendo a navegação e o processo de compra acessíveis em diferentes tamanhos de tela.

## ✨ Funcionalidades

### 🛍️ Site do cliente

- Apresentação da marca e de sua identidade visual.
- Cardápio organizado por categorias, incluindo destaques, combos, milkshakes e sorvetes.
- Busca e visualização dos produtos.
- Personalização de tamanho, quantidade de bolas, adicionais e observações.
- Sacola de compras com atualização dos itens e valores.
- Seleção da loja para retirada, com mapa e opção de usar a localização do dispositivo.
- Escolha entre retirada o quanto antes ou agendada.
- Formulário com nome, telefone e forma de pagamento.
- Confirmação do pedido, código de retirada e acompanhamento de status.
- Layout responsivo para dispositivos móveis e desktops.

### 📊 Painel administrativo

- Acesso por autenticação do Supabase.
- Dashboard com informações de vendas e operação.
- Gerenciamento de produtos, sabores, sorvetes e adicionais.
- Controle de estoque, compras e movimentações.
- Gerenciamento de lojas, combos e formas de pagamento.
- Visualização e atualização dos pedidos realizados pelo site.
- Atualização periódica dos dados para identificar novos pedidos.
- Relatórios com valores de vendas, custos e lucro bruto.

## 🧰 Tecnologias utilizadas

| Tecnologia | Aplicação no projeto |
|---|---|
| **HTML5** | Estrutura das páginas do site e do painel administrativo. |
| **CSS3** | Identidade visual, layouts, animações e responsividade. |
| **JavaScript** | Interações, cardápio, sacola, pedidos, mapas e lógica do painel. |
| **Supabase** | Banco de dados, autenticação e integração entre site e painel. |
| **SQL** | Criação e atualização das tabelas, funções e dados iniciais do banco. |
| **Leaflet** | Exibição do mapa interativo das lojas. |
| **OpenStreetMap, CARTO e Esri** | Fontes de mapas utilizadas na visualização das lojas. |
| **Google Fonts** | Tipografia da identidade visual. |

O projeto utiliza HTML, CSS e JavaScript sem framework principal de interface. Algumas bibliotecas são carregadas por CDN.

## 🗂️ Estrutura do projeto

```text
milkshake-do-borges/
│
├── index.html                  # Página principal do site
├── LEIA-ME.txt                 # Orientações complementares do projeto
│
├── assets/
│   └── img/
│       ├── logo-completa.png   # Identidade visual
│       ├── logo-texto.png
│       ├── borges-camisa10.png
│       ├── borges-terno.png
│       ├── borges-tsundere.png
│       └── cardapio/           # Imagens dos produtos
│
├── css/
│   ├── style.css               # Estilos gerais
│   └── cardapio.css            # Estilos do cardápio e dos pedidos
│
├── js/
│   ├── desenhos.js             # Ilustrações em SVG
│   ├── cardapio-dados.js       # Dados locais de produtos e combos
│   ├── banco.js                # Integração do site com o banco
│   ├── main.js                 # Página, lojas, mapa e animações
│   └── pedido.js               # Cardápio, sacola e fluxo de pedidos
│
└── admin/
    ├── index.html              # Painel administrativo
    ├── LEIA-ME-SUPABASE.txt    # Configuração do Supabase
    ├── css/
    │   └── style.css
    ├── js/
    │   ├── app.js              # Lógica principal do painel
    │   ├── hubs.js             # Seções e gerenciamento de dados
    │   └── supabase.js         # Cliente e sincronização Supabase
    ├── data/
    │   └── schema.json
    └── supabase/
        ├── schema.sql          # Estrutura inicial do banco
        ├── seed.sql            # Dados iniciais
        ├── 02-site-pedidos.sql
        ├── 03-catalogo-site.sql
        └── ATUALIZAR-BANCO.sql # Atualização consolidada
```

## 🚀 Como executar o projeto

### 1. Baixar os arquivos

Baixe ou clone este repositório e extraia a pasta do projeto.

### 2. Iniciar um servidor local

Com o Python instalado, abra o terminal dentro da pasta `milkshake-do-borges` e execute:

```bash
python -m http.server 8000
```

### 3. Abrir o site

Acesse no navegador:

```text
http://localhost:8000
```

O painel administrativo fica disponível em:

```text
http://localhost:8000/admin/
```

> **Dica:** executar por um servidor local é recomendado. Abrir o HTML diretamente pelo explorador de arquivos pode limitar recursos como mapas, autenticação e integração com serviços externos.

## 🗄️ Configuração do Supabase

O Supabase é utilizado como base de dados central para conectar o site ao painel administrativo. Ele armazena informações como produtos, sabores, lojas, estoque, vendas e pedidos.

Para configurar uma instância própria:

1. Crie um projeto no [Supabase](https://supabase.com/).
2. Abra o **SQL Editor** do projeto.
3. Em um banco novo, execute os arquivos SQL na ordem indicada em `admin/LEIA-ME-SUPABASE.txt`. O arquivo `admin/supabase/ATUALIZAR-BANCO.sql` reúne as atualizações necessárias para os recursos do site.
4. Em **Authentication → Users**, crie o usuário que terá acesso ao painel.
5. Vincule o usuário autenticado ao perfil correspondente na tabela `usuario`, conforme as instruções do arquivo de configuração.
6. Configure a URL e a chave pública (*publishable/anon*) do seu projeto nos arquivos de integração do site e do painel.
7. Inicie o servidor local e teste o site e o painel.

**Importante:** nunca coloque a chave `service_role` no código do navegador ou em repositórios públicos. Utilize somente a chave pública apropriada e configure corretamente as políticas de segurança (RLS) do Supabase.

Se o banco já estiver criado, consulte `admin/LEIA-ME-SUPABASE.txt` para identificar qual script de atualização executar. Os dados de lojas, endereços, telefones e custos de exemplo devem ser revisados antes de uma utilização real.

## 🔄 Como funciona o fluxo de pedidos

1. O cliente escolhe uma loja para retirada.
2. Navega pelo cardápio e seleciona os produtos desejados.
3. Personaliza tamanhos, sabores e adicionais.
4. Confere a sacola e informa os dados necessários para o pedido.
5. Escolhe a modalidade de retirada e a forma de pagamento.
6. Confirma o pedido e recebe um código de acompanhamento.
7. Com o Supabase configurado, o pedido é registrado no banco e aparece no painel administrativo.
8. A equipe atualiza o status no painel, permitindo que o cliente acompanhe o andamento pelo site.

Quando a integração com o banco não está disponível, o site pode operar em **modo de demonstração**, mantendo o pedido apenas no navegador. Nesse modo, não há persistência nem sincronização real com o painel.

## 🗺️ Mapas e localização

O mapa das lojas utiliza a biblioteca Leaflet e fontes de mapas externas, sem exigir uma chave própria para as camadas configuradas. O projeto prevê alternativas de visualização e uma representação simplificada caso os recursos externos não estejam disponíveis.

A opção de localização do dispositivo depende da permissão concedida pelo navegador e de um contexto compatível, normalmente `localhost` ou HTTPS.

## 🖼️ Imagens do cardápio

As imagens próprias dos produtos podem ser adicionadas em:

```text
assets/img/cardapio/<nome-do-produto>.jpg
```

Consulte os identificadores utilizados no catálogo para nomear os arquivos corretamente. O projeto também possui mecanismos alternativos para buscar imagens quando uma foto local não estiver disponível.

## ⚠️ Observações

- O projeto contém dados demonstrativos, como lojas, endereços, telefones e custos. Atualize essas informações antes de qualquer uso real.
- O QR Pix exibido na confirmação é demonstrativo; não representa uma cobrança real.
- A integração de pedidos e o acompanhamento em tempo real dependem da configuração correta do Supabase.
- A chave pública do Supabase pode estar presente no frontend, mas a proteção dos dados deve ser garantida pelas políticas de acesso do banco.

## 👥 Créditos

**Projeto:** Milkshake do Borges  
**Proposta:** experiência digital de uma marca temática de milkshakes e sorvetes, com site de pedidos e painel administrativo.

---

<div align="center">

**🥤 Milkshake do Borges — feito com leite de Borges!**

[Voltar à apresentação do projeto](https://canva.link/yfej9ecudhpuied)

</div>
