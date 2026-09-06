# Publicação da 55 Marcas

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
3. No painel de conexão, copie a URL com **connection pooling** para `DATABASE_URL`.
4. Copie também a URL **sem pooling** para `DATABASE_MIGRATION_URL`.
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
4. Crie uma credencial S3 com permissão **Object Read & Write**, limitada a esse
   bucket. Copie Access Key ID, Secret Access Key e o endpoint S3 exato mostrado.
5. Preencha no Railway: `DOCUMENT_STORAGE_DRIVER=r2`, `R2_BUCKET`, `R2_ENDPOINT`,
   `R2_ACCESS_KEY_ID` e `R2_SECRET_ACCESS_KEY`. Não use o token de API da Cloudflare
   como se fosse a Secret Access Key: são credenciais diferentes.

O adaptador preserva os bytes originais do PDF, sem reescrever a assinatura.
O banco guarda metadados e SHA-256; o arquivo permanece privado. O acesso exige
sessão e e-mail autorizado no CRM. Em produção, a API recusa armazenamento local.
Se decidir migrar dados locais reais, precisará copiar tanto os registros quanto
os arquivos, preservando `storageKey`; o deploy não faz essa migração de dados.

## 4. API no Railway

1. Crie um projeto e um serviço a partir do repositório GitHub; selecione a branch
   que contém o código validado. Não adicione um Postgres Railway: usaremos Neon.
2. Configure **Root Directory** como `/api-bun`.
3. Configure o caminho do arquivo de configuração como `/api-bun/railway.toml`
   (caminho a partir da raiz do repositório). Ele seleciona Docker, migrations no
   pré-deploy e healthcheck `/ready`. O Dockerfile é `Dockerfile` dentro da raiz
   do serviço. Não substitua por um builder automático.
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
10. Mantenha uma réplica e desabilite suspensão do serviço inicialmente. Configure
    alertas de custo e acompanhe o uso. Um limite financeiro rígido pode parar o app.

### Primeiro administrador

Depois das migrations, use um terminal **dentro do serviço Railway**, ou a CLI
Railway autenticada e vinculada ao projeto/ambiente corretos. A CLI precisa ser
instalada separadamente, seguindo sua documentação oficial.

Defina temporariamente `CRM_ADMIN_EMAIL`, `CRM_ADMIN_NAME` e `CRM_ADMIN_PASSWORD`
no ambiente do comando; o e-mail precisa constar em `CRM_ALLOWED_EMAILS`.

```powershell
# Na pasta api-bun; railway run injeta as variáveis do serviço selecionado.
railway run bun run admin:create
```

O comando abre o cadastro apenas em seu próprio processo, não no servidor web.
Remova `CRM_ADMIN_PASSWORD` das variáveis após criar o usuário. Não execute esse
comando como start/pre-deploy. Confira antes que DATABASE_URL aponta ao Neon de
produção e não ao Postgres local. Sem `railway run`, `bun run admin:create` lê o
ambiente local e não cria necessariamente o usuário no banco de produção.

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
