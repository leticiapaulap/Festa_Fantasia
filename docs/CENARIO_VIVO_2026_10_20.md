# Cenário fotográfico vivo — 20/10/2026

## Diagnóstico e escopo

A home usa `PublicLayout` → `HalloweenDecor` → `CinematicScene`. A fotografia ativa é `frontend/public/assets/halloween-invitation-background.png`, com a versão WebP existente entregue por `ScenePhotograph`. A organização continua com personagens à esquerda e título, ações e contador à direita.

O commit anterior já tinha reprojeção WebGL por mapa de profundidade e câmera interpolada. Porém, o shader só redesenhava com o cursor; em repouso, a flutuação CSS deslocava o conjunto inteiro. A evolução acrescenta flutuação fotográfica por profundidade, névoa que considera distância e proteção dos personagens, e iluminação temporal discreta.

A última solicitação proíbe substituir a fotografia ou usar a imagem gerada anteriormente. Por isso, a imagem laranja anexada não foi incorporada. Não houve alteração de hero, header, rotas, formulários, calendário, regras de votação, administração, backend ou banco.

## Fotografia e fidelidade

Os arquivos da fotografia permanecem byte a byte iguais:

| Arquivo | SHA-256 |
| --- | --- |
| `halloween-invitation-background.png` | `967e61ca25260c7a6bb2a0221f2d74b925fafde7b51148816da087b884ca4235` |
| `halloween-invitation-background.webp` | `f77e806cf2ec42777539b83cefdc59c7573897ffd45bc953910b0c81667d1a89` |

O mapa auxiliar SVG agora tem dois canais: vermelho para a profundidade existente e verde para a região de proteção dos personagens. O canal de profundidade conserva os mesmos valores e contornos. O canal verde atenua em até 98% a névoa e a luz adicionadas sobre as regiões protegidas, sem recortar ou reconstruir a fotografia.

As máscaras e o interior dos figurinos continuam em uma profundidade uniforme. Não há mudança de pose, caminhada, animação artificial de cabelo/tecido nem novo personagem. A margem fixa de 2,5% já existente no desktop protege as bordas; não foi adicionado zoom animado.

## Movimento e atmosfera

- A câmera continua amortecendo o cursor, sem atualizar estado React por movimento. O shader combina essa posição com uma deriva de amplitude muito pequena, diferente por profundidade, que também funciona sem mouse.
- `sceneAnimation.ts` centraliza o relógio ambiental, com orçamento de 24 desenhos por segundo. A câmera CSS conserva sua interpolação existente; a fotografia usa o relógio limitado.
- A névoa procedural combina duas escalas de ruído e se concentra no solo. Profundidade e máscara dos personagens modulam sua densidade, em vez de aplicar a mesma névoa sobre todos os elementos.
- A iluminação âmbar/violeta varia lentamente, com intensidade reduzida sobre os personagens. As camadas CSS de névoa, luz e as dez partículas existentes permanecem independentes.
- O relógio congela ao pausar e retoma sem incluir o tempo da aba oculta. Deltas acima de 100 ms são limitados para evitar saltos após travamentos.

## Ciclo de vida e fallback

`usePhotoDepth` carrega o shader separadamente e só revela o canvas depois do primeiro desenho válido. A referência da imagem já carregada é reutilizada: não há segunda requisição da fotografia.

Movimento reduzido, dispositivos classificados como simples e páginas internas não iniciam a animação WebGL. Mobile/tablet continuam com fotografia estável e atmosfera leve, sem depender do cursor. Todos os efeitos são decorativos, com `pointer-events: none` e fora da árvore de acessibilidade.

Aba oculta e cenário fora da viewport interrompem o relógio e os desenhos GPU. A restauração do contexto reinicializa o renderer. Versões de inicialização impedem que carregamentos atrasados reativem um renderer descartado. Listeners, observadores, frames, programas, buffers e texturas são liberados ao sair da cena.

Falhas de contexto, shader ou decodificação do mapa mantêm o `picture` original e a navegação funcional. O renderer continua com resolução limitada a 1920 × 1200 e densidade máxima de 1,5. Não foi adicionado Three.js, React Three Fiber ou qualquer outra dependência de produção. O módulo WebGL tem aproximadamente 2,10 kB gzip; o JavaScript inicial passou de 140,83 para 141,09 kB gzip.

## Validação

| Verificação | Resultado |
| --- | --- |
| `npm.cmd run build` em `frontend/` | TypeScript e Vite aprovados |
| `npm.cmd run lint` em `frontend/` | Zero erros; um aviso preexistente em `AuthContext.tsx:44` |
| `npm.cmd run test:scene` em `frontend/` | Quatro testes aprovados: limite de frames, pausa/retomada, timestamps anômalos e cancelamento durante desenho |
| `npm.cmd run test:deploy` em `frontend/` | Quatro testes aprovados; arquivos e imports conferidos no índice Git com capitalização exata |
| `node --test frontend/tests/cinematic.test.mjs` | 19 testes de navegador aprovados |
| `npm.cmd test` na raiz | 20 testes aprovados, sem chamadas a dados reais |
| Fotografia e profundidade | Hashes preservados; comparação de pixels confirma deslocamentos distintos entre céu, árvores, chão e personagens |
| Movimento sem cursor | Em 0/8 segundos, as duas máscaras se deslocam uniformemente em aproximadamente 1 px, com baixo erro nos trechos comparados |
| Suspensão e descarte | Testados aba oculta, saída da viewport, navegação, movimento reduzido, perda/restauração de contexto e mapa inválido |
| Layout e funcionalidade | Sete larguras, 320–1920 px; cadastro/upload, participantes, fases de votação, contador, resultados, menu por teclado e acesso administrativo com API simulada |
| Acessibilidade | Verificações automatizadas A/AA aprovadas nos cenários cobertos |
| Métricas locais | LCP 348 ms; CLS 0,0336; sem limitação de rede e com API simulada, não representam produção |

A comparação fotográfica congela apenas o tempo do shader nos testes para isolar a resposta ao cursor. Um teste separado comprova que o relógio real avança sem cursor, respeita o orçamento e produz frames diferentes sem alterar as formas das máscaras amostradas. Os testes unitários do relógio também foram incluídos no workflow Ubuntu existente.

Os novos arquivos estão rastreados no índice Git, prontos para commit. A verificação de whitespace não encontrou erros.

As capturas desktop/mobile e `scene-alive-desktop.png`, `photo-ambient-0.png`, `photo-ambient-8.png` ficam em `%TEMP%/halloween-cinematic-results/` e foram inspecionadas. Playwright, axe e Sharp são ferramentas locais de QA já existentes nessa pasta temporária, não dependências adicionadas ao produto.

## Arquivos

- `.github/workflows/frontend-build.yml`
- `frontend/package.json`
- `frontend/public/assets/halloween-invitation-depth.svg`
- `frontend/src/components/halloween/scene/photoDepthRenderer.ts`
- `frontend/src/components/halloween/scene/sceneAnimation.ts`
- `frontend/src/components/halloween/scene/usePhotoDepth.ts`
- `frontend/tests/cinematic.test.mjs`
- `frontend/tests/scene-animation.test.mjs`
- `docs/CORRECAO_PROFUNDIDADE_FOTOGRAFICA.md`
- `docs/CENARIO_VIVO_2026_10_20.md`

## Limitações e entrega

É uma experiência fotográfica **2.5D**, não modelagem 3D completa ou “5D”. A fotografia não fornece geometria oculta: não há órbita livre, revelação do que está atrás dos personagens ou animação independente de seus corpos.

Mobile foi validado por emulação; aparelhos físicos e desempenho/INP em produção continuam pendentes. A compilação local foi executada no Windows; o workflow Ubuntu só executará após envio ao repositório. Nenhuma credencial, variável sensível, dependência ou lockfile foi alterado. O arquivo preexistente `server/participant-delete.test.js` permanece fora destas alterações.

Não foi feito commit, push ou deploy nesta implementação.
