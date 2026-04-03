# ROAD

## Fora do escopo da v1

### Historico consistente de outage

Nao entra na versao inicial um historico persistente e confiavel de uptime/downtime rodando em background.

Na v1, o comportamento aceito continua sendo:

- polling live enquanto a UI estiver aberta;
- historico temporario em memoria do cliente;
- sem auditoria historica confiavel apos fechar a tela ou reiniciar a aplicacao.

## Quando retomar

Esse tema deve voltar apenas depois da v1 estar estavel e quando houver decisao explicita sobre seguranca e operacao do monitoramento em background.

## Blocos necessarios para a fase futura

1. Definir como as credenciais do MikroTik serao tratadas para monitoramento em background.
2. Escolher o modelo de execucao: processo embutido simples ou worker mais resiliente.
3. Modelar persistencia em SQLite para eventos por `serverId` + `deviceId`.
4. Criar leitura server-side desse historico para alimentar o modal e relatorios futuros.
5. Definir como calcular incidentes, uptime e downtime de forma consistente apos restart e reconexao.

## Push e notificacoes (futuro)

Objetivo: avisar o operador quando o estado da rede ou de dispositivos selecionados mudar de forma relevante, sem depender da aba aberta.

Direcao provavel:

- **Web Push** (service worker + subscricao por utilizador/dispositivo) ou canal equivalente, com **opt-in** explicito;
- definir quais eventos geram notificacao (offline, warning prolongado, etc.) e limites para evitar spam;
- integracao opcional com outros canais (email, webhook) se fizer sentido depois da base push.

Depende de decisoes de produto, de hospedagem (HTTPS obrigatorio para Web Push) e de modelo de identidade quando houver multiplos utilizadores.

## Evolucoes de mapa planejadas

### Vinculos entre mapas

Ja esta nos planos permitir vincular uma conexao a um mapa ou device de outro mapa.

Objetivos dessa evolucao:

- permitir links entre elementos que nao estao no mesmo mapa atual;
- facilitar a representacao de relacoes entre mapas diferentes sem duplicar estrutura;
- melhorar a navegacao entre mapa pai e submapa.

Exemplo desejado:

- no `mapa x`, existir um atalho visual para o `mapa y`;
- ao abrir o `mapa y`, o `mapa x` tambem aparecer na view como referencia visual;
- isso permite voltar ao mapa pai de forma mais natural, sem depender apenas do botao de voltar.
