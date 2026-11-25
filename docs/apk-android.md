# APK Android

O aplicativo Android usa o pacote `com.lefanyway.vant`, versão `1.0.0`.

- [Projeto no Expo](https://expo.dev/accounts/lefanyway/projects/vant)
- [Builds Android e downloads disponíveis](https://expo.dev/accounts/lefanyway/projects/vant/builds?platform=android)
- [Releases no GitHub](https://github.com/Lefanyway/vant-app/releases)

## Situação da primeira versão

Projeto EAS vinculado. APK ainda não publicado: falta informar e configurar `EXPO_PUBLIC_API_BASE_URL` com o endereço HTTPS público da API Express. O endereço do Supabase não substitui essa API, que atende `/api/esports/*`.

## Configurar

1. Instale Node.js 24.12.0 e pnpm 11.25.0 e execute `pnpm install --frozen-lockfile` na raiz.
2. Copie `artifacts/esports-score/.env.example` para `.env` no mesmo diretório e preencha os três valores públicos.
3. No diretório `artifacts/esports-score`, entre na conta Expo e cadastre as variáveis:

```bash
npx --yes eas-cli@27.11.0 login
npx --yes eas-cli@27.11.0 env:push preview --path .env
```

O `.env` é ignorado pelo Git. Somente as variáveis `EXPO_PUBLIC_*` do exemplo pertencem ao app: seus valores ficam acessíveis dentro do APK. Tokens da PandaScore, chaves de ingestão e chaves privadas do Supabase pertencem ao servidor.

## Gerar

Na raiz do repositório:

```bash
pnpm run build:apk
```

Na primeira execução, autorize o EAS a criar e guardar a chave de assinatura Android. Preserve essa chave para permitir atualizações do app instalado. Não envie arquivos de credenciais para o Git.

O perfil `preview` gera um APK de distribuição interna. O perfil `production` gera um AAB para a Google Play. Ambos usam as versões de Node/pnpm fixadas em `eas.json`. O build valida a presença das três variáveis e exige URLs HTTPS públicas antes de compilar o Android.

## Instalar e publicar o link

Após o build terminar com status `Finished`, abra o link de instalação fornecido pelo EAS no Android, baixe o APK e autorize a instalação pelo navegador quando solicitado.

Antes de anunciar a versão, confira no aparelho: abertura sem Metro/Expo Go, cadastro/login, partidas, busca e favoritos usando dados da API pública. A exportação JavaScript ou um build concluído não substituem essa verificação no aparelho.

Publique o APK em uma release do GitHub, com tag correspondente à versão. Adicione no topo do README o link de instalação do build concluído e o link da release. O binário deve ficar na release, fora do histórico Git. Ao lançar uma atualização, aumente `android.versionCode` em `app.json`.
