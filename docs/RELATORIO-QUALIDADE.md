# VANT — relatório de qualidade

Testes, desempenho e limpeza de código feitos em 13 e 14 de novembro de 2026, antes da versão final.

## 1. Testes automatizados

| Pacote | Ferramenta | Testes | Resultado |
|---|---|---|---|
| App | Jest + Testing Library | 26 em 8 arquivos | todos passam |
| API | test runner do Node | 50 | todos passam |
| Modelo | unittest (Python) | 10 | todos passam |
| Tipos | TypeScript (modo estrito, sem variáveis sem uso) | app e API | sem erros |
| Expo | expo-doctor | 17 verificações | todas passam |

O que os testes cobrem: navegação entre equipe, partida e competição; seleção de avatar; palpites e pontuação; previsão (o app refaz a % salva pelo modelo); cache que serve o dado antigo enquanto atualiza; leitura do Supabase antes da PandaScore; ranking da busca; agenda `.ics`; tratamento de logos (tamanho, SVG); treino do modelo sem olhar o futuro.

Todos rodam no GitHub Actions a cada envio (`.github/workflows/test.yml`).

## 2. Teste de ponta a ponta (Playwright)

Navegador Chromium em tamanho de celular (390 × 844), com a API e o banco reais. O login foi simulado com uma sessão local, sem senhas.

| Tela | Carregou | Paradas de Tab | Botões testados |
|---|---|---|---|
| Partidas | 3,4 s | 30, em ordem de leitura | 30 |
| Previsões | 3,8 s | ok | 27 |
| Palpites | 4,0 s | ok | 45 |
| Favoritos | 3,7 s | ok | 24 |
| Buscar | 5,3 s | ok | 45 |
| Perfil | 4,3 s | ok | 11 |
| Notificações | 4,6 s | ok | 1 |
| Adicionar favoritos | 4,9 s | ok | 34 |
| Partida | 8,2 s | ok | 7 |
| Equipe | 4,9 s | ok | 18 |
| Competição | 4,4 s | ok | 27 |
| Login, criar conta, onboarding | — | ok | percorridos até o fim |

Os tempos incluem o carregamento do app em modo de desenvolvimento, que é mais lento que o APK.

Resultado:
- **Nenhum erro de página nem resposta de erro da API** em fluxos válidos.
- **Nenhum botão quebrado.** Os botões "sem efeito" eram a aba ou o filtro já selecionado; os "não clicáveis" eram controles desativados de propósito (placar em zero, palpite incompleto).
- **Ordem do Tab correta**, sem foco em elementos invisíveis ou de outras telas.
- **Rotas inexistentes** mostram "Partida não encontrada" ou "Esta página não existe", com caminho de volta.
- **Corrigido:** abas, filtros e interruptores não informavam o próprio estado ao leitor de tela na versão web. Agora usam `aria-selected`, `aria-checked` e `aria-expanded`.
- **Observação:** na aba Previsões, ao navegar por Tab, linhas podem passar por baixo da barra inferior flutuante.

## 3. Rotas da API

As 23 rotas responderam `200`. Entradas inválidas responderam `400`: data `2026-13-45`, jogo `fortnite`, país `BRA`, filtro `xyz` e página `-1`. IDs inexistentes e rotas desconhecidas responderam `404`.

## 4. Desempenho

| Medida | Antes | Depois |
|---|---|---|
| Detalhe de partida ao vivo, cache frio | 1,8–2,3 s | 0,76 s |
| Equipe: até mostrar conteúdo útil | ~1,1 s de esqueleto | 0,1 s (cabeçalho na hora) |
| Equipe: nova visita | ~1 s | 0,2 s |
| Competição: cabeçalho | 0,35–3,3 s | 0,07 s |
| Reabrir sem internet | esqueleto sem fim | 0,7–0,9 s com dados salvos |
| Qualquer rota com cache quente | — | ~2 ms |
| Requisições ao abrir uma partida | 4 (2 delas sempre vazias) | 2 |

O que mudou: o histórico vem do banco e só o placar ao vivo da PandaScore; o cache entrega o dado antigo enquanto atualiza; o toque pré-carrega a próxima tela; o aparelho guarda as últimas listas; e foi removida uma busca de estatísticas que nunca devolvia nada.

## 5. Limpeza do código

| Removido | Por quê |
|---|---|
| Pasta `.replit-vlr-upstream`, `services/`, `.replit`, `.replitignore`, arquivos `artifact.toml` | Restos do ambiente Replit |
| `artifacts/mockup-sandbox` | Projeto modelo do Replit, sem uso |
| `lib/` (api-client-react, api-spec, api-zod, db) | Só um import trivial usava algo; trocado por uma linha |
| Provedor de estatísticas VLR (`vlr/`, rota `/stats`, abas Jogadores e Economia) | Dependia de um servidor Python que não existe; nunca estava ligado |
| Rotas `/games`, `/search`, `/teams` e métodos sem chamador | O app usa `/catalog` |
| Dados de exemplo em `lib/data.ts`, `lib/provider.ts`, `lib/assets.ts` | Times e partidas falsos do modelo inicial |
| 15 avatares repetidos, `icon_2.png`, `lol.png`, `missing-logo.svg` | Arquivos sem referência (cerca de 1 MB a menos no app) |
| 9 dependências do app e 2 da API (localização, câmera, ngrok, zod…) | Nenhum código as usa; o APK fica menor e não pede permissão de localização |
| 303 pacotes no lockfile | Consequência das remoções acima |
| 17 imports, uma função e dezenas de estilos sem uso | Código morto |

Tudo continua no histórico do Git.

## 6. Pronto para o APK

- `app.json`: pacote Android `com.lefanyway.vant`, `versionCode` 1, ícone adaptativo.
- `eas.json`: perfil `preview` gera `.apk`; perfil `production` gera `.aab` para a loja.
- expo-doctor sem pendências (versões alinhadas ao SDK 58, sem módulos nativos duplicados).
- **Atualização em 24/11/2026:** API publicada no Render e as três variáveis públicas cadastradas no EAS `preview`. Health check, cache, partidas futuras e busca de equipes responderam HTTP 200. Consulte [o guia Android](apk-android.md).
- **Marca:** o ícone ainda é o logo do Valorant (marca da Riot).
