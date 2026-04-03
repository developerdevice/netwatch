# Contribuindo

Obrigado por considerar contribuir com o NetWatch. Este documento resume o fluxo pratico; visao geral e instalacao estao no [`README.md`](../README.md).

## Antes de abrir PR

1. `npm install`
2. `npm run lint`
3. `npm run typecheck`
4. `npm run test`
5. Para mudancas em rotas ou build: `npm run build`

Prefira PRs pequenos, com um objetivo claro. Para a area do mapa, mantenha regras de dominio em `lib/netwatch/` e evite duplicar logica entre menu, toolbar e canvas.

## Cluster e varias instancias

Por padrao, **sessoes** ficam na memoria de cada processo Node (`NETWATCH_SESSION_BACKEND` omisso ou `memory`). Isso nao serve para varias replicas atras de um balanceador sem **sticky sessions**.

Para **compartilhar sessoes** entre instancias:

1. Suba um **Redis** acessivel a todos os nodes (rede privada, TLS recomendado em producao).
2. Defina `NETWATCH_REDIS_URL` (ex.: `redis://:senha@host:6379/0`).
3. Defina `NETWATCH_SESSION_BACKEND=redis`.

A topologia continua no **SQLite** (`NETWATCH_SQLITE_PATH`). Em cluster, o arquivo deve residir em **armazenamento compartilhado** com consistencia forte (NFS com locking adequado, volume unico, etc.) ou migrar no futuro para outra base; o codigo assume um unico caminho de arquivo.

## Rate limiting

Limites por **IP de cliente** (cabecalhos `X-Forwarded-For` / `X-Real-Ip` quando o proxy os define):

| Variavel | Efeito | Padrao |
|----------|--------|--------|
| `NETWATCH_RATE_LIMIT_LOGIN_MAX` | Max tentativas de login por janela | 20 |
| `NETWATCH_RATE_LIMIT_LOGIN_WINDOW_MS` | Janela em ms (login) | 60000 |
| `NETWATCH_RATE_LIMIT_STATUS_MAX` | Max GET `/api/devices/status` por janela | 120 |
| `NETWATCH_RATE_LIMIT_STATUS_WINDOW_MS` | Janela em ms (status) | 60000 |

Com **apenas memoria**, cada instancia tem o seu contador (adequado a deploy single-node).

Com **`NETWATCH_REDIS_URL` definido**, login e status usam **Redis** para os contadores, alinhados entre replicas.

## Onde mexer

- API e integracao RouterOS: `app/api/`, `lib/server/`
- Dominio do mapa: `lib/netwatch/`
- Estado global da UI: `lib/store.tsx`
- Componentes da feature: `components/netwatch/`

## Documentacao

- [`README.md`](../README.md) — visao geral, instalacao, checklist de deploy, Docker
