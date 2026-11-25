# API no Render

- Serviço: `vant-api`, workspace `My Workspace`, região Oregon, plano gratuito.
- URL pública: `https://vant-api-j47z.onrender.com`.
- [Verificar a API](https://vant-api-j47z.onrender.com/api/healthz).
- [Painel do serviço](https://dashboard.render.com/web/srv-dc33ahnavr4c73e5j9s0).
- Fonte: branch `main` de `Lefanyway/vant-app`, runtime Node.js 24.12.0.

## Configuração do serviço

O serviço foi criado pela integração do Render. Sua configuração e as variáveis são mantidas no painel do serviço.

Build, executado na raiz do monorepo:

```bash
corepack enable && corepack prepare pnpm@11.25.0 --activate && pnpm install --frozen-lockfile --filter @workspace/api-server... && pnpm --filter @workspace/api-server run build
```

Inicialização:

```bash
pnpm --filter @workspace/api-server run start
```

O Render fornece `PORT` e termina o HTTPS. O servidor Node escuta nessa porta. O teste público de saúde está em `/api/healthz`.

## Variáveis

Cadastre os valores no ambiente do serviço, sem colocá-los no Git:

- `NODE_VERSION=24.12.0` e `NODE_ENV=production`.
- `PANDASCORE_API_TOKEN`.
- `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` e `SUPABASE_INGEST_KEY`.
- `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN` para o cache compartilhado.
- `VANT_ML_TRAIN=off`: o treino continua no GitHub Actions, sem exigir Python e scikit-learn no processo da API.

As chaves privadas ficam somente no servidor. O app recebe a URL desta API e as duas variáveis públicas do Supabase pelo EAS `preview`.

## Verificação e limites

Em 24/11/2026, o primeiro deploy ficou `live`; saúde, cache, partidas futuras e busca por LOUD retornaram HTTP 200. O cache Redis estava ativo.

O plano gratuito pode suspender o processo por inatividade; o primeiro acesso seguinte pode demorar. O app não exige que o computador de desenvolvimento esteja ligado. A sincronização e o treino agendados continuam nos workflows existentes do GitHub Actions.
