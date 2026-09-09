## INPI / Marcas
Pesquisa marcas no Instituto Nacional da Propriedade Industrial (INPI). Retorna os 100 primeiros resultados da pesquisa.


### Site URL
- https://busca.inpi.gov.br/pePI/jsp/marcas/Pesquisa_classe_basica.jsp

### Request
POST endpoint: `https://api.infosimples.com/api/v2/consultas/inpi/marcas`

### Body encoding (POST)
[`application/x-www-form-urlencoded`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Methods/POST)



| Parameter          | Description                                                                                                                                                                                                                                                                    |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| token*             | The token that will authenticate and authorize the request.                                                                                                                                                                                                                    |
| marca*             | Nome da marca a ser peqsuisada                                                                                                                                                                                                                                                 |
| ncl**              | Código da Classificação de Nice. Por exemplo, para filtrar marcas apenas de <strong>Telecomunicações.</strong>, usar <strong>ncl=38</strong>.                                                                                                                                  |
| tipo**             | Tipo de pesquisa. Possíveis valores: <strong>exata</strong> e <strong>radical</strong>. Por padrão, usa <strong>exata</strong>.                                                                                                                                                |
| pesquisa_textual** | Se deve usar busca textual avançada. Possíveis valores: <strong>false</strong>, <strong>boolean</strong> e <strong>fuzzy</strong>. Por padrão, usa <strong>false</strong>.                                                                                                     |
| pedidos_vivos**    | Se deve buscar apenas pedidos de Marcas e Registros Ativos. Possíveis valores: <strong>true</strong> e <strong>false</strong>. Por padrão, usa <strong>false</strong>.                                                                                                         |
| pagina**           | Número (inteiro) da página da pesquisa a ser retornada. Por padrão, esta consulta retorna apenas a primeira página do site (primeiros 100 resultados). Ao especificar o número da página, é possível avançar além dos primeiros 100 produtos. Valor padrão: <strong>1</strong> |

> * Required parameter.

> ** Optional parameter. Sometimes it is necessary to set at least one of the optional parameters for the service to work properly.


### Response examples (OK)
```json
{
  "code": 200,
  "code_message": "A requisição foi processada com sucesso.",
  "errors": [],
  "header": {
    "api_version": "v2",
    "service": "inpi/marcas",
    "parameters": {
      "marca": "Nome de Exemplo",
      "tipo": "exata"
    },
    "client_name": "Minha Empresa",
    "token_name": "Token de Produção",
    "billable": true,
    "price": "0.2",
    "requested_at": "2021-03-08T10:45:12.000-03:00",
    "elapsed_time_in_milliseconds": 4293,
    "remote_ip": "111.111.111.111",
    "signature": "U2FsdGVkX1/07dUXOqDgAd8rqUv6svWU8AHOMsm/BerQkSoylVhOQU9Pkqx6vjSe8n2Buo3jP5k+3vqnE0gExA=="
  },
  "data_count": 1,
  "data": [
    {
      "processos": [
        {
          "numero": "111111111",
          "prioridade": "11/11/1111",
          "tipo": "Marca Mista",
          "marca": "Nome de Exemplo",
          "registro": "Marca Registrada",
          "situacao": "Registro de marca em vigor",
          "titular": "Nome de Exemplo",
          "classe": "NCL(10) 35"
        },
        {
          "numero": "111111111",
          "prioridade": "11/11/1111",
          "tipo": "Marca Mista",
          "marca": "Nome de Exemplo",
          "registro": "Marca Registrada",
          "situacao": "Registro de marca em vigor",
          "titular": "Nome de Exemplo",
          "classe": "NCL(10) 36"
        },
        {
          "numero": "111111111",
          "prioridade": "11/11/1111",
          "tipo": "Marca Mista",
          "marca": "Nome de Exemplo",
          "registro": "Marca Registrada",
          "situacao": "Registro de marca em vigor",
          "titular": "Nome de Exemplo",
          "classe": "NCL(10) 42"
        },
        {
          "numero": "111111111",
          "prioridade": "11/11/1111",
          "tipo": "Marca Nominativa",
          "marca": "Nome de Exemplo",
          "registro": "Marca Registrada",
          "situacao": "Registro de marca em vigor",
          "titular": "Nome de Exemplo",
          "classe": "NCL(10) 35"
        },
        {
          "numero": "111111111",
          "prioridade": "11/11/1111",
          "tipo": "Marca Nominativa",
          "marca": "Nome de Exemplo",
          "registro": "Marca Registrada",
          "situacao": "Registro de marca em vigor",
          "titular": "Nome de Exemplo",
          "classe": "NCL(10) 36"
        },
        {
          "numero": "111111111",
          "prioridade": "11/11/1111",
          "tipo": "Marca Nominativa",
          "marca": "Nome de Exemplo",
          "registro": "Marca Registrada",
          "situacao": "Registro de marca em vigor",
          "titular": "Nome de Exemplo",
          "classe": "NCL(10) 42"
        },
        {
          "numero": "111111111",
          "prioridade": "11/11/1111",
          "tipo": "Marca Mista",
          "marca": "Nome de Exemplo",
          "registro": "Marca Registrada",
          "situacao": "Registro de marca em vigor",
          "titular": "Nome de Exemplo",
          "classe": "NCL(11) 09 - Pendente (com especificação livre) NCL(11) 09 - Excluída"
        },
        {
          "numero": "111111111",
          "prioridade": "11/11/1111",
          "tipo": "Marca Nominativa",
          "marca": "Nome de Exemplo",
          "registro": "Marca Registrada",
          "situacao": "Registro de marca em vigor",
          "titular": "Nome de Exemplo",
          "classe": "NCL(11) 09 - Pendente (com especificação livre) NCL(11) 09 - Excluída"
        },
        {
          "numero": "111111111",
          "prioridade": "11/11/1111",
          "tipo": "Marca Mista",
          "marca": "Nome de Exemplo",
          "registro": "Marca Registrada",
          "situacao": "Registro de marca em vigor",
          "titular": "Nome de Exemplo",
          "classe": "NCL(11) 38"
        },
        {
          "numero": "111111111",
          "prioridade": "11/11/1111",
          "tipo": "Marca Nominativa",
          "marca": "Nome de Exemplo",
          "registro": "Marca Registrada",
          "situacao": "Registro de marca em vigor",
          "titular": "Nome de Exemplo",
          "classe": "NCL(11) 38"
        },
        {
          "numero": "111111111",
          "prioridade": "11/11/1111",
          "tipo": "Marca Mista",
          "marca": "Nome de Exemplo",
          "registro": "Marca Registrada",
          "situacao": "Registro de marca em vigor",
          "titular": "Nome de Exemplo",
          "classe": "NCL(11) 09 - Pendente (com especificação livre) NCL(11) 09 - Excluída"
        },
        {
          "numero": "111111111",
          "prioridade": "11/11/1111",
          "tipo": "Marca Mista",
          "marca": "Nome de Exemplo",
          "registro": "Marca Registrada",
          "situacao": "Registro de marca em vigor",
          "titular": "Nome de Exemplo",
          "classe": "NCL(11) 35"
        },
        {
          "numero": "111111111",
          "prioridade": "11/11/1111",
          "tipo": "Marca Mista",
          "marca": "Nome de Exemplo",
          "registro": "Marca Registrada",
          "situacao": "Registro de marca em vigor",
          "titular": "Nome de Exemplo",
          "classe": "NCL(11) 36"
        },
        {
          "numero": "111111111",
          "prioridade": "11/11/1111",
          "tipo": "Marca Mista",
          "marca": "Nome de Exemplo",
          "registro": "Marca Registrada",
          "situacao": "Registro de marca em vigor",
          "titular": "Nome de Exemplo",
          "classe": "NCL(11) 38"
        },
        {
          "numero": "111111111",
          "prioridade": "11/11/1111",
          "tipo": "Marca Mista",
          "marca": "Nome de Exemplo",
          "registro": "Marca Registrada",
          "situacao": "Registro de marca em vigor",
          "titular": "Nome de Exemplo",
          "classe": "NCL(11) 41"
        },
        {
          "numero": "111111111",
          "prioridade": "11/11/1111",
          "tipo": "Marca Mista",
          "marca": "Nome de Exemplo",
          "registro": "Marca Registrada",
          "situacao": "Registro de marca em vigor",
          "titular": "Nome de Exemplo",
          "classe": "NCL(11) 42"
        },
        {
          "numero": "111111111",
          "prioridade": "11/11/1111",
          "tipo": "Marca Nominativa",
          "marca": "Nome de Exemplo",
          "registro": "Marca Registrada",
          "situacao": "Registro de marca em vigor",
          "titular": "Nome de Exemplo",
          "classe": "NCL(11) 41"
        },
        {
          "numero": "111111111",
          "prioridade": "11/11/1111",
          "tipo": "Marca Mista",
          "marca": "Nome de Exemplo",
          "registro": "Marca Registrada",
          "situacao": "Registro de marca em vigor",
          "titular": "Nome de Exemplo",
          "classe": "NCL(11) 41"
        },
        {
          "numero": "111111111",
          "prioridade": "11/11/1111",
          "tipo": "Marca Mista",
          "marca": "Nome de Exemplo",
          "registro": "Marca Registrada",
          "situacao": "Registro de marca em vigor",
          "titular": "Nome de Exemplo",
          "classe": "NCL(11) 36"
        },
        {
          "numero": "111111111",
          "prioridade": "11/11/1111",
          "tipo": "Marca Nominativa",
          "marca": "Nome de Exemplo",
          "registro": "Marca requerida",
          "situacao": "Aguardando exame de mérito",
          "titular": "Nome de Exemplo",
          "classe": "NCL(11) 14"
        }
      ],
      "processos_total": 11,
      "total_paginas": 1,
      "site_receipt": "https://www.exemplo.com/exemplo-de-url"
    }
  ],
  "site_receipts": [
    "https://www.exemplo.com/exemplo-de-url"
  ]
}
```


### Preview file

The preview file (`site_receipts`) in the response JSON is **generated by the source (website/app)** that processed the automation.

### Code snippets


#### Python
```python
# Tested with: Python 3.10.19, Python 3.14.0
import requests

url = 'https://api.infosimples.com/api/v2/consultas/inpi/marcas'
args = {
  "marca":            "VALUE_OF_PARAMETER_MARCA",
  "ncl":              "VALUE_OF_PARAMETER_NCL",
  "tipo":             "VALUE_OF_PARAMETER_TIPO",
  "pesquisa_textual": "VALUE_OF_PARAMETER_PESQUISA_TEXTUAL",
  "pedidos_vivos":    "VALUE_OF_PARAMETER_PEDIDOS_VIVOS",
  "pagina":           "VALUE_OF_PARAMETER_PAGINA",
  "token":            "WRITE_YOUR_TOKEN_HERE",
  "timeout":          "600"
}

response = requests.post(url, args)
response_json = response.json()
response.close()

if response_json['code'] == 200:
  print("Retorno com sucesso: ", response_json['data'])
elif response_json['code'] in range(600, 799):
  mensagem = "Resultado sem sucesso. Leia para saber mais: \n"
  mensagem += "Código: {} ({})\n".format(response_json['code'], response_json['code_message'])
  mensagem += "; ".join(response_json['errors'])
  print(mensagem)

print("Cabeçalho da consulta: ", response_json['header'])
print("URLs com arquivos de visualização (HTML/PDF): ", response_json['site_receipts'])
```


## We are here to help
Do you still need to figure something out? Reach us at [suporte@infosimples.com.br](mailto:suporte@infosimples.com.br) and our highly qualified support team will be happy to help.