# Cenário cinematográfico 2.5D — 16/10/2026

## Diagnóstico e decisão técnica

A home usa `PublicLayout` → `HalloweenDecor`, com composição em `HomePage.tsx`. Antes desta evolução, a fotografia ficava imóvel e um deslocamento CSS movia conjuntamente a atmosfera. O background correto continua sendo `frontend/public/assets/halloween-invitation-background.png`, servido pela cópia WebP existente quando o navegador suporta esse formato.

A fotografia não possui céu, árvores, personagens e vegetação em arquivos separados. Separar os personagens exigiria reconstruir áreas ocultas e tratar cabelo, tecido e a máscara solar; um recorte aproximado criaria duplicações ou bordas. A solução preserva a fotografia completa em um único plano fotográfico e constrói profundidade com perspectiva, câmera, planos atmosféricos, foco e iluminação independentes. A imagem gerada anexada à conversa não foi incorporada ao produto.

Foi usado **CSS transform 3D**, sem Three.js, React Three Fiber, bibliotecas de animação ou WebGL. Para esta cena fotográfica, a perspectiva de planos e a atmosfera atendem à proposta sem introduzir shaders, geometria deformável, download de engine ou dependência de contexto gráfico.

## Fotografia e composição

Os dois arquivos fotográficos existentes permanecem byte a byte iguais ao commit anterior:

| Arquivo | SHA-256 |
| --- | --- |
| `halloween-invitation-background.png` | `967e61ca25260c7a6bb2a0221f2d74b925fafde7b51148816da087b884ca4235` |
| `halloween-invitation-background.webp` | `f77e806cf2ec42777539b83cefdc59c7573897ffd45bc953910b0c81667d1a89` |

Há somente um elemento `img` fotográfico na cena. Não foram criados recortes, fotografias alternativas, mapas de deslocamento ou cópias deslocadas dos personagens. Máscaras, roupas e poses permanecem dentro da fotografia íntegra.

Header, hero, frase, data, status, botões, contador, jornada e rotas não foram reposicionados. A camada de proteção de leitura fica fora da câmera, por cima da atmosfera, mantendo a legibilidade à direita. Toda a decoração usa `aria-hidden` e `pointer-events: none`.

No desktop com profundidade habilitada, uma margem técnica de 10 px cobre as pequenas inclinações da câmera. No mobile, essa margem e os transforms de câmera não são usados; a fotografia inteira mantém a proporção original de 1672 × 941 acima do conteúdo.

## Câmera e planos

A perspectiva é de **1200 px**, com foco visual em 28%/56%, próximo aos personagens. Os planos têm distâncias distintas:

| Plano | Profundidade Z | Resposta horizontal adicional máxima ao cursor |
| --- | --- | --- |
| Fotografia íntegra | −120 px | 3 px |
| Iluminação do céu | −95 px | 1 px |
| Névoa distante | −65 px | 1,5 px |
| Partículas distantes | −45 px | 2 px |
| Luz do solo | −30 px | 2 px |
| Névoa do chão | +45 px | 5 px |
| Partículas intermediárias | +80 px | 7 px |
| Névoa de primeiro plano | +170 px | 13 px |
| Partículas próximas | +260 px | 18 px |

As escalas fixas dos planos compensam a perspectiva, mantendo o enquadramento aparente em repouso; não há animação de zoom. A câmera inclina no máximo 0,24° na horizontal e 0,14° na vertical. O primeiro plano reage mais que a fotografia, oferecendo uma diferença espacial observável.

`useCinematicCamera` recebe a posição desejada do cursor e interpola com amortecimento exponencial de 170 ms, independente da taxa de quadros. O delta é limitado a 64 ms para evitar saltos após travamentos momentâneos. Só duas variáveis CSS são atualizadas; não há atualização React por movimento do ponteiro nem leitura de layout dentro do loop.

O loop `requestAnimationFrame` encerra ao estabilizar. Um movimento ambiental separado, executado por CSS em um ciclo de 44 segundos, flutua entre −1/1 px horizontalmente e 1/−1,5 px verticalmente, com rotação mínima. Não depende de um loop JavaScript em repouso.

## Atmosfera

- Três volumes de névoa simulados por textura procedural SVG, transparência, máscaras suaves e planos com velocidades diferentes: 36, 43 e 57 segundos. A densidade se concentra no chão, com laterais suaves e intensidade menor na área dos textos.
- `scene-fog.svg` é uma textura declarativa pequena, com ruído e desfoque estáticos. Os filtros não são animados; apenas os transforms e a opacidade das camadas mudam.
- Dez partículas no desktop: quatro distantes, quatro intermediárias e duas próximas. Tamanho, desfoque e profundidade distinguem os grupos. A subida e a oscilação lateral ficam em elementos diferentes para não disputar o mesmo transform.
- Iluminação âmbar/violeta em planos independentes, reflexo difuso no solo e raios de luz discretos. Variações lentas de opacidade preservam o aspecto noturno sem esconder os personagens.

## Performance, mobile e fallback

`useSceneEnvironment` define três modos:

| Modo | Condições e comportamento |
| --- | --- |
| `full` | Home em viewport ≥900 px, ponteiro fino, CSS 3D suportado e sem restrições de movimento/hardware: câmera, perspectiva e atmosfera completa |
| `ambient` | Mobile, tablet, ponteiro sem precisão ou ausência de CSS 3D: fotografia estável, uma névoa e quatro partículas intermediárias; sem controle por cursor |
| `static` | Movimento reduzido, `update: slow`, economia de dados, até quatro processadores lógicos, memória informada abaixo de 4 GB ou página interna: câmera e animações desligadas, sem partículas e névoa estática simples |

Um `IntersectionObserver` e `visibilitychange` suspendem a cena quando ela sai da área visível ou a aba é ocultada. A câmera cancela o frame pendente. Animações CSS pausam com `animation-play-state`; listeners, observadores e frames são liberados ao desmontar ou trocar de modo. Mudanças de viewport, ponteiro, preferência de movimento e economia de dados são acompanhadas sem polling.

O fallback não depende de WebGL. A textura de névoa não substitui a fotografia. Uma falha em um efeito decorativo não remove a imagem, o conteúdo ou os controles.

## Arquivos alterados e criados

| Arquivo | Responsabilidade |
| --- | --- |
| `frontend/src/components/HalloweenDecor.tsx` | Adaptador para o cenário reutilizável, preservando os consumidores existentes |
| `frontend/src/components/halloween/scene/CinematicScene.tsx` | Composição dos planos, lente e câmera |
| `frontend/src/components/halloween/scene/ScenePhotograph.tsx` | Fotografia original e WebP existente |
| `frontend/src/components/halloween/scene/SceneFog.tsx` | Três planos de névoa |
| `frontend/src/components/halloween/scene/SceneLighting.tsx` | Luz distante, reflexos e iluminação âmbar/violeta |
| `frontend/src/components/halloween/scene/SceneParticles.tsx` | Partículas determinísticas em três distâncias |
| `frontend/src/components/halloween/scene/useCinematicCamera.ts` | Interpolação, limites e ciclo de vida da câmera |
| `frontend/src/components/halloween/scene/useSceneEnvironment.ts` | Capacidades, movimento reduzido e visibilidade |
| `frontend/src/styles/cinematic-scene.css` | Perspectiva, atmosfera, animações e fallbacks |
| `frontend/src/styles/cinematic.css` | Remoção das regras antigas de cenário, preservando as regras da interface |
| `frontend/src/styles.css` | Import da nova folha de estilos |
| `frontend/public/assets/scene-fog.svg` | Textura procedural de névoa |
| `frontend/tests/cinematic.test.mjs` | Regressões existentes e três novos testes de profundidade/performance/fallback |
| `docs/CENARIO_CINEMATOGRAFICO_25D.md` | Diagnóstico, decisões e validação |

Nenhum arquivo de backend, banco, variável de ambiente, dependência ou lockfile foi alterado. O arquivo local preexistente `server/participant-delete.test.js` permanece fora do staging.

## Validação executada

| Verificação | Resultado |
| --- | --- |
| `npm run build`, em `frontend/` | TypeScript e Vite aprovados |
| `npm --prefix frontend run lint` | Zero erros; um aviso preexistente de Fast Refresh em `AuthContext.tsx` |
| `npm --prefix frontend run test:deploy` | Quatro testes aprovados, incluindo novos imports e asset SVG no índice Git com capitalização exata |
| `npm test`, na raiz | 20 testes aprovados |
| `node --test frontend/tests/cinematic.test.mjs` | 15 testes de navegador aprovados |
| Profundidade e câmera | Matrizes 3D confirmam planos fotográfico/distante/próximo em Z distintos e deslocamentos diferentes; câmera interpola e deixa de escrever estilos após estabilizar |
| Interface durante a câmera | Limites dos botões permanecem exatamente iguais antes/depois do movimento; cadastro continua clicável |
| Suspensão e fallback | Testados movimento reduzido dinâmico, aba oculta, saída da viewport, hardware simples, mobile e CSS 3D indisponível |
| Layout e navegação | Sete larguras, 320–1920 px, sem rolagem horizontal; cadastro, upload, participantes, votação, resultados, ranking e acesso administrativo exercitados com API simulada |
| Acessibilidade e console | Verificações automatizadas A/AA sem violações nos cenários cobertos; sem erros inesperados no console |
| Revisão visual | Capturas desktop, mobile e desktop com câmera deslocada inspecionadas |
| Fotografia e lockfiles | Comparados a `HEAD`, sem alterações |
| LCP/CLS local | LCP 276 ms, CLS 0,0336; medição sintética sem limitação de rede e com API simulada |
| `git diff --cached --check` | Sem erros de whitespace |

O JavaScript gzip passou de aproximadamente 138,84 para 139,75 kB: acréscimo de cerca de 0,91 kB. O CSS gzip passou de aproximadamente 11,08 para 12,03 kB. Não foi adicionada biblioteca de produção.

As capturas são geradas em `%TEMP%/halloween-cinematic-results/`: `home-1440.png`, `home-390.png` e `scene-depth-desktop.png`. Os testes usam Playwright e axe-core instalados na pasta temporária de QA, conforme o procedimento documentado na Etapa 1.

## Limites e entrega

A fotografia continua em um único plano íntegro: não há animação independente de cabelo, roupa, máscaras, árvores ou vegetação. A sensação espacial vem da câmera rígida e dos planos atmosféricos, evitando uma segmentação sem qualidade suficiente. Não foi reconstruída geometria oculta atrás dos personagens.

A validação mobile ocorreu em navegador com viewport e capacidades emuladas; ainda cabe uma revisão em aparelhos físicos e uma medição de desempenho no ambiente real. Os testes de navegação usam respostas locais simuladas da API e não gravam dados de produção.

Todos os arquivos desta implementação estão incluídos no índice Git. Não foi feito commit, push ou deploy nesta etapa.
