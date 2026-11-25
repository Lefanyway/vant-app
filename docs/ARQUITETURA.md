# VANT — documentação técnica

Como o VANT é construído: as partes, como os dados circulam, as telas, o banco, a API, o modelo de previsão e como gerar cada versão. Os diagramas usam Mermaid e aparecem desenhados no GitHub.

## 1. Visão geral

O VANT acompanha partidas de Valorant para o público brasileiro: agenda e placares ao vivo, competições, equipes, favoritos com avisos, uma previsão própria de quem vence e um bolão de palpites.

```mermaid
flowchart LR
  user([Fã de Valorant]) --> app[App VANT<br/>Expo · React Native<br/>Android · iOS · Web]
  app -- REST /api --> api[API VANT<br/>Node · Express]
  app -- login · favoritos · avisos<br/>previsões · palpites --> db[(Supabase<br/>PostgreSQL · Auth · Realtime)]
  api -- partidas · times · elencos --> ps[PandaScore]
  api -- nomes dos mapas --> vlr[API pública do VLR.gg]
  api -- notícias --> news[Google News RSS]
  api -- fotos de jogadores --> lq[Liquipedia]
  api <-- cache --> redis[(Redis · Upstash)]
  api -- grava partidas --> db
  ml[ml/train.py<br/>Python · scikit-learn] -- lê histórico<br/>grava previsões --> db
  gha[GitHub Actions] -. de hora em hora .-> api
  gha -. 2x por dia .-> ml
```

| Parte | Pasta | Tecnologias | Responsabilidade |
|---|---|---|---|
| App | `artifacts/esports-score` | React Native 0.88, React 19, Expo 58, Expo Router, TanStack Query, Supabase JS, Reanimated | Telas, navegação, cache no aparelho, login, favoritos, palpites |
| API | `artifacts/api-server` | Node 24, Express 5, esbuild, Redis (Upstash) | Esconde o token da PandaScore, junta e normaliza dados, cache, proxy de logos, agenda `.ics` |
| Banco | `supabase/migrations` | PostgreSQL, Auth, RLS, Realtime | Partidas salvas, contas, favoritos, notificações, previsões, palpites |
| Modelo | `ml` | Python 3.12, scikit-learn, NumPy | Elo + regressão logística; grava uma previsão por partida |
| Automação | `.github/workflows` | GitHub Actions | Testes a cada envio, sincronização horária, treino do modelo |

## 2. Mapa do repositório

```
VANT/
├─ artifacts/
│  ├─ esports-score/          App (Expo)
│  │  ├─ app/                 Telas: cada arquivo é uma rota (Expo Router)
│  │  │  ├─ (tabs)/           Partidas · Previsões · Palpites · Favoritos · Buscar
│  │  │  ├─ match/[id]        Partida
│  │  │  ├─ teams/[id]        Equipe
│  │  │  ├─ competitions/[id] Competição
│  │  │  ├─ login/            E-mail → senha · criar conta
│  │  │  └─ onboarding, profile, notifications, favorites/add
│  │  ├─ components/          Peças de interface reutilizadas
│  │  ├─ context/             Sessão, favoritos, notificações, modo sem spoiler
│  │  ├─ lib/                 Chamadas à API, modelo no app, palpites, navegação, cache
│  │  ├─ assets/              Ícone, bandeiras, avatares, logos de times
│  │  └─ __tests__/           Testes (Jest + Testing Library)
│  └─ api-server/             API
│     └─ src/
│        ├─ routes/           Rotas HTTP
│        ├─ providers/esports PandaScore, Supabase (leitura, gravação, sincronização), cache, logos
│        └─ lib/              Logger, Redis, disparo do treino
├─ ml/                        Treino do modelo e testes
├─ supabase/migrations/       Esquema do banco, em ordem
├─ scripts/                   Abrir no celular, build da versão web
└─ docs/                      Esta documentação, roadmap, Supabase, identidade visual
```

## 3. Mapa de telas

```mermaid
flowchart TD
  start((Abrir o app)) --> logged{Tem sessão?}
  logged -- não --> login[Login: e-mail] --> pass[Senha] --> logged
  login --> signup[Criar conta] --> logged
  logged -- sim --> first{Primeira vez<br/>nesta conta?}
  first -- sim --> onb[Onboarding<br/>nick · avatar · glossário · times · campeonatos]
  first -- não --> tabs
  onb --> tabs

  subgraph tabs[Barra inferior]
    p[Partidas] --- pr[Previsões] --- pk[Palpites] --- f[Favoritos] --- b[Buscar]
  end

  p --> match[Partida]
  p --> comp[Competição]
  pr --> match
  pk --> match
  f --> team[Equipe]
  f --> add[Adicionar favoritos]
  b --> team
  b --> comp
  match --> team
  match --> comp
  comp --> match
  team --> match
  tabs --> prof[Perfil] --> notif[Notificações]
  tabs --> notif
  notif --> match
```

| Tela | Ação principal | Fontes de dados |
|---|---|---|
| Partidas | Escolher o dia; filtro Brasil | `/matches`, `/matches/live`, `/matches/upcoming`, `/matches/recent` |
| Previsões | Ver quem deve ganhar e por quê; simular confronto | Supabase: `model_runs`, `predictions`, `matches`, `team_elo` |
| Palpites | Palpitar vencedor ou placar; liga da semana | Supabase: `picks`, `pick_split`, `pick_leaderboard` |
| Favoritos | Ver os jogos de quem segue | `/teams/:id/matches`, `/competitions/:id/matches` |
| Buscar | Achar time ou campeonato | `/catalog` (busca aproximada no banco) |
| Partida | Placar, mapas, chance de vitória, onde assistir | `/matches/:id`, `/details`, `/maps`, `predictions` |
| Equipe | Seguir; agenda no celular | `/teams/:id/overview`, `/news`, `/roster`, `/stats`, `/calendar.ics` |
| Competição | Próximas e resultados | `/competitions/:id`, `/competitions/:id/matches` |
| Perfil | Avisos por favorito; sem spoiler | Supabase: `profiles`, `favorites` |

## 4. Fluxos

### 4.1 Abrir o app

O app abre com a última cópia salva no aparelho e atualiza por trás, sem tela vazia.

```mermaid
sequenceDiagram
  autonumber
  participant U as Usuário
  participant A as App
  participant S as AsyncStorage
  participant SB as Supabase Auth
  participant API as API VANT
  U->>A: abre o app
  A->>S: restaura cache salvo (até 24 h)
  A->>SB: sessão salva?
  SB-->>A: sessão válida
  A-->>U: mostra Partidas com os dados salvos
  A->>API: GET /matches?date=hoje
  API-->>A: partidas atualizadas
  A-->>U: troca pelos dados novos
  A->>API: pré-carrega ontem e amanhã
```

### 4.2 Abrir uma partida

O toque já começa a buscar os dados (`warmMatch`) antes da tela abrir. Partidas encerradas vêm do banco; ao vivo, só o placar vem da PandaScore.

```mermaid
sequenceDiagram
  autonumber
  participant U as Usuário
  participant A as App
  participant API as API VANT
  participant C as Cache (memória → Redis)
  participant DB as Supabase
  participant PS as PandaScore
  U->>A: toca na partida
  A->>A: guarda a partida da lista como prévia
  A->>API: GET /matches/:id/details
  API->>C: tem no cache?
  alt no cache
    C-->>API: detalhes
  else sem cache
    API->>DB: partida + últimos jogos + confrontos
    DB-->>API: dados salvos
    opt partida ao vivo
      API->>PS: só o placar atual
      PS-->>API: placar
    end
    API->>C: guarda (60 s)
  end
  API-->>A: detalhes
  A->>DB: previsão da partida
  A-->>U: placar, chance de vitória, últimos jogos
  loop a cada 45 s enquanto ao vivo
    A->>API: atualiza detalhes
  end
```

### 4.3 Sincronização com a PandaScore

```mermaid
sequenceDiagram
  autonumber
  participant T as Timer da API (10 min)<br/>ou GitHub Actions (1 h)
  participant SY as SupabaseSync
  participant PS as PandaScore
  participant DB as Supabase
  T->>SY: tick
  SY->>PS: partidas de 2 dias atrás a 14 dias à frente
  PS-->>SY: partidas, times, competições
  SY->>PS: elencos dos times novos
  SY->>DB: rpc ingest_esports(chave, lote)
  DB-->>SY: linhas gravadas
  SY->>PS: semanas antigas (backfill desde 2021, janelas de 7 dias, 24 por tick)
  SY->>DB: rpc ingest_esports
  Note over DB: trigger compara o status antigo e o novo<br/>e gera notificações (4.4)
```

### 4.4 Notificações

```mermaid
sequenceDiagram
  autonumber
  participant DB as Supabase (matches)
  participant TR as trigger notify_match_followers
  participant N as notifications
  participant RT as Realtime
  participant A as App
  DB->>TR: partida muda para ao vivo ou encerrada
  TR->>TR: acha quem segue o time ou a competição com aviso ligado
  TR->>N: insere um aviso por pessoa
  N-->>RT: evento de inserção
  RT-->>A: novo aviso
  A-->>A: sino com contador, toque abre a partida
```

### 4.5 Previsão de vitória

```mermaid
flowchart LR
  h[(matches<br/>histórico)] --> f[Fatores antes de cada partida:<br/>Elo · forma · confrontos ·<br/>experiência · descanso · formato]
  f --> wf[Backtest walk-forward<br/>refit a cada 20 partidas]
  wf --> m[Métricas: acerto · Brier · log-loss]
  f --> lr[Regressão logística final]
  lr --> p[(predictions<br/>chance + fatores)]
  m --> r[(model_runs<br/>métricas + pesos)]
  p --> app[App: % · rótulo de confiança ·<br/>Por quê? · acertou/errou]
  r --> app
  r --> sim[Simulador: recalcula a chance<br/>de dois times quaisquer]
```

O app refaz a mesma conta do modelo (soma dos pesos × fatores, depois a função logística), por isso o "Por quê?" mostra exatamente o que pesou em cada previsão. Resultado atual: 64% de acerto em 13.794 partidas testadas sem olhar o futuro (só Elo: 63%; moeda: 53%).

### 4.6 Palpites

```mermaid
sequenceDiagram
  autonumber
  participant U as Usuário
  participant A as App
  participant DB as Supabase
  A->>DB: partidas agendadas + chance do modelo
  A->>DB: rpc pick_split (como a galera votou)
  U->>A: escolhe o placar (– / +)
  A->>DB: grava em picks
  DB->>DB: regra RLS pick_is_open recusa gravar, mudar ou apagar depois do início
  Note over A,DB: quando a partida acaba
  A->>DB: rpc pick_leaderboard (semana)
  A-->>U: 10 pontos pelo vencedor, +15 pelo placar exato
```

## 5. Modelo de dados

```mermaid
erDiagram
  competitions ||--o{ matches : "tem"
  teams ||--o{ matches : "joga em casa"
  teams ||--o{ matches : "joga fora"
  teams ||--o{ players : "elenco"
  matches ||--o| predictions : "previsão"
  model_runs ||--o{ predictions : "gerou"
  matches ||--o{ notifications : "avisa"
  matches ||--o{ picks : "recebe"
  users ||--|| profiles : "perfil"
  users ||--o{ favorites : "segue"
  users ||--o{ notifications : "recebe"
  users ||--o{ picks : "palpita"

  matches {
    text id PK
    text status
    timestamptz start_time
    int home_score
    int away_score
    jsonb payload
  }
  teams {
    text id PK
    text name
    text acronym
    text country
  }
  competitions {
    text id PK
    text name
    text region
  }
  players {
    text id PK
    text team_id FK
    text name
    text country
  }
  predictions {
    text match_id PK
    real home_win_prob
    jsonb features
  }
  model_runs {
    bigint id PK
    jsonb metrics
    jsonb coefficients
  }
  profiles {
    uuid id PK
    text display_name
    text avatar
  }
  favorites {
    uuid user_id
    text kind
    text entity_id
    bool notify
  }
  notifications {
    bigint id PK
    text kind
    text title
    timestamptz read_at
  }
  picks {
    uuid user_id
    text match_id
    text team_id
    int home_score
    int away_score
  }
```

- `matches.payload` guarda a partida no formato da API, para o app ler direto do banco sem conversão.
- `team_elo` é uma visão: o Elo mais recente de cada time, tirado das previsões.
- Dados de esports só entram pelas funções `ingest_esports` e `ingest_predictions`, que exigem uma chave guardada com hash em `private.ingest_keys`.
- RLS: cada usuário lê e grava só os próprios favoritos, notificações, perfil e palpites; partidas, times, previsões e métricas são públicos para leitura.

## 6. API

Base: `/api`. Respostas em JSON (a agenda é `text/calendar`). Erros seguem `{ error, code, retryable }`.

| Rota | O que devolve | Cache |
|---|---|---|
| `GET /healthz` · `/healthz/cache` | Estado da API e do Redis | — |
| `GET /matches?date&timezone&game` | Partidas do dia (do banco quando o dia já foi sincronizado) | 2 min hoje · 5 min futuro · 1 h passado |
| `GET /matches/live` | Partidas ao vivo | 20 s |
| `GET /matches/upcoming` | Próximas partidas | 5 min |
| `GET /matches/recent?country=BR` | Últimos resultados de times de um país | 2 min |
| `GET /matches/:id` · `/details` · `/maps` | Partida, detalhes (últimos jogos, confrontos), mapas e rounds | 60 s |
| `GET /competitions` · `/:id` · `/:id/matches` | Competições e suas partidas | 6 h · 2 min |
| `GET /teams/:id` · `/overview` · `/matches` · `/roster` · `/stats` · `/news` | Equipe, resumo, partidas, elenco, estatísticas de 30 dias, notícias | 6 h · 1 h · 3 h · 6 h · 15 min |
| `GET /teams/:id/calendar.ics` | Próximos jogos para a agenda do celular (lembrete de 15 min) | 1 h |
| `GET /catalog?type&page&q` | Busca de times e competições, paginada e ordenada por relevância | 30 min sem busca · 6 h com busca |
| `GET /esports/assets/logo?url` | Proxy de logos (só hosts permitidos, PNG redimensionado, SVG higienizado) | 7 dias no navegador |
| `GET /debug/providers` | Estado da PandaScore (só em desenvolvimento) | — |

Entradas inválidas (data, jogo, filtro, página, país) recebem `400`; IDs inexistentes, `404`.

## 7. Cache em camadas

```mermaid
flowchart LR
  q[Pedido do app] --> mem{Memória da API<br/>até 2.000 itens}
  mem -- fresco --> r1[responde na hora]
  mem -- vencido --> r2[responde o antigo<br/>e atualiza por trás]
  mem -- não tem --> rd{Redis Upstash<br/>compartilhado}
  rd -- tem --> r3[responde e guarda na memória]
  rd -- não tem --> o[Origem: Supabase ou PandaScore]
  o --> r4[responde e guarda nas duas camadas]
```

- O dado vencido continua sendo servido enquanto a atualização acontece: por mais um TTL nos dados ao vivo e por até 15 minutos nas listas.
- Pedidos iguais ao mesmo tempo viram uma só ida à origem.
- No aparelho, o React Query guarda partidas, competições, previsões, equipes e detalhes de partida por 24 h (AsyncStorage). A versão do cache (`buster`) sobe quando o formato muda.
- Ao tocar numa partida ou equipe, os dados da próxima tela já começam a carregar.

## 8. Segurança e privacidade

- O token da PandaScore e a chave de gravação do Supabase ficam só na API (`.env`, fora do Git). O app só tem a chave pública do Supabase.
- RLS em todas as tabelas de usuário; funções de gravação com `security definer` e chave com hash.
- O proxy de logos aceita só hosts conhecidos, HTTPS, sem redirecionamento, e limita o tamanho; SVG passa por higienização.
- Mensagens de erro da API não repetem valores enviados; o app mostra textos próprios em português.

## 9. Acessibilidade

- Todo controle tem rótulo em português (`accessibilityLabel`).
- Estado dos controles com atributos `aria-*` (`aria-selected`, `aria-checked`, `aria-expanded`), que funcionam no TalkBack/VoiceOver e no navegador.
- Ordem de Tab segue a leitura da tela: cabeçalho → abas → data → filtros → lista → barra inferior.
- Animações respeitam "reduzir movimento"; área de toque mínima de 44 px.

## 10. Build e execução

| Alvo | Como | Observação |
|---|---|---|
| Celular em desenvolvimento | `pnpm run dev:phone` | Sobe a API (5000) e o Expo (8081) com o IP do Wi-Fi |
| Web | `pnpm run build:web` e `pnpm run start:web` | A API serve o app web exportado |
| APK Android | `npx eas-cli build -p android --profile preview` em `artifacts/esports-score` | Build na nuvem da Expo; variáveis no ambiente `preview` do EAS |
| Modelo | `pnpm run ml:train` | Também roda sozinho pela API e pelo GitHub Actions |
| Testes | `pnpm test` e `python -m unittest discover ml` | Mesmos comandos do CI |

```mermaid
flowchart LR
  push[git push] --> ci[GitHub Actions: Tests]
  ci --> tc[typecheck]
  ci --> ta[API: node --test]
  ci --> tp[App: Jest]
  ci --> tm[ML: unittest]
  cron1[cron: hora em hora] --> sync[Sync PandaScore → Supabase]
  cron2[cron: 06:30 e 18:30 UTC] --> train[Treino do modelo → previsões]
```

## 11. Decisões e limites

- **Monorepo simples (pnpm), sem microsserviços:** uma API e um app bastam para o tamanho do projeto.
- **Banco como fonte principal:** partidas já sincronizadas vêm do Supabase; a PandaScore só é chamada para o que muda (ao vivo, dias próximos).
- **Modelo explicável em vez de "caixa-preta":** a regressão logística permite mostrar o peso de cada fator ao usuário.
- **Plano grátis da PandaScore:** sem estatísticas de jogador nem economia; os nomes dos mapas vêm da API pública do VLR.gg.
- **Pendências:** API publicada na internet (hoje roda no computador de quem desenvolve) e push com o app fechado; ver `docs/ROADMAP.md`.
