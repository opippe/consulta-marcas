# Proteção das consultas públicas

## Passo a passo nos painéis

Este roteiro usa os nomes registrados na documentação do projeto: site público
`55marcas-site` no Cloudflare Pages, API `consulta-marcas` no Railway (ambiente
`production`) e repositório `opippe/consulta-marcas` no GitHub. Não consultei suas
contas para confirmar se esses nomes foram alterados.

**Resposta direta:** `NEXT_PUBLIC_TURNSTILE_SITE_KEY` é cadastrada no painel do
Cloudflare Pages, no projeto **55marcas-site**, ambiente **Production**. A
`TURNSTILE_SECRET_KEY` é cadastrada no painel do Railway, serviço **consulta-marcas**,
ambiente **production**, aba **Variables**. Não é preciso criar um arquivo `.env`
no Railway. Os `.env` locais só configuram o programa rodando no seu computador.

| Informação | Onde cadastrar |
| --- | --- |
| Criar o widget e obter as duas chaves | Cloudflare → Turnstile |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare → Workers & Pages → 55marcas-site → Settings → Variables and Secrets → Production |
| A mesma `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | GitHub → opippe/consulta-marcas → Settings → Secrets and variables → Actions → Variables |
| `TURNSTILE_SECRET_KEY`, `TURNSTILE_HOSTNAMES`, limites e identificação por IP | Railway → ambiente production → serviço consulta-marcas → Variables |
| Migration do banco | Executada pelo pré-deploy do Railway, no banco Neon já configurado |

### 1. No Railway: manter as consultas desligadas durante a preparação

1. Abra o projeto no painel do Railway e selecione o ambiente **production**.
2. Clique no serviço **consulta-marcas** e abra **Variables**.
3. Edite ou crie `SEARCH_ENABLED`, com valor `false`.
4. Aplique as alterações pendentes pelo botão **Deploy** e aguarde o serviço ficar
   ativo. Só salvar uma variável não altera o processo que já está rodando.

Isso pausa as consultas pagas enquanto você prepara a atualização. Não apague as
variáveis existentes de banco, autenticação ou InfoSimples.

### 2. Na Cloudflare: criar o widget Turnstile

1. Entre no painel da Cloudflare e abra **Turnstile** pelo menu da conta.
2. Clique em **Add widget** (Adicionar widget).
3. Em **Widget name**, escreva `55 Marcas - consultas`.
4. Em **Hostname management**, adicione `55marcas.com.br` e `www.55marcas.com.br`,
   sem `https://` nem barra no final. O domínio raiz também cobre subdomínios no
   Turnstile; a API fará uma conferência adicional dos hostnames exatos.
5. Em **Widget mode**, selecione **Managed**. Deixe **Pre-clearance** desativado.
6. Clique em **Create**.
7. Você receberá **Site key** (pública) e **Secret key** (secreta). Mantenha a tela
   aberta para copiar cada valor para o destino indicado nos próximos passos.

O formulário já foi programado. Não precisa copiar snippets HTML da Cloudflare.

### 3. No Cloudflare Pages: cadastrar a chave pública do site

1. Abra **Workers & Pages** e selecione o projeto Pages **55marcas-site**.
2. Entre em **Settings → Variables and Secrets**. Selecione **Production**.
   Em algumas versões do painel, essa seção aparece como **Environment variables**.
3. Clique em **Add**. Cadastre uma variável de texto:
   - Nome: `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
   - Valor: a **Site key** copiada do Turnstile, sem aspas.
4. Salve e confirme que já existe
   `NEXT_PUBLIC_API_BASE_URL=https://api.55marcas.com.br` nesse mesmo ambiente.

A chave pública é usada durante a compilação: o site só receberá o novo valor
depois de uma nova publicação. Vamos publicar no passo 6. Não coloque a **Secret
key** aqui. O projeto **55marcas-crm** não precisa dessas novas variáveis.

### 4. No GitHub: permitir que a validação automática compile o site

1. Abra o repositório **opippe/consulta-marcas**.
2. Entre em **Settings → Secrets and variables → Actions → Variables**.
3. Clique em **New repository variable**.
4. Use o nome `NEXT_PUBLIC_TURNSTILE_SITE_KEY` e cole a mesma **Site key pública**
   usada no Pages.
5. Salve. Use a aba **Variables**, não é uma chave secreta.

O workflow `Validate production` foi ajustado para ler essa variável. Configurar
somente o Pages não configura o GitHub Actions, pois são serviços independentes.
Não cadastre a Secret key ou credenciais do banco de produção no GitHub.

### 5. No Railway: cadastrar a chave secreta e os limites

Volte a **production → consulta-marcas → Variables**. Use **New Variable** para
cada entrada abaixo (ou edite a existente). Digite valores sem aspas:

| Nome | Valor durante a preparação |
| --- | --- |
| `TURNSTILE_SECRET_KEY` | A **Secret key** copiada do widget Turnstile |
| `TURNSTILE_HOSTNAMES` | `55marcas.com.br,www.55marcas.com.br` |
| `CLIENT_IP_MODE` | `railway` |
| `CLIENT_IP_VERIFIED` | `false` |
| `SEARCH_ENABLED` | `false` |
| `SEARCH_ATTEMPTS_PER_MINUTE` | `2` |
| `SEARCH_IP_HOURLY_LIMIT` | `10` |
| `SEARCH_WHATSAPP_DAILY_LIMIT` | `10` |
| `SEARCH_DAILY_LIMIT` | `30` |
| `PUBLIC_READS_PER_MINUTE` | `60` |
| `PUBLIC_WRITES_PER_MINUTE` | `10` |

Preserve o `RATE_LIMIT_SALT` já existente se ele for um segredo aleatório válido
de pelo menos 32 caracteres. Caso ainda esteja ausente ou seja um placeholder,
abra o **PowerShell no seu computador**, gere um valor com o comando abaixo e
cole o resultado em uma variável `RATE_LIMIT_SALT` no **Railway**:

```powershell
node.exe -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Esse comando apenas gera o valor; ele não configura o Railway automaticamente.
Não compartilhe o resultado nem substitua um salt válido sem necessidade.

Revise as alterações pendentes e clique em **Deploy** para aplicá-las.
Neste roteiro não é necessário criar Worker, `PUBLIC_PROXY_SECRET` ou
`PUBLIC_PROXY_IP_MODE`: o navegador acessará diretamente a API no Railway.

### 6. Publicar o código e aplicar a migration pelo Railway

1. O código implementado, os arquivos de migration e o ajuste do workflow precisam
   estar em um commit e chegar à branch **main** do repositório. Arquivos apenas
   no seu computador ainda não estão nos servidores. Esse passo é a publicação
   do código, não somente o cadastro das variáveis.
2. Conforme a integração descrita no projeto, o envio para `main` dispara o
   GitHub Actions, Cloudflare Pages e Railway. Aguarde os três terminarem.
3. No **GitHub → Actions**, abra **Validate production** e confirme sucesso.
4. No **Cloudflare → Workers & Pages → 55marcas-site → Deployments**, confirme que
   a publicação corresponde ao commit novo e terminou com sucesso. Se precisar
   recompilar após corrigir uma variável, use **Retry deployment** na publicação
   correspondente ao código novo; repetir uma publicação antiga usa código antigo.
5. No **Railway → consulta-marcas → Settings → Deploy**, confirme que o
   **Pre-deploy Command** é `bun run db:migrate`. O arquivo `api-bun/railway.toml`
   já contém essa configuração; o campo pode aparecer controlado pelo arquivo.
6. No **Railway → Deployments**, abra a publicação nova e seus logs. O pré-deploy
   deve mostrar `Database migrations completed.` e o serviço deve ficar ativo.
   As migrations pendentes, incluindo `0010_bitter_korg`, são aplicadas ali usando
   `DATABASE_MIGRATION_URL`, a conexão direta do Neon já cadastrada.

Não cole o SQL manualmente no Neon e não execute a migration de produção pelo
PowerShell para este fluxo. Se o pré-deploy falhar, leia o erro e mantenha as
consultas desligadas. Não altere o comando de build do Pages nem publique pelo Sites.

### 7. Testar a identificação por IP sem fazer consultas pagas

Faça em homologação com a mesma entrada, ou durante a preparação do projeto sem
visitantes utilizando o site. Este teste reduz temporariamente o limite de leituras.

1. No **Railway → consulta-marcas → Variables**, mantenha `SEARCH_ENABLED=false`,
   altere `CLIENT_IP_VERIFIED=true` e `PUBLIC_READS_PER_MINUTE=2`, aplique pelo
   botão **Deploy** e aguarde o serviço ativo.
2. `CLIENT_IP_VERIFIED` não testa o IP sozinho: é uma declaração usada pelo código.
   Estamos habilitando temporariamente as leituras para executar o teste, mantendo
   a chamada paga desligada. Se houver falha, volte o valor para `false`.
3. Aguarde 65 segundos sem usar as páginas de resultados. No **PowerShell do seu
   computador**, execute o bloco abaixo. Primeiro são feitas três leituras normais;
   depois os cabeçalhos são testados separadamente, com a cota já esgotada:

```powershell
$consultaTesteUrl = 'https://api.55marcas.com.br/api/consultas?token=teste'
1..3 | ForEach-Object { curl.exe -sS -o NUL -w "%{http_code}\n" $consultaTesteUrl }
curl.exe -sS -o NUL -w "%{http_code}\n" -H "X-Real-IP: 203.0.113.10" $consultaTesteUrl
curl.exe -sS -o NUL -w "%{http_code}\n" -H "X-Forwarded-For: 203.0.113.11" $consultaTesteUrl
curl.exe -sS -o NUL -w "%{http_code}\n" -H "X-Public-Client-IP: 203.0.113.12" $consultaTesteUrl
```

O resultado esperado é **400, 400, 429, 429, 429, 503**, nessa ordem. Os dois
primeiros 400 são intencionais: o token `teste` é inválido. O terceiro pedido
confirma o limite de leituras. Os dois 429 seguintes demonstram que os cabeçalhos
não abriram nova cota. O 503 demonstra que o encaminhamento sem credencial foi
recusado. Os IPs acima são exemplos reservados para documentação, não precisam
ser substituídos. Nenhuma dessas chamadas consulta a InfoSimples.

**Correção do roteiro anterior:** não envie `CF-Connecting-IP` junto dos outros
cabeçalhos. A Cloudflare pode rejeitar esse pedido antes da API com HTTP 403 e
`error code: 1000`. Esse comportamento é documentado e foi reproduzido em
09/09/2026 em `api.55marcas.com.br`. Não demonstra falha do limitador e não exige
desativar a proteção da Cloudflare. Na mesma verificação, três leituras normais
retornaram 400, 400 e 429; os testes separados de `X-Real-IP` e `X-Forwarded-For`
mantiveram 429. Isso não substitui o teste de independência entre redes.

Se precisar identificar um 403, use `curl.exe -sS -i` no lugar de `-o NUL -w ...`
para ver cabeçalhos e corpo. O status sozinho não informa qual camada recusou o
pedido. [Cloudflare: causas do erro 1000](https://developers.cloudflare.com/support/troubleshooting/http-status-codes/cloudflare-1xxx-errors/error-1000/).

4. Após saturar a cota, conecte o computador a outra rede com IP de saída diferente
   (por exemplo, o acesso pessoal do celular usando dados móveis) e execute uma
   leitura simples: `curl.exe -sS -o NUL -w "%{http_code}\n" $consultaTesteUrl`.
   Deve responder **400**, sem compartilhar o bloqueio anterior. Faça isso dentro
   da mesma janela de 60 segundos; se ela expirar, a comparação será inconclusiva.
5. No **Railway → consulta-marcas → Settings → Networking**, copie o domínio
   público `…up.railway.app`, se existir. Após esperar outra janela de 65 segundos,
   repita o bloco substituindo apenas `api.55marcas.com.br` por esse domínio.
   Faça também a verificação de independência entre redes. Se não houver domínio
   Railway público, registre isso; não é necessário criar um só para este teste.
6. Se a terceira leitura normal der 400, se os cabeçalhos permitirem novas leituras
   com a cota ainda esgotada, se todas derem 503 ou se redes diferentes dividirem
   o bloqueio, não ative as consultas. Volte `CLIENT_IP_VERIFIED=false`, restaure
   `PUBLIC_READS_PER_MINUTE=60`, aplique no Railway e corrija a entrada antes de seguir.
   Os testes são verificações práticas; uma mudança futura de proxy/CDN exige repetir
   a validação e revisar qual plataforma controla o cabeçalho.

### 8. Ativar as consultas e conferir o formulário

Somente depois dos testes do passo 7 passarem, no **Railway → consulta-marcas →
Variables**, deixe:

```env
CLIENT_IP_VERIFIED=true
PUBLIC_READS_PER_MINUTE=60
SEARCH_ENABLED=true
```

Aplique com **Deploy** e aguarde. Abra `https://55marcas.com.br`, avance para a
segunda etapa do formulário e confira a verificação de segurança. Uma consulta
completa nessa etapa usa a InfoSimples e pode consumir saldo e uma unidade da cota.
Não faça consultas repetidas apenas para testar bloqueios: os testes anteriores
verificam limites sem chamar o provedor pago.

Para pausar depois: **Railway → Variables → SEARCH_ENABLED=false → Deploy**.

### Se algo não funcionar

| Sintoma | Onde verificar |
| --- | --- |
| Build pede `NEXT_PUBLIC_TURNSTILE_SITE_KEY` no Pages | Variável em Production do projeto **55marcas-site**, seguida de nova publicação |
| Mesmo erro no GitHub Actions | Repository variable do GitHub e commit contendo o ajuste do workflow |
| Formulário mostra verificação indisponível | Chave pública real, hostname no widget Turnstile e publicação nova da landing |
| API recusa desafio (`CHALLENGE_INVALID`) | Secret key do mesmo widget e `TURNSTILE_HOSTNAMES` no **Railway** |
| API responde `PROTECTION_UNAVAILABLE` | Flags de identificação, `RATE_LIMIT_SALT`, configuração Turnstile, acesso ao banco e logs do Railway |
| API responde `SEARCH_DISABLED` | `SEARCH_ENABLED` no Railway ainda está `false` ou a alteração não foi aplicada |
| Consulta bloqueada com 429 | Aguardar o tempo informado; `SEARCH_GLOBAL_LIMIT` indica teto compartilhado por todos os visitantes |

Fontes dos caminhos dos painéis: [Turnstile](https://developers.cloudflare.com/turnstile/get-started/widget-management/dashboard/),
[variáveis do Pages](https://developers.cloudflare.com/pages/functions/bindings/),
[variáveis do Railway](https://docs.railway.com/variables),
[pré-deploy Railway](https://docs.railway.com/deployments/pre-deploy-command),
[variáveis do GitHub Actions](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-variables).

---

## Referência técnica

As seções abaixo detalham o funcionamento para manutenção. Para configurar o
projeto nos painéis, siga primeiro os oito passos acima.

## Política

Os limites são compartilhados no PostgreSQL, em janelas móveis, e sobrevivem a
reinicializações e réplicas. Não dependem de cookies, JavaScript, CORS ou login.

| Variável na API Bun | Padrão | Contabilização |
| --- | ---: | --- |
| `SEARCH_ATTEMPTS_PER_MINUTE` | 2 | Envios por IP a `POST /api/marcas`, inclusive campos e desafios inválidos |
| `SEARCH_IP_HOURLY_LIMIT` | 10 | Reservas por IP nos últimos 60 minutos |
| `SEARCH_WHATSAPP_DAILY_LIMIT` | 10 | Reservas por WhatsApp normalizado nas últimas 24 horas |
| `SEARCH_DAILY_LIMIT` | 30 | Reservas globais nas últimas 24 horas |
| `PUBLIC_READS_PER_MINUTE` | 60 | Soma de `GET /api/consultas` e `GET /api/leads/interest`, por IP |
| `PUBLIC_WRITES_PER_MINUTE` | 10 | Soma de `POST /api/leads` e `POST /api/leads/interest`, por IP |

Valores inteiros entre 1 e 10000. Tentativas já recusadas pelo limitador não
prolongam a janela. As demais tentativas aceitas pelo limitador contam mesmo
quando a validação de campos ou o desafio falhar. Reservas só são criadas após o
Turnstile; falhas da InfoSimples continuam consumindo a reserva e preservando o lead.
O lock da reserva termina antes da chamada paga. A contagem usa o relógio do banco.

O telefone é uma proteção complementar: não verificamos posse do WhatsApp.
Redes compartilhadas dividem a cota por IP. Esgotar o teto global também bloqueia
visitantes legítimos. A aplicação não substitui proteção de rede contra DDoS nem
os limites de cobrança da conta InfoSimples.

## Identificação e configuração

- `RATE_LIMIT_SALT`: segredo estável, aleatório, mínimo de 32 caracteres em produção.
  O IP canônico é persistido apenas como SHA-256 com esse segredo. Trocar o salt
  reinicia a identificação por IP; faça isso com consultas desabilitadas e espere
  a janela anterior expirar. O teto global e o telefone continuam contando.
- `CLIENT_IP_MODE=railway`: aceita somente `X-Real-IP` do ingresso Railway.
  Não há fallback para `CF-Connecting-IP` ou `X-Forwarded-For`.
- `CLIENT_IP_MODE=local`: somente desenvolvimento, usando `requestIP()` do Bun e
  aceitando apenas conexão loopback. No proxy local da landing, o Bun identifica
  a conexão do servidor local; visitantes locais compartilham essa cota.
- `CLIENT_IP_MODE=proxy`: somente `X-Public-Client-IP` acompanhado de
  `X-Public-Proxy-Secret` válido. `PUBLIC_PROXY_SECRET` deve ser distinto dos demais
  segredos, com pelo menos 32 caracteres. O modo Railway também aceita esse
  encaminhamento autenticado para compatibilidade com os proxies opcionais.
  Cabeçalhos parciais ou credencial incorreta são recusados, sem fallback.
- Worker opcional: configurar o mesmo segredo e extrair o IP do ingresso Cloudflare.
  Proxy Vinext: configurar `PUBLIC_PROXY_IP_MODE=cloudflare` ou `railway`, conforme
  a plataforma que realmente controla esse ingresso. Não habilitar esse modo em
  um servidor exposto diretamente que aceite o cabeçalho do cliente.
- Nunca expor o segredo do proxy em variável `NEXT_PUBLIC_*`. Usar HTTPS entre
  servidores fora do desenvolvimento local.
- `CLIENT_IP_VERIFIED=true`: confirmação operacional obrigatória para rotas públicas
  em produção. Ausência de identidade, configuração ou banco produz recusa segura.

A arquitetura principal continua landing estática → API Railway. Não é necessário
ativar o Worker. Se houver outro proxy/CDN diante do Railway, o IP visto poderá ser
o desse proxy: valide o caminho completo antes de marcar a entrada como verificada.

## Turnstile e interface

Criar um widget **Managed** na Cloudflare com os hostnames exatos da landing.
Configurar `NEXT_PUBLIC_TURNSTILE_SITE_KEY` no ambiente da landing e
`TURNSTILE_SECRET_KEY` apenas na API Bun. Em `TURNSTILE_HOSTNAMES`, listar hostnames
separados por vírgula, sem protocolo, caminhos, curingas ou portas.

O formulário envia `turnstileToken`; o servidor chama Siteverify com timeout de
8 segundos, exige `success=true`, hostname permitido e `action=trademark_search`.
Tokens são de uso único e expiram em cinco minutos. Não há bypass em produção.
O componente renova o desafio após envio, expiração ou tentativa manual de recuperação.
Se scripts externos estiverem bloqueados, a consulta fica indisponível e oferece
nova tentativa de verificação. Se adicionar CSP, autorize o script e iframe de
`https://challenges.cloudflare.com`.

As chaves oficiais de teste estão nos `.env.example`; são rejeitadas em produção.
Use `localhost` localmente. Nunca use chave secreta real em testes automatizados.

Erros mantêm `error` e acrescentam `code`: `RATE_LIMITED`, `SEARCH_LIMITED`,
`SEARCH_GLOBAL_LIMIT`, `CHALLENGE_INVALID`, `PROTECTION_UNAVAILABLE`, `SEARCH_DISABLED`.
HTTP 429 inclui `retryAfterSeconds` e `Retry-After` em segundos, com o maior tempo
entre as cotas bloqueadoras. Os proxies preservam o cabeçalho e o CORS o expõe.
A interface preserva campos, anuncia erros e impede reenvios durante a espera,
sem enviar automaticamente ao terminar. Ler resultados nunca consulta a InfoSimples.

## Migration, retenção e ativação futura

1. Manter `SEARCH_ENABLED=false` durante a preparação. Aplicar a migration
   `0010_bitter_korg` no ambiente autorizado: ela adiciona eventos, índices e
   `searches.request_whatsapp`. Preenche consultas antigas a partir do contato
   associado quando disponível; consultas sem contato continuam contando no teto
   global. O snapshot do telefone não muda quando o contato é editado.
2. Configurar limites, segredos e widget. Preparar a landing e a API juntas, pois
   clientes antigos sem token Turnstile passarão a ser recusados.
3. Em ambiente de homologação com o mesmo ingresso, manter consultas desligadas,
   habilitar a identificação para testar somente as rotas de leitura e configurar
   temporariamente `PUBLIC_READS_PER_MINUTE=2`. Usar um token inválido, sem dados reais:
   duas leituras normais devem responder 400 e a terceira 429. Testar `X-Real-IP`
   e `X-Forwarded-For` separadamente não pode criar novas cotas. `CF-Connecting-IP`
   pode ser recusado antes da API pela Cloudflare com 403/1000; esse pedido não
   deve ser usado para contabilizar as três leituras do teste básico.
   Uma segunda conexão com IP de saída diferente deve possuir cota independente.
   Repetir tanto pelo domínio personalizado quanto pelo domínio Railway, e pelos
   proxies opcionais que forem realmente utilizados. Cabeçalhos `X-Public-*`
   sem credencial válida devem retornar 503. Não registrar IPs durante a verificação.
4. Se qualquer teste falhar, manter `SEARCH_ENABLED=false` e `CLIENT_IP_VERIFIED=false`
   até corrigir o ingresso. Nunca resolver aceitando cabeçalhos adicionais livremente.
   Após validar o caminho real, registrar a data e configuração testadas, restaurar
   o limite de leituras e definir `CLIENT_IP_VERIFIED=true`. Configurar as chaves
   reais antes de habilitar `SEARCH_ENABLED=true`.
5. Acompanhar `public_protection_block` (rota e código) e somar `search_reserved.count`
   nos logs. Não há identificadores pessoais nesses eventos. `public_rate_cleanup_failed`
   indica falha de manutenção; investigar sem habilitar logs de corpos ou tokens.
   O Bun remove eventos com mais de uma hora, em lotes de até 10000 por minuto.
   Consultas históricas seguem a retenção do CRM; não são apagadas pelo limitador.

Não foram incluídos deploy, alteração de DNS ou cadastro de chaves. O teste do
ingresso real permanece uma condição de ativação. Reverter o código não desfaz
a migration; desabilitar consultas é a primeira medida de contenção.

## Testes direcionados

Na pasta `api-bun`:

```sh
bun test tests/public-protection.test.ts
PROTECTION_TEST_POSTGRES_URL=postgresql://postgres@127.0.0.1:55439/postgres bun test tests/public-protection.integration.test.ts
```

No PowerShell, definir a variável com `$env:PROTECTION_TEST_POSTGRES_URL='...'`
antes do segundo comando. A URL deve ser de um PostgreSQL **local**, com permissão
para criar bancos. A suíte ignora `DATABASE_URL`, cria um banco exclusivo com nome
aleatório, aplica as migrations e remove somente esse banco ao terminar. Não aponta
para Neon ou outros bancos externos. Toda chamada HTTP externa é simulada ou recusada.
Execute essa suíte em processo separado do teste antigo de leads, que usa mocks de módulos.

Na raiz: `npm run lint`, `npm exec -- tsc -p tsconfig.landing.json --noEmit` e
`npm run typecheck:operations`. Não usar `npm test`, pois chama build.

Referências: [identificação Railway](https://docs.railway.com/networking/public-networking/specs-and-limits),
[Siteverify](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/),
[chaves de teste](https://developers.cloudflare.com/turnstile/troubleshooting/testing/).
