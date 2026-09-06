# 55 Marcas

## Publicação em produção

O guia atual está em [deploy/PRODUCAO.md](deploy/PRODUCAO.md):
Cloudflare Pages (landing e CRM), Railway (API Bun), Neon (Postgres) e R2 (PDFs privados),
com o domínio `55marcas.com.br`. A seção antiga de GitHub Pages abaixo é legada;
o workflow correspondente agora é exclusivamente manual.

Landing page e diagnóstico preliminar de marcas para a 55 Marcas, usando a
API da Infosimples para pesquisar processos públicos relacionados a marcas.

## Configuração

Preencha o token no arquivo `.env`:

```env
INFOSIMPLES_TOKEN=seu_token_infosimples
```

O token é usado somente pela rota do servidor e não é enviado ao navegador.

## Executar localmente

```bash
npm install
npm run dev
```

Abra `http://localhost:3000` no navegador e pesquise pelo nome da marca.

Após uma consulta real, os resultados são exibidos na página
`http://localhost:3000/resultados` sem repetir a requisição à API durante a
navegação.

Para editar os estilos da área de resultados sem consumir requisições da API,
clique em `Visualizar resultado de exemplo`. Essa prévia usa dados fictícios
apenas no navegador. Também é possível abrir diretamente
`http://localhost:3000/resultados?preview=resultados`.

Para validar a versão de produção local:

```bash
npm run build
npm test
```

## Persistência e captação de leads

O backend operacional em [`api-bun`](./api-bun) adiciona Postgres, Drizzle e
Bun ao fluxo. Quando `OPERATIONS_API_URL` está configurada, cada consulta é
persistida, recebe uma URL recuperável e habilita o formulário de análise
personalizada na página de resultados.

Comandos úteis na raiz:

```bash
npm run dev:operations
npm run db:generate:operations
npm run db:migrate:operations
npm run typecheck:operations
```

## CRM interno

A consulta real exige nome, WhatsApp, segmento e autorização de contato antes
de acessar a InfoSimples. CNPJ, cidade/UF e tentativa anterior são opcionais.
O contato é persistido mesmo se o provedor falhar. A rota de pesquisa exige
`OPERATIONS_API_URL`, pois não há consulta anônima de fallback.

O CRM distingue `SEARCH_ONLY` (Somente consulta) de `REGISTRATION_REQUESTED`
(Interesse em registro), com filtro independente da etapa comercial. O clique
em “Quero registrar minha marca” nos resultados promove o mesmo lead, com
histórico, sem criar outro cadastro nem mudar a etapa comercial. Leads
anteriores permanecem na categoria de interesse em registro.

A API auxiliar em `worker-api` também encaminha essas rotas para
`OPERATIONS_API_URL`; ela precisa dessa configuração caso seja utilizada.
Para validar apenas os tipos da landing: `npx tsc -p tsconfig.landing.json`.

O painel em [`crm-web`](./crm-web) é uma aplicação React/Vite separada da
landing page pública. Ele usa a mesma API Bun, autenticação por sessão e uma
lista explícita de e-mails autorizados.

Depois de copiar as novas variáveis de `api-bun/.env.example` para
`api-bun/.env`, execute:

```bash
npm run db:migrate:operations
npm run admin:create
npm run dev:operations
npm run dev:crm
```

O CRM fica disponível em `http://localhost:3001`. Depois de criar o primeiro
administrador, remova `CRM_ADMIN_PASSWORD` do arquivo `.env`.

### Propostas comerciais

No detalhe de cada lead, o CRM permite criar propostas com múltiplos itens,
quantidades, desconto, validade e observações. O rascunho continua editável até
o primeiro envio. Ao abrir a proposta no WhatsApp, o CRM registra o evento e
move automaticamente oportunidades iniciais para a etapa `PROPOSAL`.

Valores monetários são persistidos em centavos e o total é recalculado no
servidor; o navegador não é a fonte de verdade para cálculos financeiros.

Quando uma proposta é enviada, o WhatsApp recebe também um link público
assinado. O cliente pode consultar os itens, salvar a página como PDF e
registrar aceite ou recusa comercial. O aceite move o lead para `WON`; a recusa
fica registrada sem encerrar automaticamente a oportunidade.

Ao aceitar uma proposta, a API cria um contrato com snapshot do escopo e do
valor naquele momento. O CRM pode enviá-lo por WhatsApp; o cliente lê o
instrumento em uma página pública e baixa um PDF tradicional para assinatura
externa. A página não registra assinatura nem altera o arquivo, e o contrato
não depende de alterações posteriores na proposta.

O botão `Baixar PDF tradicional` gera o arquivo diretamente no navegador. O
cliente pode levá-lo ao assinador do GOV.br, ou usar `Imprimir página` para
assinar manualmente e digitalizar. Depois, o arquivo assinado deve ser enviado
à equipe para conferência e arquivamento.

No detalhe do contrato, o CRM permite anexar cada PDF recebido como uma nova
versão, identificar se a assinatura veio do GOV.br ou de impressão manual,
baixar o arquivo e marcar a conferência. O armazenamento local usa
`api-bun/storage` (configurável por `DOCUMENT_STORAGE_DIR`); em produção,
substitua-o por um bucket R2/S3. O CRM também registra confirmações manuais de
pagamento, inclusive parcelas e estornos, sem atrelar esses registros à
liberação de qualquer etapa.

O prestador pode abrir `Editar contrato` no CRM enquanto o documento estiver
em rascunho. O texto é salvo com auditoria; depois do primeiro envio, o
contrato fica bloqueado para edição.

Para ativar os links, configure `PROPOSAL_LINK_SECRET` na API com um segredo
aleatório de pelo menos 32 caracteres. Em produção, configure também
`VITE_PUBLIC_PROPOSAL_URL` com a origem pública do frontend (a variável também
é usada pelos links de contrato).
