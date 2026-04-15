# NetWatch

NetWatch e uma alternativa web para monitoramento visual de rede inspirada na praticidade do The Dude, pensada para ser simples de instalar, leve para operar e acessivel de qualquer lugar sem depender de software cliente dedicado.

O objetivo do projeto nao e substituir Grafana, Zabbix ou o proprio The Dude em ambientes grandes, complexos ou com necessidades mais avancadas de observabilidade. A proposta aqui e oferecer uma experiencia mais pratica para quem quer visualizar topologia, dispositivos, conexoes e status de forma direta.

![hippo](https://s13.gifyu.com/images/bqS9O.gif)

## Por que este projeto existe

Muitas ferramentas de monitoramento sao poderosas, mas tambem podem exigir mais setup, mais infraestrutura ou mais carga operacional do que alguns cenarios pedem. O NetWatch nasce para atender quem quer uma opcao mais simples, web e aberta para adaptar ao proprio contexto.

## Status

A versao atual e **estavel e utilizavel** no dia a dia: topologia editavel (incluindo curvas de ligacao), persistencia em SQLite, login MikroTik multi-servidor com registo opcionalmente protegido por chave (`NETWATCH_SERVER_REGISTRY_SECRET`), ping/traceroute, status ao vivo, tema claro/escuro, Redis/sessao e rate limit para deploy em cluster. O roadmap abaixo resume evolucoes possiveis, sem datas fixas.

### Roadmap (por vir)

| Tema | Direcao |
|------|---------|
| **Polling em background** | Atualizacao de status e sincronizacao com politicas que funcionem com a aba em segundo plano ou com menos dependencia do ciclo atual do cliente. |
| **Usuarios e permissoes** | Controle de acesso: quem pode apenas visualizar mapas, quem pode editar topologia e quem pode disparar acoes no equipamento ponte. |
| **Integracao RouterBOARD** | Concretizar o `apiClient` SSR para leitura agregada via API HTTP quando fizer sentido ao lado do modelo atual (topologia armazenada no NetWatch). |
| **Persistencia em cluster** | Ir alem do SQLite em arquivo unico partilhado quando varias replicas precisarem de escrita concorrente previsivel. |
| **UX do mapa** | Atalhos, temas, exportacao ou vistas salvas — melhorias de produtividade sem mudar o foco em simplicidade. |
| **Push / notificacoes** | Alertas fora do browser (Web Push ou canal semelhante) para mudancas de estado relevantes, com politicas de opt-in e sem sobrecarregar o operador. |

## Instalacao

### Requisitos

- Node.js 20 ou superior
- npm

### Rodando localmente

```bash
npm install
npm run dev
```

O `npm install` aplica patches versionados em `patches/` (via `patch-package`); detalhes na secao **Patches de dependencias** em [`docs/CONTRIB.md`](docs/CONTRIB.md).

Abra [http://localhost:3000](http://localhost:3000).

Copie `.env.example` para `.env` e ajuste: caminho do SQLite, limites de rate, Redis/sessao em cluster, chave do registo de servidores em producao, e (quando existir integracao) `NETWATCH_API_*`.

### Docker

**Politica:** tunings da aplicacao e caminhos ficam em **`.env`** / **`.env.example`** — nao e preciso editar `Dockerfile*` nem `docker-compose*.yaml` para colaborar ou instalar. Os ficheiros Compose apenas montam volumes e delegam variaveis aos `env_file`.

**Requisitos:** Docker Engine e plugin Docker Compose v2. Recomenda-se **Compose 2.24+** (`env_file` com `required: false` onde aplicavel).

**Persistencia e `NETWATCH_SQLITE_PATH`:** o padrao local e em Docker (via `.env.example` e `.env.docker.dev`) e **`.data/netwatch.sqlite`** relativo ao diretorio do projeto (no container, cwd `/app` → `/app/.data/netwatch.sqlite`). O volume nomeado monta no caminho definido por **`NETWATCH_DOCKER_PERSIST_DIR`** (absoluto dentro do container, ex. `/app/.data`). **Se alterar `NETWATCH_SQLITE_PATH` para outra pasta relativa** (ex. `storage/netwatch.sqlite`), **atualize tambem `NETWATCH_DOCKER_PERSIST_DIR`** para o diretorio-pai correspondente (ex. `/app/storage`); caso contrario o SQLite fica fora do volume e **perde-se dados ao recriar o container**. O Compose le esta variavel para interpolar o mount; em desenvolvimento use o comando abaixo para o ficheiro `.env.docker.dev` participar nessa interpolacao.

**Desenvolvimento** — defaults em **`.env.docker.dev`** (versionado); **`.env` na raiz e opcional** e sobrepoe chaves iguais:

```bash
npm run docker:dev
```

Equivalente: `docker compose --env-file .env.docker.dev -f docker-compose.dev.yaml up --build`.

Abra [http://localhost:3000](http://localhost:3000). O servico corre `npm run dev` no container, com volumes para codigo, `node_modules` isolado e **dados persistentes** no volume `netwatch_dev_data`.

Se ja tiver **`.env`** (ex. copiado de `.env.example`) e nao quiser usar `--env-file .env.docker.dev`, inclua em `.env` as mesmas chaves que precisa (incluindo `NETWATCH_DOCKER_PERSIST_DIR` se mudar o caminho do SQLite) e pode usar `docker compose -f docker-compose.dev.yaml up --build`; o ficheiro `.env` na raiz e usado pelo Compose para interpolar variaveis no YAML. O servico continua a carregar `.env.docker.dev` e depois `.env`.

**Producao** — exige **`.env` na raiz** (copie de `.env.example` e preencha):

```bash
cp .env.example .env
# edite .env (credenciais, Redis em cluster, NETWATCH_SERVER_REGISTRY_SECRET, NETWATCH_DOCKER_PERSIST_DIR, etc.)
npm run docker:prod
```

Equivalente: `docker compose -f docker-compose.prod.yaml up --build -d`.

A imagem multi-stage (`Dockerfile.prod`) faz `next build` e arranca com output **standalone** (`node server.js`). Dados SQLite no volume **`netwatch_prod_data`**, montado em `NETWATCH_DOCKER_PERSIST_DIR` (por omissao `/app/.data`, coerente com `NETWATCH_SQLITE_PATH=.data/netwatch.sqlite`).

### Configuracao no RouterBOARD / RouterOS (servidor ponte)

No equipamento MikroTik (RouterBOARD, CHR, etc.) com RouterOS que o NetWatch usara como ponte (login, ping, traceroute, leitura da topologia persistida no app):

1. Acesse **IP > Services** e **habilite** o servico **api** (API classica do RouterOS).
2. **Recomendado:** restrinja o acesso ao endereco IP **somente do host onde o NetWatch esta instalado** (por exemplo, em **Available From** no proprio servico ou via firewall, conforme a sua politica de rede).
3. **Recomendado:** altere a **porta padrao** do servico API para um valor nao obvio, e use essa porta ao registrar o servidor no NetWatch.
4. **Recomendado:** crie um usuario **dedicado** ao NetWatch com perfil **somente leitura**, **sem** permissoes de escrita ou administracao, e use esse usuario no login do aplicativo.

Isso reduz a superficie de ataque caso o servidor do NetWatch ou a rede entre ele e o MikroTik sejam comprometidos.

### Build para producao

```bash
npm run build
npm run start
```

### Checklist antes de expor em rede

O codigo ja passa por `lint`, `typecheck`, `test` e `build`, mas **producao endurecida** ainda depende do seu ambiente:

- **Cluster / varias instancias:** use `NETWATCH_SESSION_BACKEND=redis` e `NETWATCH_REDIS_URL` para sessoes compartilhadas; configure `X-Forwarded-For` (ou `X-Real-Ip`) no proxy para rate limit e logs corretos. Detalhes em [`docs/CONTRIB.md`](docs/CONTRIB.md).
- **Rate limiting:** login, `/api/devices/status` e mutacoes do registo de servidores tem limites por IP (memoria por processo ou Redis se `NETWATCH_REDIS_URL` estiver definido). Variaveis em `.env.example`.
- **Credenciais** MikroTik usadas no login ficam no store de sessao durante o uso; isole o host, restrinja API no roteador e use usuario de leitura, como na secao acima.
- **Persistencia:** faca backup do arquivo apontado por `NETWATCH_SQLITE_PATH` (ver `.env.example`) para nao perder a topologia; em Docker de producao, backup do volume `netwatch_prod_data` ou do caminho SQLite efectivo no host (se montar pasta em vez de volume).
- **Carga:** ajuste `NETWATCH_STATUS_PING_CONCURRENCY` se tiver muitos dispositivos ou um RouterOS com poucos recursos.
- **Registo de servidores:** com `NETWATCH_SERVER_REGISTRY_SECRET` definido, use **HTTPS** em producao para a chave enviada na UI de login nao circular em claro na rede.

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run typecheck
npm run test
npm run docker:dev
npm run docker:prod
```

## Autor

**Mauro Alexandre** — [profissionalweb04@gmail.com](mailto:profissionalweb04@gmail.com) · licenca [MIT](LICENSE).

## Documentacao e contribuicao

- [`docs/CONTRIB.md`](docs/CONTRIB.md) — fluxo de PR, cluster, Redis, rate limit, onde mexer no codigo
- [`docs/ROAD.md`](docs/ROAD.md) — temas futuros (historico, mapa, notificacoes)

## Escopo e limitacoes

- nao substitui Grafana, Zabbix ou The Dude em cenarios mais robustos;
- nao tem foco comercial;
- o projeto e livre para estudo, modificacao e uso;
- a responsabilidade por configuracao correta, seguranca e operacao do ambiente e do usuario.

## Aviso

Este projeto nao oferece garantia de adequacao para um ambiente especifico. Nao nos responsabilizamos por vazamentos, indisponibilidade, falhas operacionais ou impactos causados por configuracoes incorretas, integracoes mal planejadas ou uso inadequado nos dispositivos monitorados.
