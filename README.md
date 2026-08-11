# Consulta de marcas

Site local para pesquisar processos de marcas do INPI usando a API da Infosimples.

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

Para validar a versão de produção local:

```bash
npm run build
npm test
```
