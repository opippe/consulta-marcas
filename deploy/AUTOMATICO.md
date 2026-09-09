# Deploy automático da 55 Marcas

## Uso diário

Depois da configuração única abaixo, envie os commits para `main`:

```powershell
git push origin main
```

O push dispara os builds do Cloudflare Pages (landing e CRM), o workflow
`Validate production` no GitHub e o deploy da API no Railway. Não precisa executar
build local, Railway CLI ou criar o administrador novamente a cada atualização.

Quando mudar `api-bun/src/db/schema.ts` ou `api-bun/src/db/auth-schema.ts`, gere
e revise a migração antes de fazer o commit:

```powershell
npm run db:generate:operations
```

Inclua o schema e os arquivos gerados em `api-bun/drizzle` no mesmo commit.
No pré-deploy, o Railway executa `bun run db:migrate` usando a conexão direta
do Neon (`DATABASE_MIGRATION_URL`). Somente as migrations pendentes são aplicadas;
uma falha impede a nova API de entrar no ar.

Mantemos `generate` + `migrate` em produção em vez de `drizzle-kit push`: assim
o SQL fica revisável, versionado e testado antes de chegar ao banco real.
Nunca reescreva uma migration aplicada. Dados iniciais e tarefas pontuais, como
habilitar o primeiro administrador, não fazem parte de cada deploy.

## Configuração única nos provedores

### Railway — serviço `consulta-marcas`, ambiente `production`

Em 07/09/2026, foi habilitado e confirmado o gatilho GitHub de `main` para o
serviço existente no ambiente `production`. O pré-deploy com migrations já está
configurado. Se precisar reabilitar o gatilho futuramente, execute:

```powershell
npm run deploy:enable
```

O comando usa os IDs do serviço/ambiente existentes, consulta antes de criar e não
duplica um gatilho já habilitado. Ele não publica o código local. Se retornar que
ninguém no projeto tem acesso ao repositório, conecte a conta GitHub correta no
Railway, conceda acesso a `opippe/consulta-marcas` e execute novamente.

- GitHub: `opippe/consulta-marcas`, trigger branch `main`, autodeploy habilitado.
- Root Directory: `/api-bun`, Dockerfile da API.
- Pre-deploy: `bun run db:migrate`; healthcheck: `/ready`.
- Preserve `DATABASE_URL` (pooled), `DATABASE_MIGRATION_URL` (direta), os segredos
  e demais variáveis existentes. Não copie esses segredos para o GitHub Actions.
- Depois que o workflow `Validate production` estiver no GitHub, habilite
  **Wait for CI** nas configurações do serviço para aguardar sua aprovação.
  Se configurar esse campo também pelo IaC, use `checkSuites: true` nas opções
  de `github(...)` em `.railway/railway.ts` e revise o plano antes de aplicar.

### Cloudflare Pages — `55marcas-site` e `55marcas-crm`

Em cada projeto, confirme GitHub conectado, production branch `main` e
**Enable automatic production branch deployments** habilitado. Raiz `/` em ambos.
Mantenha previews desligados ou ligados a uma API de testes separada.

Variáveis de build comuns: `NODE_VERSION=22.13.0`, `BUN_VERSION=1.3.2`,
`SKIP_DEPENDENCY_INSTALL=true`.

| Projeto | Build command | Output directory |
| --- | --- | --- |
| `55marcas-site` | `npm ci && npm run build:pages` | `dist/client` |
| `55marcas-crm` | `bun install --cwd api-bun --frozen-lockfile && bun install --cwd crm-web --frozen-lockfile && bun run --cwd crm-web build` | `crm-web/dist` |

Na landing: `NEXT_PUBLIC_API_BASE_URL=https://api.55marcas.com.br`.
Também na landing: `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, com a **Site key pública**
do widget Turnstile real, em **Settings → Variables and Secrets → Production**.
No GitHub, cadastrar a mesma chave pública em **Settings → Secrets and variables →
Actions → Variables**, com o mesmo nome, para o workflow de validação compilar o site.
A `TURNSTILE_SECRET_KEY` fica somente no Railway, em Variables do serviço da API.
Veja o [passo a passo de ativação](../docs/protecao-consultas.md#passo-a-passo-nos-painéis).
No CRM: `VITE_API_BASE_URL=https://api.55marcas.com.br` e
`VITE_PUBLIC_PROPOSAL_URL=https://crm.55marcas.com.br`.

Esses valores ficam salvos no Pages; não é necessário exportá-los no PowerShell
para cada deploy. O workflow antigo `Deploy to GitHub Pages` é legado e não
deve ser usado para publicar estes projetos.

## Validação e limites do fluxo

O workflow `.github/workflows/validate-production.yml` roda em PRs e pushes para
`main`: instala dependências travadas, executa lint, detecta schema sem migração,
aplica migrations em um Postgres descartável, testa cadastro/login/permissões e
compila os dois frontends. Não altera o banco de produção.

Pages e Railway publicam independentemente. O sucesso de um não garante o outro,
e Wait for CI no Railway não bloqueia o Pages. Para exigir aprovação antes de
chegar à `main`, configure uma regra no GitHub exigindo PR e o check
`Build and database checks`. Verifique o status dos três serviços após cada push.
Alterações entre frontend/API e banco precisam ser compatíveis durante a troca;
remoções/renomeações de campos devem ocorrer em etapas. Rollback de código não
desfaz SQL já aplicado.

## Comandos ocasionais, também no Windows

```powershell
npm run build:production        # valida os builds com URLs públicas de produção
npm run railway -- status      # consulta o projeto vinculado
npm run railway -- login       # autentica, se necessário
npm run infra:plan             # só quando .railway/railway.ts mudar
npm run infra:apply            # aplica o plano revisado
```

O wrapper encontra o executável nativo `railway.exe` e define `_` automaticamente
para o SDK IaC. Não precisa montar `$railwayExe` manualmente. Instale a CLI uma vez
com `npm install --global @railway/cli`, se ainda não estiver instalada.
Esses comandos usam o projeto/ambiente vinculados pela CLI; confira `status`
antes de aplicar infraestrutura.

`npm run build:production` usa Node 22.13.0 pelo cache npm, sem trocar seu Node
instalado. Na primeira execução pode precisar baixar esse runtime. Isso reproduz
a versão do Pages e evita a falha de encerramento observada com Vinext/Node 24
no Windows.

Referências: [Railway autodeploy e Wait for CI](https://docs.railway.com/deployments/github-autodeploys),
[pré-deploy](https://docs.railway.com/deployments/pre-deploy-command),
[Pages Git](https://developers.cloudflare.com/pages/configuration/git-integration/),
[migrações Drizzle](https://orm.drizzle.team/docs/migrations).
