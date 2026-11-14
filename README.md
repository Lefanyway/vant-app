# VANT

Aplicativo de acompanhamento de esports de Valorant: partidas ao vivo e por dia, competições, equipes, favoritos com avisos e previsões de vitória feitas por um modelo próprio (Elo + regressão logística).

- `artifacts/esports-score`: app (Expo / React Native)
- `artifacts/api-server`: API (Express) com cache e leitura do Supabase
- `ml`: treino do modelo de previsão
- `supabase/migrations`: banco de dados
- `scripts`: abrir no celular (`pnpm run dev:phone`) e build da versão web
- `docs`: [arquitetura e fluxos](docs/ARQUITETURA.md), [relatório de qualidade](docs/RELATORIO-QUALIDADE.md), roadmap, Supabase, como abrir no celular e estudos de identidade

Projeto de faculdade, sem fins comerciais.

## Gerar o APK (Android)

O build roda na nuvem da Expo (EAS), sem precisar do Android SDK no computador. O perfil `preview` gera um `.apk` para instalar direto no celular.

1. Cadastre as variáveis do app no ambiente `preview` do EAS (uma vez): `EXPO_PUBLIC_API_BASE_URL` (endereço público da API), `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_KEY`. O `.env` local não vai para a nuvem.
2. Dentro de `artifacts/esports-score`: `npx eas-cli build -p android --profile preview`.
3. Ao terminar, o EAS mostra um link e um QR para baixar o `.apk`.

A API precisa estar publicada na internet; com o endereço da rede local, o APK só funciona no mesmo Wi-Fi e com o computador ligado.

## Aviso legal

VANT não é endossado pela Riot Games e não reflete as opiniões da Riot Games nem de ninguém oficialmente envolvido na produção ou gestão das propriedades da Riot Games. Riot Games, VALORANT e todas as propriedades associadas são marcas comerciais ou marcas registradas da Riot Games, Inc. Dados de partidas fornecidos pela PandaScore. Fotos de jogadores: Liquipedia (CC BY-SA 3.0).
