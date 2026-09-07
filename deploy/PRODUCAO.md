# Publicação da 55 Marcas

Para atualizar uma instalação existente, siga [Deploy automático](AUTOMATICO.md).
O procedimento longo abaixo é para provisionamento e mudanças de infraestrutura;
não precisa ser repetido a cada commit. O wrapper `npm run infra:plan` também
resolve o contorno de `railway.exe` no Windows descrito neste guia.

Este guia prepara a publicação; a existência dos arquivos não significa que os
serviços remotos já foram criados. Não há dependência de Sites nem do Worker
legado nessa arquitetura. Não execute `deploy:api`: ele publica outro backend.

## Destinos

| Endereço | Serviço | O que publica |
| --- | --- | --- |
| `55marcas.com.br` e `www.55marcas.com.br` | Cloudflare Pages, projeto landing | Somente `dist/client` |
| `crm.55marcas.com.br` | Cloudflare Pages, projeto CRM | Somente `crm-web/dist` |
| `api.55marcas.com.br` | Railway | Docker da pasta `api-bun` |
| Sem URL pública | Neon | Postgres de produção separado do local |
| Sem URL pública | Cloudflare R2 | PDFs assinados privados |

Os links de propostas e contratos usam o domínio do CRM. O HTML desse aplicativo
é público; os dados administrativos e downloads são protegidos pela API.
Links públicos de propostas/contratos funcionam como credenciais: qualquer pessoa
com o link pode abri-lo. Não os coloque em analytics, logs públicos ou indexadores.

## 1. Contas, repositório e DNS

1. Ative autenticação em duas etapas no Registro.br, Cloudflare, Railway, Neon e GitHub.
2. Adicione `55marcas.com.br` à Cloudflare e selecione o plano Free.
3. Confira os registros DNS importados. Preserve MX, SPF, DKIM e outros registros
   existentes se já houver e-mail ou algum serviço no domínio.
4. No Registro.br, abra o domínio, vá à seção DNS/alteração de servidores DNS e
   informe **os dois nameservers exatos atribuídos pela Cloudflare**. Não são IPs.
   O domínio continua registrado e renovado no Registro.br; só muda o DNS.
5. Se houver DNSSEC ativo, siga a orientação dos provedores para remover o DS antigo
   antes da troca e reativá-lo com o novo DS depois da ativação. Um DS antigo pode
   deixar o domínio inacessível.
6. Aguarde a Cloudflare mostrar a zona como ativa. Não invente registros CNAME:
   os destinos serão fornecidos pelos respectivos projetos nas próximas etapas.
7. Revise e envie as alterações do repositório `opippe/consulta-marcas` ao GitHub.
   Existem alterações anteriores junto das de deploy: revise o diff antes do commit.
   Nunca envie `.env`, senhas, dados locais, PDFs ou dumps. Não publique o repositório
   apenas para hospedar: Pages e Railway podem ser conectados a um repositório privado.

## 2. Banco Neon

1. Crie um projeto exclusivo de produção, inicialmente Free, com PostgreSQL 17.
2. Escolha uma região disponível próxima à região do serviço Railway; compare
   disponibilidade em ambas as contas antes de escolher. Não adote uma região
   incompatível só por ser próxima do Brasil.
3. No formulário de criação, deixe desativadas as opções **Object storage**,
   **Functions**, **AI gateway** e **Neon Auth**. Esta aplicação já usa Cloudflare
   R2 para os PDFs, Railway para a API Bun, não precisa de um gateway de IA nesta
   primeira versão e usa Better Auth dentro da própria API. Ativar Neon Auth
   criaria uma segunda camada de autenticação e tabelas que não serão utilizadas.
4. No painel de conexão, copie a URL com **connection pooling** para `DATABASE_URL`.
5. Copie também a URL **sem pooling** para `DATABASE_MIGRATION_URL`.
   Preserve os parâmetros SSL fornecidos pelo Neon nas duas URLs.
5. Não importe os leads fictícios locais. O pré-deploy aplica todas as migrations
   versionadas no novo banco; não basta ter rodado a migration no seu computador.

Comece com `DATABASE_POOL_SIZE=3`. Nunca edite migrations que já foram aplicadas.
O banco gratuito tem limites de armazenamento e computação: acompanhe o painel.

## 3. PDFs privados no R2

1. Habilite R2 na Cloudflare (a conta pode pedir uma forma de pagamento mesmo
   quando o uso estiver dentro da franquia gratuita).
2. Crie um bucket Standard chamado `55marcas-documentos`.
3. Mantenha **Public Development URL/r2.dev desabilitado**, sem domínio público.
   Não configure CORS para o bucket: o navegador fala com a API, não com o R2.
4. No painel Cloudflare, abra **Storage & databases → R2 → Overview**. Na área
   **Account Details**, clique em **Manage** ao lado de **API Tokens**. Essa é a
   tela de tokens do R2; não use **My Profile → API Tokens**, que é outra API.
5. Clique em **Create Account API token**. Dê um nome como `55marcas-railway-prod`.
   Se sua conta não permitir criar token de conta, use **Create User API token**;
   nesse caso ele ficará vinculado ao seu usuário e deixará de funcionar se esse
   usuário for removido da conta.
6. Em **Permissions**, selecione **Object Read & Write**. Marque **Apply to
   specific buckets only** e selecione somente `55marcas-documentos`. Não escolha
   **Admin Read & Write**: ele permitiria gerenciar buckets e configurações da
   conta. `Object Read & Write` é a permissão S3 de ler, gravar e listar objetos
   no bucket escolhido; ela não dá ao serviço acesso aos outros buckets.
7. Defina a validade conforme sua política de segurança. Para começar, pode usar
   uma validade longa com revisão documentada; se escolher expiração, programe a
   rotação antes da data. Clique em **Create API Token**.
8. Na tela de confirmação, copie imediatamente **Access Key ID** e **Secret Access
   Key** para um gerenciador de senhas. O Secret Access Key não poderá ser exibido
   novamente. Não cole esses valores em Git, `.env` versionado, issue ou chat.
9. Copie também o **S3 API endpoint** mostrado na confirmação ou no Overview:
   `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`. Substitua `<ACCOUNT_ID>` pelo
   valor real exibido pela Cloudflare, sem `< >`, e mantenha `https://`.
10. Se o bucket tiver sido criado em uma jurisdição específica, use o endpoint
    correspondente (`.eu.r2.cloudflarestorage.com`, `.us...` ou `.fedramp...`),
    não o endpoint `default`. Para o bucket comum criado sem jurisdição, use o
    endpoint padrão acima.
11. Preencha no Railway: `DOCUMENT_STORAGE_DRIVER=r2`, `R2_BUCKET`, `R2_ENDPOINT`,
    `R2_ACCESS_KEY_ID` e `R2_SECRET_ACCESS_KEY`. Não use o token de API da Cloudflare
    como se fosse a Secret Access Key: são credenciais diferentes.

Referências: [gerar credenciais S3 para R2](https://developers.cloudflare.com/r2/get-started/s3/)
e [autenticação e permissões dos tokens R2](https://developers.cloudflare.com/r2/api/tokens/).

O adaptador preserva os bytes originais do PDF, sem reescrever a assinatura.
O banco guarda metadados e SHA-256; o arquivo permanece privado. O acesso exige
sessão e e-mail autorizado no CRM. Em produção, a API recusa armazenamento local.
Se decidir migrar dados locais reais, precisará copiar tanto os registros quanto
os arquivos, preservando `storageKey`; o deploy não faz essa migração de dados.

## 4. API no Railway

1. Crie um projeto e um serviço a partir do repositório GitHub; selecione a branch
   que contém o código validado. Não adicione um Postgres Railway: usaremos Neon.
2. Configure **Root Directory** como `/api-bun`.
3. **Não preencha o campo Railway Config File.** `railway.toml`/`railway.json`
   são o recurso antigo Config as Code; serviços novos não podem adotá-lo e o
   suporte termina em 01/12/2026. Use o procedimento de Infrastructure as Code
   logo abaixo. Com Root Directory `/api-bun`, o Railway detecta automaticamente
   o `Dockerfile` que está na raiz desse serviço; não informe `/api-bun/Dockerfile`.
4. Em Variables, use `deploy/.env.example` como checklist e substitua todos os
   placeholders. Nunca copie variáveis de servidor para um projeto Pages.
5. Gere **três valores distintos** para `BETTER_AUTH_SECRET`, `PROPOSAL_LINK_SECRET`
   e `RATE_LIMIT_SALT`. Execute três vezes em seu terminal:

   ```powershell
   bun -e 'console.log(require("node:crypto").randomBytes(32).toString("hex"))'
   ```

   Cole cada resultado diretamente no painel/gerenciador de senhas. Não envie os
   segredos no chat. Preserve `PROPOSAL_LINK_SECRET` nos redeploys: trocá-lo invalida
   links emitidos. Trocar `BETTER_AUTH_SECRET` invalida sessões existentes.
6. Configure `CRM_ALLOWED_EMAILS` com os e-mails reais dos operadores, separados
   por vírgula. Mantenha `BETTER_AUTH_ALLOW_SIGN_UP=false`.
7. Faça o deploy e confira o sucesso do pré-deploy e do healthcheck.
8. Em Networking, adicione o domínio `api.55marcas.com.br`, porta `3100`.
   Cadastre na Cloudflare os registros CNAME/TXT **exatos** mostrados pelo Railway.
   Comece com o registro `api` em **DNS only** para validar certificado e conexão
   diretamente. Não use modo SSL Flexible. Não coloque um cache de API no caminho.
9. Confira `https://api.55marcas.com.br/health` e `/ready`: ambos devem responder
   200. `/ready` testa o banco; não testa InfoSimples nem permissões do R2.
10. Configure escala e custos conforme a seção abaixo. Para o lançamento inicial,
    use uma réplica, desabilite Serverless e configure um alerta de custo sem limite
    rígido. Um hard limit pode colocar todos os workloads offline.

### Migrar para Infrastructure as Code

O arquivo `api-bun/railway.toml` que está no repositório é apenas uma configuração
legada de transição. Não selecione seu caminho no painel. A configuração atual do
projeto deve ficar em `.railway/railway.ts`, na raiz do repositório, e ser aplicada
pela CLI Railway. A documentação oficial informa que esse é o substituto do
Config as Code e que um projeto não deve ser gerenciado pelos dois sistemas ao
mesmo tempo.

Faça a migração a partir da raiz do repositório (`consulta-marcas`), não de
`api-bun`:

Primeiro instale os dois componentes, que têm funções diferentes:

- **CLI global**: fornece o comando `railway` (`@railway/cli`).
- **Pacote local**: fornece o DSL TypeScript importado por
  `.railway/railway.ts` (`railway`).

```powershell
npm install --global @railway/cli
npm install --save-dev railway
railway --version
```

Se o primeiro ou segundo `npm install` retornar `ECONNRESET`, não continue para
`railway login`: o executável ainda não foi instalado. Confirme a conectividade
com o registro e tente novamente com retries maiores:

```powershell
npm config get registry
npm ping --registry=https://registry.npmjs.org/
npm cache verify
npm install --global @railway/cli --fetch-retries=5 --fetch-retry-mintimeout=2000 --fetch-retry-maxtimeout=60000
npm install --save-dev railway --fetch-retries=5 --fetch-retry-mintimeout=2000 --fetch-retry-maxtimeout=60000
```

O registro esperado é `https://registry.npmjs.org/`. Se a instalação global
terminar mas uma janela PowerShell antiga ainda disser que `railway` não existe,
feche-a, abra outra e execute `railway --version` novamente. Não configure um
proxy no npm se você não usa proxy corporativo.

Se o npm mostrar `allow-scripts` para `@railway/cli`, isso é uma proteção da sua
configuração local. Se `railway --version` funcionar, o aviso não bloqueia este
procedimento. Caso algum comando da CLI reclame do `postinstall`, permita somente
esse pacote e reinstale-o, sem liberar scripts globalmente:

```powershell
npm config set allow-scripts=@railway/cli --location=user
npm install --global @railway/cli
```

Com os dois componentes instalados, prossiga:

```powershell
railway login
railway link
railway config migrate
```

Se o nome do serviço no Railway for diferente do nome da pasta que contém o
`railway.toml`, passe o nome real com `--service`. Por exemplo, neste projeto a
pasta é `api-bun`, mas o serviço selecionado no Railway é `consulta-marcas`:

```powershell
railway config migrate --service consulta-marcas
```

Em um repositório com um único arquivo Config as Code, essa opção também define
o nome do serviço emitido no arquivo IaC. A prévia deve conter
`service("consulta-marcas", ...)`; não aplique uma prévia que contenha
`service("api-bun", ...)` se esse não for o nome do serviço no painel.

O comando sem `--apply` apenas mostra a migração proposta. Se o resultado apontar
para o projeto e o ambiente de produção corretos, aplique-a:

```powershell
railway config migrate --service consulta-marcas --apply
railway config plan
```

Se o plano listar exclusões de variáveis, do repositório/serviço ou de domínios,
**não execute `config apply`**. Isso ocorre quando a migração de um único arquivo
gera uma configuração parcial que ainda não declara todo o estado existente. Faça
uma cópia local e importe o estado atual do projeto; o `pull` renderiza as
variáveis existentes como `preserve()` sem expor seus valores:

```powershell
Copy-Item -LiteralPath .railway\railway.ts -Destination .railway\railway.ts.migrate-backup -Force
railway config pull --force
```

Não use `--omit-preserved-variables` nem `--include-variables`. Depois do `pull`,
adicione novamente no bloco do serviço as intenções que vinham do arquivo legado
(`healthcheck: "/ready"`, `healthcheckTimeout: 120` e
`preDeploy: "bun run db:migrate"`) e execute `railway config plan` outra vez.
O plano seguro deve preservar variáveis e a fonte GitHub, mostrando somente essas
alterações de deploy.

O `migrate --apply` cria `.railway/railway.ts` e limpa o vínculo do campo legado
**Railway Config File**. O `config plan` é somente leitura: confira se ele não
propõe apagar serviços, variáveis, domínios ou recursos que você não pretendia
alterar. Só depois confirme:

```powershell
railway config apply
```

#### Contorno para o erro de versão no Windows

Se `railway --version` mostrar uma versão atual (por exemplo, `5.49.2`), mas o
`config plan` disser que a CLI é anterior a `5.42.1`, a causa pode ser o shim
`railway.ps1`: o SDK TypeScript tenta executar `railway` diretamente e o Node não
executa esse shim do PowerShell. Use o executável real da instalação global na
mesma janela PowerShell:

```powershell
$railwayExe = Join-Path (npm root -g) '@railway\cli\bin\railway.exe'
Test-Path -LiteralPath $railwayExe
$env:_ = $railwayExe
& $railwayExe config plan
```

Depois de revisar um plano seguro, mantenha `$env:_` definido e execute o `apply`
com o mesmo `$railwayExe`. Essa variável vale apenas para a janela atual.

Não use `--confirm-destructive` nesta primeira aplicação. Se o plano mostrar
remoções inesperadas, pare e não aplique; normalmente isso indica que a CLI está
vinculada ao workspace/projeto/ambiente errado ou que a configuração foi gerada
como parcial. O arquivo gerado deve manter, no mínimo, estas intenções para a API:

- fonte GitHub `opippe/consulta-marcas`, branch de produção e `rootDirectory` `api-bun`;
- Dockerfile detectado dentro de `api-bun`;
- pre-deploy `bun run db:migrate`;
- healthcheck `/ready` com timeout de 120 segundos;
- política `ON_FAILURE` com até 3 tentativas;
- uma réplica na região escolhida.

Depois de conferir um `config plan` limpo e um deploy bem-sucedido, remova o arquivo
legado `api-bun/railway.toml` do repositório em um commit separado. Não o remova
antes da migração se ainda precisar que a CLI o importe. A partir daí, mudanças de
infraestrutura devem ser feitas no `.railway/railway.ts` e aplicadas com `config plan`
e `config apply`; variáveis secretas continuam no painel Railway e não devem ser
gravadas nesse arquivo.

### Escala, suspensão e alertas no Railway

Faça esta configuração no ambiente de produção, depois do primeiro deploy da API:

1. Abra o projeto no Railway e selecione o serviço da API (o serviço baseado em
   `api-bun`). Entre em **Settings → Deploy → Scale/Regions**. Deixe somente a
   região escolhida para a API com **1 replica**; remova outras regiões ou coloque
   `0` nelas. Não confunda quantidade de réplicas com **Replica Limits** (limite de
   CPU/memória por réplica). Deixe os limites de recurso no padrão inicialmente.
   Cada réplica recebe os recursos completos alocados ao serviço, portanto duas
   réplicas também podem aproximadamente duplicar o consumo.
2. Ainda em **Settings → Deploy → Serverless**, deixe **Enable Serverless**
   desativado. Serverless é o antigo App Sleeping: ele pode suspender o container
   após um período sem tráfego de saída e a primeira requisição pode sofrer cold
   start. Depois de alterar essa opção, faça um novo deploy/redeploy para garantir
   que o container criado use a configuração atual.
3. No seletor do workspace, abra **Usage** (ou **Workspace Usage**) e localize
   **Usage limits / Compute usage**. Configure um **custom email alert/soft limit**
   de um valor que você acompanha. Sugestão inicial: `US$ 10` por ciclo de cobrança.
   O alerta apenas envia e-mail; não interrompe o serviço.
4. No primeiro mês, deixe o **hard limit** desativado se a prioridade for
   disponibilidade. Se você preferir um teto absoluto depois de validar os custos,
   use, por exemplo, soft `US$ 10` e hard `US$ 25`, substituindo pelos valores que
   você aceita. Ao atingir o hard limit, o Railway pode desligar os workloads até
   o próximo ciclo ou até a remoção do limite; não use esse recurso sem aceitar
   essa interrupção.
5. Acompanhe **Usage → Projects** e **Metrics** da API diariamente durante a
   primeira semana. Verifique CPU, memória, egress, deployments e valor estimado.
   Também acompanhe separadamente Neon, Cloudflare/R2 e o saldo/uso da InfoSimples:
   o alerta de compute do Railway não cobre esses serviços.

Opcionalmente, com a CLI Railway autenticada e vinculada ao projeto, consulte:

```powershell
railway usage
railway usage projects --project NOME_OU_ID_DO_PROJETO --period current
railway usage limit status --target workspace
```

Para criar apenas o alerta de e-mail, sem alterar um hard limit existente:

```powershell
railway usage limit set --target workspace --soft 10
```

Para configurar também um hard limit explícito, use valores inteiros em dólares:

```powershell
railway usage limit set --target workspace --soft 10 --hard 25
```

Use a tela de Usage para confirmar o workspace antes de executar os comandos. A
CLI aceita valores em dólares inteiros para compute; o hard limit precisa ser maior
ou igual ao soft limit. Consulte a [documentação de uso da CLI](https://docs.railway.com/cli/usage),
o guia de [escala e réplicas](https://docs.railway.com/deployments/scaling),
o de [Serverless](https://docs.railway.com/deployments/serverless) e o de
[controle de custos](https://docs.railway.com/pricing/cost-control).

### Primeiro administrador

Depois das migrations, use um terminal **dentro do serviço Railway**, ou a CLI
Railway autenticada e vinculada ao projeto/ambiente corretos. A CLI precisa ser
instalada separadamente, seguindo sua documentação oficial.

Defina temporariamente `CRM_ADMIN_EMAIL`, `CRM_ADMIN_NAME` e `CRM_ADMIN_PASSWORD`
no ambiente do comando; o e-mail precisa constar em `CRM_ALLOWED_EMAILS`.

```powershell
# A partir da raiz do repositório; force o serviço e o ambiente de produção.
railway run --service consulta-marcas --environment production bun run --cwd api-bun admin:create
```

O comando abre o cadastro apenas em seu próprio processo, não no servidor web.
Remova `CRM_ADMIN_PASSWORD` das variáveis após criar o usuário. Não execute esse
comando como start/pre-deploy. Confira antes que DATABASE_URL aponta ao Neon de
produção e não ao Postgres local. Sem `railway run`, `bun run admin:create` lê o
ambiente local e não cria necessariamente o usuário no banco de produção.

Se o CRM responder `401 Unauthorized` no `POST /api/auth/sign-in/email`, confirme
que o usuário foi criado nesse banco de produção e que a senha usada é a mesma do
cadastro. `CRM_ALLOWED_EMAILS` não cria o usuário: ele deve conter o mesmo e-mail
do administrador, separado por vírgulas quando houver mais de um operador. Se o
e-mail já existir, não execute o cadastro novamente; use a senha original ou
cadastre outro e-mail autorizado. Nunca coloque `CRM_ADMIN_PASSWORD` no Git ou em
variáveis permanentes do runtime.

## 5. Dois projetos Cloudflare Pages

Em Workers & Pages, escolha **Pages / conectar Git**, não um Worker. Conecte o
mesmo repositório a dois projetos. Em ambos: preset None, raiz do repositório `/`,
branch de produção escolhida acima, build image v3 e estas variáveis de build:

```env
NODE_VERSION=22.13.0
BUN_VERSION=1.3.2
SKIP_DEPENDENCY_INSTALL=true
```

A instalação explícita evita que a plataforma escolha um gerenciador diferente
no monorepositório. Use a raiz `/` também no CRM: seu typecheck importa tipos da API.
O `crm-web` declara `@types/node` e inclui `node` em `tsconfig.json` porque o
cliente tRPC importa, apenas como tipo, `api-bun/src/trpc`; sem isso o TypeScript
do CRM percorre o backend e falha em `process`, `Buffer` e `node:crypto`.
Mantenha `crm-web/bun.lock` sincronizado com `crm-web/package.json` e não remova
essa dependência para tentar reduzir o build.

### Projeto landing — nome sugerido `55marcas-site`

Build command:

```sh
npm ci && npm run build:pages
```

Build output directory: `dist/client`.

Variável pública adicional:

```env
NEXT_PUBLIC_API_BASE_URL=https://api.55marcas.com.br
```

Não configure `GITHUB_PAGES=true` nem um subdiretório em `NEXT_PUBLIC_BASE_PATH`.
Não publique `dist` inteiro: contém intermediários de servidor que não pertencem
ao site público. As rotas `/api` locais não são exportadas; o browser chama Railway.

Em **Custom domains** do projeto Pages, adicione `55marcas.com.br` e depois
`www.55marcas.com.br`. Aguarde a ativação dos certificados. Opcionalmente configure
um redirecionamento permanente de www para o domínio principal na Cloudflare,
preservando caminho e query string (importante para os links de consulta).

### Projeto CRM — nome sugerido `55marcas-crm`

Build command:

```sh
bun install --cwd api-bun --frozen-lockfile && bun install --cwd crm-web --frozen-lockfile && bun run --cwd crm-web build
```

Build output directory: `crm-web/dist`.

Variáveis públicas adicionais:

```env
VITE_API_BASE_URL=https://api.55marcas.com.br
VITE_PUBLIC_PROPOSAL_URL=https://crm.55marcas.com.br
```

Se o login retornar `403` com `No 'Access-Control-Allow-Origin' header`, revise no
serviço Railway da API, no ambiente **production**, a variável abaixo. O valor deve
ser uma única linha, sem aspas, espaços ou barras finais:

```env
CORS_ORIGINS=https://55marcas.com.br,https://www.55marcas.com.br,https://crm.55marcas.com.br
BETTER_AUTH_URL=https://api.55marcas.com.br
```

Salve as variáveis e faça um novo deploy da API. O preflight deve responder com
`Access-Control-Allow-Origin: https://crm.55marcas.com.br` e
`Access-Control-Allow-Credentials: true`:

```powershell
curl.exe -i -X OPTIONS "https://api.55marcas.com.br/api/auth/sign-in/email" `
  -H "Origin: https://crm.55marcas.com.br" `
  -H "Access-Control-Request-Method: POST" `
  -H "Access-Control-Request-Headers: content-type"
```

Não adicione `*` a `CORS_ORIGINS`: autenticação usa cookies e exige uma origem
explícita. Confirme também que a variável foi alterada no serviço/ambiente de
produção, não em um preview ou em outro serviço Railway.

Adicione `crm.55marcas.com.br` em Custom domains. O `_redirects` incluído garante
que abrir diretamente `/proposta/TOKEN` e `/contrato/TOKEN` carregue o aplicativo.
O CRM e suas páginas públicas têm `noindex` e não devem receber analytics.

Use os domínios finais para testar login: `pages.dev` e `railway.app` não têm a
mesma relação de cookies que os subdomínios de `55marcas.com.br`. As prévias não
estão autorizadas a acessar produção. Desabilite deploys de preview ou conecte-os
a um ambiente de teste separado; não amplie CORS com curingas.

## 6. Proteções e custo das consultas

- `SEARCH_DAILY_LIMIT=30`: no máximo 30 reservas de consulta nas últimas **24h
  corridas**, somadas entre visitantes e réplicas. Não é uma franquia por cliente.
  Falhas também contam, porque uma consulta falha pode gerar cobrança no provedor.
- A reserva usa lock transacional no Postgres antes de chamar a InfoSimples;
  requisições concorrentes não podem ultrapassar esse teto pela checagem em paralelo.
- O limite por IP existente é uma proteção auxiliar: headers de IP precisam de
  uma cadeia de proxies confiável. Não trate esse limite como defesa anti-bot
  suficiente. O teto global independe do IP recebido.
- `SEARCH_ENABLED=false` interrompe consultas externas e mantém o CRM funcionando.
- Ajuste o teto ao custo unitário do seu contrato InfoSimples e configure também
  o limite/alertas na conta do provedor. O teto da aplicação não limita outras
  integrações que usem o mesmo token nem cobranças fora deste sistema.
- Ao esgotar o teto, a consulta é recusada antes da captura desse novo lead.
  Para campanhas ou risco de abuso, implemente Turnstile com verificação no
  servidor antes de aumentar o teto. **Turnstile ainda não está implementado.**
- Não registre corpos de requisição, cookies, URLs com tokens ou senhas em logs.
  Revise a retenção dos logs do provedor. Não habilite Session Replay no CRM.

## 7. Backup e operação — fazer antes de captar clientes reais

Backup automático remoto ainda não foi provisionado. Não confunda persistência
do R2 ou histórico do Neon com uma cópia independente e restaurável.

1. Faça um dump do Neon com `pg_dump -Fc --no-owner --no-acl`, usando a conexão
   **direta**, cliente PostgreSQL 17 (ou versão compatível com o servidor) e SSL.
   Prefira parâmetros PGHOST/PGDATABASE/PGUSER e arquivo de senhas protegido a
   colocar uma URL com senha no histórico ou na linha de comando. Use a opção
   `--file` para o destino; evite redirecionar binário com `>` no PowerShell antigo.
2. Guarde a cópia criptografada fora do Neon, com acesso restrito. Nunca em Git,
   em Pages, no bucket público ou em artefatos públicos de CI.
3. Copie também os objetos de `55marcas-documentos` para outro armazenamento
   privado. O dump só contém os metadados, **não contém os PDFs**. Inicialmente,
   pause uploads durante a cópia de banco + arquivos para obter um conjunto
   consistente; preserve as chaves `contracts/...` e os hashes.
4. Restaure o dump com `pg_restore --no-owner --no-acl --exit-on-error` em um banco
   **novo e vazio, separado de produção**. Não use `--clean` em produção. Confira
   tabelas, histórico de migrations, usuário de teste, leads e downloads com os
   hashes correspondentes. Não considere backup validado só porque foi criado.
5. Agende essa rotina ao menos diariamente em um executor confiável, com alerta
   de falha, retenção definida (ex.: 7 diárias e 4 semanais) e cópia antes de cada
   mudança de banco. Guarde a chave de criptografia em um gerenciador de senhas.
   O agendamento/credenciais dependem da conta escolhida e ficam pendentes.
6. Monitore `/health` externamente para disponibilidade da API. Evite pingar
   `/ready` a cada minuto: isso acessa o Neon e pode impedir sua suspensão, consumindo
   a franquia de computação. Use `/ready` no deploy e em verificações controladas.

Revise também identificação do prestador, dados de contato, textos de privacidade,
consentimento, retenção de dados e conteúdo do contrato antes do lançamento.
O deploy técnico não substitui essa revisão do negócio.

## 8. Checklist de liberação

- [ ] DNS e HTTPS ativos nos três domínios (e www).
- [ ] API e migrations publicadas no banco novo; `/health` e `/ready` retornam 200.
- [ ] Login, recarregamento da sessão e logout funcionam no domínio final do CRM.
- [ ] Usuário sem sessão e usuário fora da allowlist não acessam dados/downloads.
- [ ] Uma consulta real, conscientemente paga, cria lead em “somente consulta”.
- [ ] “Quero registrar” promove o interesse sem bloquear/alterar as etapas do operador.
- [ ] Proposta e contrato abrem em janela anônima pelos links enviados.
- [ ] PDF assinado enviado pelo CRM pode ser baixado depois de um redeploy da API.
- [ ] Compare o SHA-256 do original com o download: os bytes precisam ser idênticos.
- [ ] Confirmação manual de pagamento funciona sem pré-requisito de assinatura.
- [ ] CORS bloqueia origem não autorizada; API e documentos não são cacheados.
- [ ] Bucket não é público; alertas de custo e teto de consultas definidos.
- [ ] Backup e teste de restauração concluídos; segredos guardados fora do repositório.

Não foi feita consulta paga nem teste remoto com dados reais durante a preparação.
Depois do checklist, libere o tráfego/campanhas. Em falha de publicação, restaure
o deploy anterior no Pages/Railway; rollback de código **não desfaz migrations**.
Mudanças futuras de schema devem ser compatíveis com a versão anterior durante
a troca. Nunca restaure um dump sobre produção sem planejamento e validação.

## Referências oficiais

- [Pages: build e runtimes](https://developers.cloudflare.com/pages/configuration/build-image/)
- [Pages: domínios próprios](https://developers.cloudflare.com/pages/configuration/custom-domains/)
- [Railway: configuração versionada](https://docs.railway.com/config-as-code/reference)
- [Railway: domínios](https://docs.railway.com/networking/domains/working-with-domains)
- [Railway CLI](https://docs.railway.com/guides/cli)
- [Bun: armazenamento S3/R2](https://bun.sh/docs/runtime/s3)
- [Neon: exportação e importação](https://neon.com/docs/import/migrate-from-neon)
