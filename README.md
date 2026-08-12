# Flavio Bolsonaro Marcas

Landing page e diagnóstico preliminar de marcas para a Flavio Bolsonaro Marcas, usando a
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
