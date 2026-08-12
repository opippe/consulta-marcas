# Publicação no GitHub Pages

O workflow `.github/workflows/deploy-pages.yml` publica a versão estática do
site sempre que há um push na branch `main`.

## Configuração no GitHub

1. Crie um repositório no GitHub e envie este projeto para a branch `main`.
2. Em **Settings > Pages**, selecione **GitHub Actions** como fonte de publicação.
3. Em **Settings > Secrets and variables > Actions > Variables**, crie:
   - `API_BASE_URL`: endereço público do backend, sem a barra final, por exemplo
     `https://api.exemplo.com`.
   - `PAGES_BASE_PATH` (opcional): use `/` para um domínio personalizado ou um
     repositório `usuario.github.io`. Para um repositório comum, o padrão
     `/nome-do-repositorio` já é aplicado automaticamente.

O workflow compila com `GITHUB_PAGES=true`, gera os arquivos em `dist/client` e
os envia para o ambiente `github-pages`.

## Consulta real de marcas

O GitHub Pages não executa a rota `POST /api/marcas`. A consulta real precisa de
um backend separado, como um Cloudflare Worker, que é o runtime já configurado
neste projeto.

No backend, mantenha `INFOSIMPLES_TOKEN` como segredo e configure `CORS_ORIGIN`
com a origem do site publicado, por exemplo `https://usuario.github.io` (sem o
caminho do repositório). Nunca coloque o token em uma variável `NEXT_PUBLIC_*`.

Sem `API_BASE_URL`, a landing page e a prévia de resultados continuam sendo
publicadas, mas a consulta real não terá um endpoint para chamar.
