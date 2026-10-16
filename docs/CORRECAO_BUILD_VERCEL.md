# Correção do build Vercel — 16/10/2026

## Causa confirmada

Os quatro componentes citados no erro existem em `frontend/src/components/halloween/`, com nomes e exports exatamente iguais aos imports. O diretório inteiro estava **não rastreado**, fora de `HEAD` e do índice Git. O commit `6aa5a20` contém os imports em `PublicLayout.tsx` e `HomePage.tsx`, mas não contém seus destinos. Assim, o build no diretório de trabalho encontra arquivos que não chegam ao checkout da Vercel.

Não houve erro de capitalização, rename ou export. `core.ignorecase=true` foi observado no Windows; nenhum ajuste nessa configuração foi necessário. `git check-ignore` confirmou que os arquivos não são indevidamente ignorados.

Além dos quatro componentes, faltavam o contador importado por `VotingPortal`, `eventSchedule.ts`, os dois arquivos CSS, as fontes locais e a imagem WebP. Incluir apenas os quatro `.tsx` causaria novos erros ou perda visual no deploy.

## Correção preparada

Foram incluídos no índice Git:

- `frontend/src/components/halloween/PublicHeader.tsx`
- `frontend/src/components/halloween/EventStatus.tsx`
- `frontend/src/components/halloween/ParticipationJourney.tsx`
- `frontend/src/components/halloween/VotingPortal.tsx`
- `frontend/src/components/halloween/CinematicCountdown.tsx`
- `frontend/src/services/eventSchedule.ts`
- `frontend/src/styles/tokens.css`
- `frontend/src/styles/cinematic.css`
- `frontend/public/assets/halloween-invitation-background.webp`
- As duas fontes WOFF2 e suas duas licenças em `frontend/public/assets/fonts/`.
- Os testes de navegador e o relatório da Etapa 1 que também estavam fora do Git.

Os componentes foram preservados por inteiro. Os imports existentes permanecem corretos; não há componentes fictícios, supressões de TypeScript ou mudanças de regras de negócio.

O PNG original continua intacto. SHA-256: `967e61ca25260c7a6bb2a0221f2d74b925fafde7b51148816da087b884ca4235`.

## Prevenção e Linux

`npm --prefix frontend run test:deploy` verifica o conteúdo **do índice Git**, e não apenas os arquivos presentes no disco. São quatro testes:

1. Inclusão e exports dos cinco componentes cinematográficos.
2. Resolução exata dos imports TypeScript/TSX e imports CSS, distinguindo maiúsculas e minúsculas.
3. Inclusão da fotografia, fontes e demais assets estáticos referenciados.
4. Ausência de arquivos cujos nomes colidam apenas pela capitalização.

Antes de incluir os arquivos, três desses testes falharam, identificando o componente, import e WebP ausentes. O teste não adiciona dependências e usa o TypeScript já instalado.

O workflow `.github/workflows/frontend-build.yml` instala o lockfile com `npm ci`, executa os testes e compila em **Ubuntu 24.04, Node 22**, num checkout limpo. Não possui etapa de deploy. A execução remota ocorrerá quando o workflow for enviado ao GitHub; ela não foi acionada nesta sessão.

O computador local não possui uma distribuição WSL utilizável nem Docker. A checagem local de capitalização usa os nomes exatos do índice Git, independentemente da tolerância do filesystem Windows. Ela não deve ser descrita como uma execução Linux.

## Validação executada

| Verificação | Resultado real |
| --- | --- |
| Build de uma cópia de `HEAD`, sem os arquivos locais não rastreados | Reproduzidos os quatro erros TS2307 informados; exit code 1 |
| `npm run build` no frontend do projeto | TypeScript e Vite aprovados; exit code 0 |
| Cópia limpa exportada com `git checkout-index --all`, seguida de `npm ci` e `npm run build` | 269 pacotes instalados pelo lockfile; TypeScript e Vite aprovados, sem TS2307; exit code 0 |
| `npm --prefix frontend run test:deploy`, após staging | Quatro testes aprovados, incluindo nomes case-sensitive de imports e assets |
| `npm test` na raiz do diretório de trabalho | 20 testes aprovados |
| `npm --prefix frontend run lint` | Zero erros; um aviso preexistente de Fast Refresh em `AuthContext.tsx` |
| Fotografia original | Conteúdo idêntico ao PNG de `HEAD`; SHA-256 confirmado |
| Lockfiles da raiz e frontend | Conteúdo idêntico a `HEAD`; nenhuma atualização de dependências aplicada |
| `git diff --cached --check` | Sem erros de whitespace após normalização de dois espaços finais nas licenças das fontes |

A cópia limpa não recebeu `node_modules`, `.env` nem arquivos não rastreados do diretório de trabalho. As bibliotecas foram instaladas de novo com `npm ci`; isso confirma que o build corrigido não depende dos arquivos que existiam apenas na máquina local.

## Vulnerabilidades analisadas separadamente

`npm audit --json` encontrou **zero vulnerabilidades na raiz/API** e **12 no frontend: cinco moderadas e sete altas**. Essas contagens incluem dependências e propagação entre pacotes; não representam doze falhas independentes. Não causam os erros TS2307.

`npm audit fix --dry-run --ignore-scripts --json` foi executado somente como simulação. A única mudança de versão proposta dentro das faixas atuais foi `source-map-js 1.2.1 → 1.2.2`. Nenhuma atualização, override ou alteração de lockfile foi aplicada.

| Pacote/cadeia instalada | Avaliação e atualização |
| --- | --- |
| `source-map-js@1.2.1`, via PostCSS | A versão 1.2.2 corrige o advisory e é uma atualização patch compatível com a faixa atual. É a candidata de menor risco para uma correção separada, acompanhada de build e regressão. [Advisory](https://github.com/advisories/GHSA-68fv-2mgg-jv7q). |
| `vite@5.4.21` e `esbuild@0.21.5` | O audit propõe Vite 8.3.4, uma mudança major. Há problemas associados ao servidor de desenvolvimento; a Vercel publica o resultado estático do build. A migração deve validar Node, plugin React, configuração e desenvolvimento local. Não atualizar automaticamente. [Advisory Vite](https://github.com/advisories/GHSA-fx2h-pf6j-xcff), [advisory esbuild](https://github.com/advisories/GHSA-67mh-4wv8-2f99). |
| `tailwindcss@3.4.19`, `chokidar`, `fast-glob`, `micromatch`, `braces` | A cadeia contém `braces@3.0.3`; o advisory não lista versão corrigida. O audit propõe Tailwind 4.3.3, uma migração major que exige revisar CSS, PostCSS e `@apply`. Os indicadores isolados de `fixAvailable` em dependências intermediárias não confirmam uma atualização compatível: o dry-run não propôs uma. [Advisory braces](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm). |
| `postcss-nested@6.2.0` e `postcss-selector-parser@6.1.4` | O parser corrigido é 7.1.6, outra versão major em relação à dependência instalada. Não forçar essa versão dentro da cadeia Tailwind 3; avaliar junto à migração de estilos. [Advisory](https://github.com/advisories/GHSA-rj75-hqrm-r3gf). |
| `react-router-dom@6.30.6` e `react-router@6.30.6` | O audit propõe 7.18.4; a correção do redirecionamento aparece em 7.18.0. É migração major e deve testar rotas, navegação e autenticação. A aplicação atual usa BrowserRouter, sem SSR; isso não elimina a necessidade de analisar o advisory de navegação. [Advisory](https://github.com/advisories/GHSA-wrjc-x8rr-h8h6). |

Avisos sobre scripts de instalação não foram ocultados nem tratados com desabilitação global de scripts. A instalação limpa usa `npm ci` normalmente; a simulação do audit foi executada com `--ignore-scripts` para não executar instaladores durante uma análise. O aviso local `Unknown env config "min-release-age"` vem da execução do npm e não é um erro de resolução do TypeScript.

A instalação limpa também avisou que `eslint@9.39.5` não recebe mais suporte. Esse aviso não impediu instalação, lint ou build; a atualização do linter deve verificar a compatibilidade dos plugins em uma tarefa separada.

## Commit e publicação

A branch de trabalho é `main`, com upstream `origin/main`. Os arquivos desta correção ficam staged para revisão e commit. O arquivo preexistente e não relacionado `server/participant-delete.test.js` permanece fora do staging.

Comandos preparados para execução posterior:

```powershell
git diff --cached --stat
git commit -m "Fix missing cinematic frontend files in Vercel builds"
git push origin main
```

Não foi feito commit, push ou deploy. Um push em `main` pode acionar a integração de produção já existente da Vercel; a publicação depende da autorização da responsável pelo projeto.
