# Backend operacional

API Bun responsável por persistir consultas da InfoSimples e transformar a
solicitação de análise em lead do CRM.

## Desenvolvimento local

1. Copie `.env.example` para `.env` e preencha os segredos, a URL da API e os
   e-mails autorizados.
2. Inicie um Postgres local. O arquivo `compose.yaml` oferece uma configuração
   opcional para Docker.
3. Execute as migrações com `bun run db:migrate`.
4. Inicie a API com `bun run dev`.
5. Na raiz da landing, configure `OPERATIONS_API_URL=http://localhost:3100` e
   inicie o site normalmente.
6. Para o CRM, crie o primeiro usuário com `bun run admin:create` e remova
   `CRM_ADMIN_PASSWORD` do `.env` logo depois.

## Rotas implementadas

- `GET /health`
- `POST /api/marcas`
- `GET /api/consultas?token=...`
- `POST /api/leads`
- `GET /api/leads/interest?token=...`
- `POST /api/leads/interest`
- `GET|POST /api/auth/*`
- `GET /trpc/health`
- `GET /trpc/crm.leads.list`
- `GET /trpc/crm.leads.detail`
- `POST /trpc/crm.leads.updateStatus`
- `GET /trpc/crm.proposals.listByLead`
- `POST /trpc/crm.proposals.create`
- `POST /trpc/crm.proposals.updateDraft`
- `POST /trpc/crm.proposals.markSent`
- `POST /trpc/crm.proposals.getPublicLink`
- `GET /trpc/crm.contracts.listByLead`
- `POST /trpc/crm.contracts.sendContract`
- `POST /trpc/crm.contracts.getPublicLink`
- `GET /trpc/crm.contractDocuments.listByLead`
- `GET /trpc/crm.contractDocuments.listByContract`
- `POST /trpc/crm.contractDocuments.review`
- `GET /trpc/crm.paymentConfirmations.listByLead`
- `GET /trpc/crm.paymentConfirmations.listByContract`
- `POST /trpc/crm.paymentConfirmations.create`
- `POST /trpc/crm.paymentConfirmations.reverse`
- `POST /api/crm/contracts/:contractId/documents` (multipart PDF)
- `GET /api/crm/contracts/:contractId/documents/:documentId/download`
- `GET /trpc/publicProposal.get`
- `POST /trpc/publicProposal.respond`
- `GET /trpc/publicContract.get`

Os tokens públicos das consultas são armazenados somente como hash. O IP não é
persistido em texto; quando `RATE_LIMIT_SALT` está definido, a API grava apenas
uma impressão SHA-256 usada para limitar consultas repetidas.

A pesquisa exige os campos de contato de `leadInputSchema` (sem `searchToken`),
além de `marca`. `registrationRequested` indica o clique prévio no CTA.
Contato, consentimentos e lead são gravados antes da chamada ao provedor.
Consultas que falham ficam com status `FAILED`; não são exibidas como zero resultados.
O endpoint de interesse é idempotente e não altera a etapa comercial.

Validação local com banco migrado: `bun test tests/lead-capture.test.ts`.
O teste simula a InfoSimples e desfaz todos os registros em uma transação.

As operações do CRM exigem uma sessão válida e também verificam
`CRM_ALLOWED_EMAILS` no servidor. Desabilitar ou esconder a interface não
concede acesso aos dados.

Os links públicos de proposta usam assinatura HMAC com
`PROPOSAL_LINK_SECRET`. O banco guarda apenas a versão revogável do token; a
resposta comercial registra nome, data, agente do navegador e uma impressão
irreversível da origem da requisição.

Quando uma proposta é aceita, um contrato é criado com snapshot do conteúdo e
do valor. O envio do contrato habilita o link público para leitura e download
do PDF. A assinatura acontece externamente, pelo GOV.br ou de forma manual; a
página pública não coleta nem registra assinaturas.

O frontend gera o PDF tradicional a partir desse snapshot, sem alterar o
conteúdo armazenado pela API. A edição do texto é permitida somente enquanto o
contrato estiver em `DRAFT`; após o envio, o conteúdo fica imutável.

PDFs assinados recebidos pelo WhatsApp são anexados pelo CRM como versões
independentes. O desenvolvimento local usa `DOCUMENT_STORAGE_DIR` (padrão
`./storage`) e limita arquivos a `MAX_DOCUMENT_SIZE_MB` (padrão 10 MB). O banco
guarda o hash SHA-256 e os metadados; o arquivo nunca usa o nome enviado como
parte do caminho. Antes de publicar, troque o adaptador local por R2/S3 com a
mesma interface.

Confirmações de pagamento são lançamentos manuais, aceitam pagamentos parciais
e podem ser estornadas preservando o histórico. Nenhum lançamento altera o
status do contrato ou bloqueia qualquer operação.
