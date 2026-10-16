# Correção da profundidade fotográfica — 16/10/2026

## O que estava faltando

A implementação anterior mantinha a fotografia inteira em um plano CSS. A câmera e a atmosfera tinham profundidade, mas céu, árvores, personagens e chão da fotografia não respondiam de forma diferente. Essa limitação não atendia ao efeito solicitado.

Agora a fotografia é reprojetada por um shader WebGL com um mapa de profundidade dedicado. Não é apenas o movimento de uma imagem plana: regiões diferentes da própria imagem apresentam deslocamentos diferentes.

## Fotografia preservada

Os arquivos originais continuam byte a byte iguais:

| Arquivo | SHA-256 |
| --- | --- |
| `frontend/public/assets/halloween-invitation-background.png` | `967e61ca25260c7a6bb2a0221f2d74b925fafde7b51148816da087b884ca4235` |
| `frontend/public/assets/halloween-invitation-background.webp` | `f77e806cf2ec42777539b83cefdc59c7573897ffd45bc953910b0c81667d1a89` |

A imagem laranja anexada não substitui a fotografia: a orientação anterior proíbe essa troca. O tratamento de apresentação foi clareado em 13% por CSS, tanto na versão estática quanto na versão WebGL, sem alterar os pixels dos arquivos de origem.

`halloween-invitation-depth.svg` é um mapa auxiliar em tons de cinza, desenhado para as coordenadas da fotografia original. Não é uma nova fotografia nem uma imagem gerada. Ele diferencia céu, árvores, casa, terreno e os dois personagens. As regiões dos personagens compartilham uma profundidade constante, com margem de proteção e transições suaves externas para evitar deformações nas máscaras e no interior dos figurinos.

## Implementação

- `photoDepthRenderer.ts`: WebGL nativo, dois triângulos e duas texturas: fotografia e profundidade. O shader realiza quatro passos de reprojeção inversa, com amplitude limitada e coordenadas protegidas nas bordas. A composição reproduz `object-fit: cover` e `object-position: 36% center`.
- `usePhotoDepth.ts`: carregamento assíncrono do renderer e do mapa, aproveitamento da imagem já decodificada, resize e liberação de recursos/listeners. Falha de carregamento, compilação ou contexto mantém a fotografia estática; restauração do contexto reinicializa o efeito.
- `useCinematicCamera.ts`: compartilha as coordenadas interpoladas com o shader através de uma referência, sem atualizações React por frame e sem ler estilos ou layout a cada movimento.
- `ScenePhotograph.tsx` e `CinematicScene.tsx`: integração do canvas atrás da interface, mantendo o elemento `picture` original disponível durante todo o carregamento e como fallback.
- `cinematic-scene.css`: canvas decorativo, tratamento consistente da imagem e exibição apenas após a inicialização. Névoa, partículas, luz e planos atmosféricos anteriores permanecem.

Uma margem fixa de 2,5% no desktop protege as bordas expostas pelo deslocamento, aplicada igualmente ao `picture` e ao canvas para manter a transição consistente. Essa margem não é animada e não é aplicada no mobile; não existe animação de zoom.

O módulo WebGL é carregado separadamente: **3,41 kB, aproximadamente 1,53 kB gzip**. Nenhuma biblioteca, dependência ou lockfile foi adicionado ou alterado. A adoção de WebGL permite a reprojeção da fotografia que o plano CSS anterior não oferecia, sem carregar uma engine 3D.

## Performance e fallback

- O shader desenha durante a interpolação da câmera e em eventos de inicialização/resize; não possui um loop contínuo próprio. Ao estabilizar o cursor, os desenhos WebGL cessam.
- Resolução limitada a 1920 × 1200 e densidade máxima de 1,5; antialias, stencil, depth buffer e preservação do buffer estão desativados.
- Aba oculta e cenário fora da viewport interrompem atualizações de câmera. A atmosfera CSS respeita a suspensão existente.
- Mobile/tablet, movimento reduzido e dispositivos classificados como simples não criam o canvas nem carregam o renderer/mapa. A fotografia permanece estável e os controles continuam disponíveis.
- Contexto indisponível ou perdido revela imediatamente o `picture` original. A restauração do contexto e a troca dinâmica para movimento reduzido foram testadas.
- Toda a decoração continua `aria-hidden` e `pointer-events: none`; header, conteúdo, botões e contador não acompanham a câmera.

## Validação executada

| Verificação | Resultado |
| --- | --- |
| `npm.cmd run build` em `frontend/` | TypeScript e Vite aprovados, sem TS2307 |
| `npm.cmd --prefix frontend run lint` | Zero erros; um aviso preexistente em `AuthContext.tsx:44` |
| `npm.cmd --prefix frontend run test:deploy` | Quatro testes aprovados; novos arquivos e imports presentes no índice Git com capitalização exata |
| `npm.cmd test` na raiz | 20 testes aprovados |
| `node --test frontend/tests/cinematic.test.mjs` | 17 testes de navegador aprovados |
| Fotografia | Hashes PNG/WebP preservados e apenas uma requisição fotográfica |
| Profundidade fotográfica | Comparação de pixels entre os extremos da câmera: céu +21 px, árvores +3 px, chão −22 px, ambas as máscaras −16 px; figurinos −16/−17 px |
| Fallback | WebGL indisponível, perda/restauração do contexto, mobile, ausência de CSS 3D, hardware simples e movimento reduzido aprovados |
| Interface | Rotas, cadastro/upload, fases do concurso, contador, menu por teclado, estados de erro e acessibilidade A/AA aprovados com API simulada |
| Responsividade | Sete larguras, de 320 a 1920 px, sem rolagem horizontal nos cenários cobertos |
| Renderização local | LCP 440 ms, CLS 0,0336; medição sintética sem limitação de rede, não uma medição em produção |

Os testes de profundidade isolam o canvas das transformações CSS e comparam trechos da fotografia, não apenas matrizes de transformação. Os dois testes adicionais comprovam o deslocamento diferencial dos pixels, a translação uniforme das regiões amostradas das máscaras, a ausência de desenhos WebGL em repouso e o fallback navegável.

As capturas `photo-depth-integrated.png`, `photo-depth-left.png`, `photo-depth-right.png`, `home-1440.png` e `home-390.png` são geradas em `%TEMP%/halloween-cinematic-results/` e foram inspecionadas. Os testes usam Chrome e as ferramentas Playwright, axe e Sharp já instaladas na pasta temporária de QA; não dependem de serviços de produção.

## Arquivos desta correção

- `frontend/public/assets/halloween-invitation-depth.svg`
- `frontend/src/components/halloween/scene/photoDepthRenderer.ts`
- `frontend/src/components/halloween/scene/usePhotoDepth.ts`
- `frontend/src/components/halloween/scene/ScenePhotograph.tsx`
- `frontend/src/components/halloween/scene/CinematicScene.tsx`
- `frontend/src/components/halloween/scene/useCinematicCamera.ts`
- `frontend/src/styles/cinematic-scene.css`
- `frontend/tests/cinematic.test.mjs`
- `docs/CENARIO_CINEMATOGRAFICO_25D.md`
- `docs/CORRECAO_PROFUNDIDADE_FOTOGRAFICA.md`

## Limites e entrega

Trata-se de **reprojeção fotográfica 2.5D**, não de personagens modelados em 3D. O mapa é uma aproximação artística de profundidade, não uma reconstrução métrica. A câmera é deliberadamente limitada: não revela partes ocultas atrás dos personagens, não permite órbita livre e não anima poses, cabelo ou tecido. Uma câmera ampla exigiria segmentação precisa e reconstrução de regiões ocultas, fora desta correção.

A validação mobile é emulada; aparelhos físicos e o ambiente publicado não foram verificados. Os testes usam API simulada e não gravam dados reais. Banco, backend, regras de votação, credenciais e variáveis de ambiente permanecem intocados. O arquivo preexistente `server/participant-delete.test.js` permanece fora destas alterações.

A compilação local ocorre no Windows. A resolução case-sensitive é verificada no índice Git; não foi executada uma compilação Linux nesta sessão. Todos os arquivos desta correção estão incluídos no índice Git.

Não houve commit, push ou deploy nesta correção.
