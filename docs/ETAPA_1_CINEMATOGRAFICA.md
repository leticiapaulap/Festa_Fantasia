# Halloween Cinematic Portal Experience — Etapa 1

## Diagnóstico e plano executado

A aplicação pública usa React 18, TypeScript, Vite 5, Tailwind CSS e React Router. A Vercel compila `frontend/` e encaminha `/api/*` para `api/dispatch.js`, que utiliza os módulos Node em `server/` e PostgreSQL. A implementação Spring Boot em `backend/` é separada. Autenticação administrativa, contratos de upload para Vercel Blob, participantes, votos e resultados foram mantidos.

O background efetivamente usado era `frontend/public/assets/halloween-invitation-background.png`, carregado em `body` por `frontend/src/styles.css`, com `cover fixed` e gradientes. Os arquivos `halloween-background.png` e `halloween-background-cinematic.png` também existem, mas não eram o fundo da inicial. A inicial era implementada em `HomePage.tsx`, dentro de `PublicLayout.tsx`, e usava `HalloweenDecor.tsx` para decoração.

O plano de implementação foi:

1. Preservar a fotografia, os contratos e os arquivos que já tinham alterações locais.
2. Definir tokens, tipografia e componentes visuais reutilizáveis.
3. Separar a fotografia das camadas atmosféricas, adaptando sua composição para desktop e mobile.
4. Reconstruir header, hero, ações, contador e jornada dentro das rotas existentes.
5. Exibir as fases do servidor e validar o comportamento com build, lint, testes existentes e navegador local.

Não foram criadas galerias, sistemas de voto ou estruturas administrativas. As alterações locais preexistentes em `AdminDashboardPage.tsx`, `types/api.ts`, `server/participants.js` e `server/participant-delete.test.js` foram preservadas.

## Identidade e componentes

- Paleta: Obsidian `#0D0912`, Midnight Plum `#25152F`, Amber `#F47718`, Ivory `#E9D8BA` e Violet `#765D85`, com cores secundárias de texto para contraste.
- Cinzel variável para a marca, título principal e números; Manrope variável para interface; Georgia para frases editoriais. As duas fontes distribuídas são locais, com licenças OFL incluídas. A interface não depende de requisições a serviços de fontes.
- Botões, campos, superfícies, bordas, foco, toast e estados usam o mesmo vocabulário visual. As superfícies compartilhadas usam fundos definidos, com menos desfoque e transparência.
- O header oferece navegação contextual, estado do concurso, acesso administrativo e menu móvel com Escape, retorno de foco e fechamento ao navegar.
- O hero preserva data, cadastro, acesso aos participantes e ações condicionais de votação e resultado. Falhas de consulta oferecem nova tentativa sem inventar informações do evento.
- O contador é integrado ao cenário, com separadores finos, números tabulares e transição curta. A jornada usa uma linha do tempo sem transformar instruções em controles interativos.

## Fotografia preservada

O PNG original não foi modificado. Dimensões: **1672 × 941**. SHA-256:

```text
967e61ca25260c7a6bb2a0221f2d74b925fafde7b51148816da087b884ca4235
```

Uma cópia WebP da mesma fotografia, sem recorte ou alteração de personagens, foi gerada com Sharp, qualidade 90 e as mesmas dimensões. O PNG possui **3.057.599 bytes**; o WebP, **261.598 bytes**, redução de aproximadamente **91,4%**. O original continua como alternativa de formato no elemento `picture`. A otimização não adiciona dependências ao build.

No desktop, a fotografia ocupa o cenário e o texto fica à direita dos personagens. A proteção de leitura se concentra no lado do texto e na transição inferior. No tablet e mobile, a fotografia inteira é apresentada acima do conteúdo, na proporção original, evitando o recorte intenso que um `cover` em uma tela vertical causaria. Não há deformação ou animação da fotografia.

## Atmosfera, acessibilidade e desempenho

`HalloweenDecor` centraliza luz âmbar/violeta, duas camadas de névoa e sete partículas. O parallax move somente a atmosfera, limitado a 5 px na horizontal e 3 px na vertical, com um único frame pendente por interação. Não existe loop JavaScript contínuo de renderização.

As animações usam `transform` e `opacity`. Em telas menores há três partículas e uma camada de névoa. Dispositivos com até quatro processadores lógicos ou economia de dados usam atmosfera estática e sem partículas. A preferência por movimento reduzido remove animações, partículas e parallax. As animações contínuas pausam quando a página é ocultada; o contador suspende o timer e recalcula ao retornar. As camadas decorativas têm `aria-hidden`, não recebem foco e não interceptam cliques.

A página inclui salto para o conteúdo, landmarks, títulos hierárquicos, foco visível, áreas de toque de pelo menos 44 px, labels e feedback de cópia do link. O contador não anuncia cada segundo aos leitores de tela. A jornada continua visível sem IntersectionObserver. Não há requisito de WebGL.

Fotografia e fontes recebem preload. As fontes usam `font-display: swap`, a imagem tem dimensões explícitas e apenas o WebP é solicitado nos navegadores compatíveis. Não foram instalados Three.js, React Three Fiber ou bibliotecas de animação: CSS atende à direção artística sem adicionar uma cena ou runtime 3D.

## Datas, servidor e estados

O contador anterior da votação usava a constante local `2026-11-15T00:00:00-03:00`. A API já calcula e retorna `votingStartsAt`, `votingEndsAt`, `resultsRevealAt`, `serverTime` e `votingState`. A inicial passou a exibir esses horários oficiais, sem alterar datas cadastradas, fusos, endpoints ou regras do servidor.

`serverTime` é ancorado ao relógio monotônico do navegador no recebimento da resposta. Assim, o relógio do dispositivo não define a disponibilidade da votação. Na inicial, as configurações são consultadas novamente a cada 30 segundos enquanto a página estiver visível, no retorno à aba e ao finalizar um contador. Uma resposta antiga é cancelada ao sair do componente. Chegar a zero apenas solicita nova confirmação ao servidor.

| Estado recebido | Apresentação |
| --- | --- |
| `WAITING` + inscrições abertas | Cadastro, participantes e expectativa da votação |
| `WAITING` + inscrições encerradas | Participantes e preparação da votação |
| `OPEN` | Votar agora, QR Code, link e horário de encerramento quando existente |
| `TEST` | Acesso à experiência de teste e explicação sobre votos separados |
| `RESULT_PENDING` | Votação encerrada e expectativa pelo resultado, sem antecipar sua publicação |
| `RESULT_PUBLISHED` | Resultado quando autorizado por `showPublicResults` |
| `CLOSED` | Encerramento e resultado quando autorizado por `showPublicResults` |

A data/hora da festa mantém a conversão para o fuso configurado. Quando festa e votação têm horários diferentes, aparece um segundo contador compacto. Se os horários coincidem, o contador principal já cobre ambos e a data da festa continua escrita abaixo dele.

O servidor continua validando cada voto, identidade anônima, IP, duplicidade, contexto de teste/oficial e participante ativo. Nenhuma dessas regras foi transferida ao frontend.

## Arquivos desta etapa

| Arquivo ou diretório | Responsabilidade |
| --- | --- |
| `frontend/src/pages/HomePage.tsx` | Composição do hero e ações por fase |
| `frontend/src/layouts/PublicLayout.tsx` | Estrutura pública, contexto compartilhado, salto de conteúdo e rodapé |
| `frontend/src/components/HalloweenDecor.tsx` | Fotografia e atmosfera reutilizável |
| `frontend/src/components/halloween/PublicHeader.tsx` | Header e menu móvel |
| `frontend/src/components/halloween/EventStatus.tsx` | Identificação acessível da fase |
| `frontend/src/components/halloween/VotingPortal.tsx` | Expectativa, QR Code, cópia do link e resultado |
| `frontend/src/components/halloween/CinematicCountdown.tsx` | Relógio sincronizado, suspensão e transições |
| `frontend/src/components/halloween/ParticipationJourney.tsx` | Linha do tempo e entrada por visibilidade |
| `frontend/src/services/useEventSettings.ts` | Consulta cancelável, nova tentativa e atualização opcional |
| `frontend/src/services/eventSchedule.ts` | Conversão da data da festa e unidades do contador |
| `frontend/src/styles.css` | Componentes compartilhados |
| `frontend/src/styles/tokens.css` | Tokens, fontes, foco e movimento reduzido |
| `frontend/src/styles/cinematic.css` | Composição, atmosfera e breakpoints |
| `frontend/tailwind.config.js` | Integração da paleta com os estilos existentes |
| `frontend/index.html` | Preloads, metadados e cor do navegador |
| `frontend/public/assets/halloween-invitation-background.webp` | Entrega otimizada da fotografia |
| `frontend/public/assets/fonts/` | Cinzel, Manrope e suas licenças |
| `frontend/tests/cinematic.test.mjs` | Regressões de navegador e acessibilidade |
| `docs/ETAPA_1_CINEMATOGRAFICA.md` | Diagnóstico, decisões, validação e próximos passos |

## Como repetir a validação

Na raiz do repositório:

```powershell
npm test
npm --prefix frontend run build
npm --prefix frontend run lint
```

Os testes visuais usam Node.js com `node:test`, Playwright e axe-core, sem alterar as dependências de produção. Instale as ferramentas de QA em uma pasta temporária e use um Chrome instalado:

```powershell
$qaToolsPath = Join-Path $env:TEMP 'halloween-cinematic-qa'
npm install --prefix $qaToolsPath --no-audit --no-fund playwright @axe-core/playwright
$env:HALLOWEEN_QA_TOOLS = Join-Path $qaToolsPath 'node_modules'
node --test frontend/tests/cinematic.test.mjs
```

Opcionalmente, `HALLOWEEN_BROWSER` indica o caminho de um Chromium/Chrome e `HALLOWEEN_QA_OUTPUT` define a pasta das capturas. A porta local **4174** deve estar livre. O teste inicia e encerra o preview do Vite; o build precisa existir. Os cenários interceptam a API no navegador com respostas de teste e não gravam participantes ou votos em nenhum banco.

São verificados fotografia original, fontes locais, sete larguras de 320 a 1920 px, botões, menu por teclado, todos os estados, relógio do servidor com dispositivo em outra data, transições de fase, upload multipart, rotas existentes, erro/nova tentativa, movimento reduzido, economia em dispositivos simples, pausa de atmosfera, cópia do link, WCAG A/AA e estabilidade de layout. As capturas desktop e mobile são geradas na pasta indicada pelo teste.

## Resultados da validação em 15/10/2026

| Verificação | Resultado |
| --- | --- |
| `npm test` na raiz | 20 testes aprovados |
| `npm --prefix frontend run build` | TypeScript e Vite aprovados; nenhuma dependência ou fonte ausente |
| `npm --prefix frontend run lint` | Zero erros; um aviso preexistente em `AuthContext.tsx` |
| `node --test frontend/tests/cinematic.test.mjs` | 12 testes aprovados, zero falhas |
| axe-core | Zero violações automatizadas nas verificações A/AA de desktop, mobile e votação aberta/em teste |
| Layout | 320, 375, 390, 768, 1024, 1440 e 1920 px sem rolagem horizontal ou título/ações fora da tela |
| Revisão visual | Capturas completas de 1440 e 390 px inspecionadas; personagens preservados e informações sem sobreposição |
| Console | Sem erros inesperados nos cenários válidos; falha 503 simulada no cenário de recuperação |
| Fotografia | Hash SHA-256 original confirmado; uma única requisição à cópia WebP |
| LCP/CLS local | Última execução: LCP 836 ms, CLS 0,0335; valores sintéticos, API simulada e rede sem limitação |
| `backend/mvnw.cmd test` com JDK 21 | Cinco erros de inicialização por versões Flyway V2 duplicadas preexistentes |
| `git diff --check` | Sem erros de whitespace |

## Limitações e Etapa 2

- As simulações de navegador validam contratos e interação, mas não substituem um teste integrado com PostgreSQL e Vercel Blob reais em um ambiente de homologação autorizado.
- A aferição local de LCP/CLS é sintética, sem limitação de rede. INP e Web Vitals de campo precisam ser medidos no ambiente publicado; não há coleta nova de telemetria nesta etapa.
- O lint possui um aviso preexistente de Fast Refresh em `frontend/src/contexts/AuthContext.tsx`.
- Os testes Spring Boot foram executados com JDK 21 e perfil `test` (H2 em memória), mas a inicialização é bloqueada por duas migrations preexistentes com versão `V2`: `V2__admin_upload_and_visibility.sql` e `V2__anonymous_voter_votes.sql`. Os cinco testes terminam com erro de inicialização. Alterar migrations exige uma análise separada do histórico dos bancos; nenhuma migration foi modificada.
- Na Etapa 2, refinar galeria, seleção/confirmação de voto e resultados usando os tokens existentes; verificar a integração real em homologação e medir desempenho em aparelhos físicos antes de avançar com efeitos adicionais.

Nenhum deploy foi realizado e nenhuma credencial ou variável de ambiente persistente foi alterada.
