# Halloween — Concurso de Melhor Fantasia

Sistema full stack para uma festa real: cadastro de fantasias, listagem pública, votação anônima por navegador, painel administrativo, QR Codes, encerramento da votação e resultado público com ranking e confetes.

## Tecnologias

- API usada pela Vercel: Node.js serverless, PostgreSQL via `pg`, JWT e BCrypt.
- Módulo Java: Spring Boot, Spring Data JPA, Spring Security, Flyway e Maven.
- Frontend: React, TypeScript, Vite, Tailwind CSS, React Router, Axios, React Hook Form, Zod, Lucide Icons, QR Code e canvas-confetti.
- Banco: PostgreSQL persistente. Os dados ficam no banco e não desaparecem quando uma nova versão é publicada.

## Arquitetura

- `backend/`: implementação Spring Boot mantida no repositório e migrations Flyway.
- `frontend/`: aplicação pública e painel admin responsivo, mobile-first.
- `api/` e `server/`: handler da API serverless implantada junto ao frontend na Vercel.
- `docker-compose.yml`: PostgreSQL local com volume persistente.

Principais tabelas:

- `participants`
- `vote_codes`
- `votes`
- `event_settings`
- `admin_users`

O handler serverless usado pela Vercel gera um identificador aleatório e o guarda em cookie assinado `HttpOnly`. O banco impõe unicidade em `votes(voter_id, is_test_vote)`, separando votos de teste e oficiais. A migration Flyway `V2__anonymous_voter_votes.sql` adiciona essa estrutura sem apagar votos; as tabelas e colunas antigas de códigos são preservadas, mas não são usadas pelo fluxo atual.

## Variáveis de Ambiente

Backend (`backend/.env.example`):

```env
DATABASE_URL=jdbc:postgresql://localhost:5432/festa_fantasia
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=postgres
JWT_SECRET=troque-por-uma-chave-com-pelo-menos-32-caracteres
CORS_ALLOWED_ORIGINS=http://localhost:5173
MAX_PHOTO_SIZE_MB=5
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_UPLOAD_PRESET=
ADMIN_REGISTRATION_CODE=
```

Frontend (`frontend/.env.example`):

```env
VITE_API_URL=
VITE_APP_URL=http://localhost:5173
```

## Como Executar Localmente

1. Suba o PostgreSQL:

```bash
docker compose up -d
```

2. Rode o backend:

```bash
cd backend
./mvnw spring-boot:run
```

No Windows:

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

3. Rode o frontend:

```bash
cd frontend
npm install
npm run dev
```

4. Acesse:

- Público: `http://localhost:5173`
- Admin: `http://localhost:5173/admin`

## Criar Administrador

Na tela `/admin`, use o link para criar o administrador inicial. A API só permite o bootstrap quando ainda não existe nenhum administrador e exige `ADMIN_REGISTRATION_CODE` no backend.

Depois disso, use login normal com e-mail e senha. As senhas são armazenadas com BCrypt, nunca em texto puro.

## Fluxo da Festa

1. Organizador cria o admin.
2. Participantes acessam `/cadastro` ou escaneiam o QR Code de cadastro.
3. Convidados acessam `/votar`; a API cria um identificador anônimo para o navegador.
4. A pessoa escolhe uma fantasia e confirma o voto; o backend valida o participante e o estado da votação.
5. Votos de teste ficam separados dos oficiais. Desativar o modo de teste permite que o mesmo navegador vote uma vez na votação oficial.
6. Admin encerra a votação.
7. Público acessa `/resultado`.

## Deploy

Backend:

- Railway ou Render.
- Configure PostgreSQL gerenciado.
- Defina `DATABASE_URL`, `DATABASE_USERNAME`, `DATABASE_PASSWORD`, `JWT_SECRET` e `CORS_ALLOWED_ORIGINS`.
- Defina `CLOUDINARY_CLOUD_NAME` e `CLOUDINARY_UPLOAD_PRESET` para persistir fotos em produção.
- Defina `ADMIN_REGISTRATION_CODE` somente no backend para autorizar a criação do administrador inicial. Não use `VITE_` para esse código.
- Para Neon, use a URL JDBC no backend, por exemplo `jdbc:postgresql://HOST/neondb?sslmode=require`, junto com `DATABASE_USERNAME` e `DATABASE_PASSWORD`.
- Configure `CORS_ALLOWED_ORIGINS` com a URL da Vercel, por exemplo `https://seu-projeto.vercel.app`.

Frontend:

- Vercel.
- Se o frontend e a API forem publicados juntos, `VITE_API_URL` pode ficar vazio: as chamadas de produção usam `/api` no mesmo domínio. Em desenvolvimento, deixe a variável vazia para usar o backend local em `http://localhost:8080/api`, ou defina-a para apontar a outro backend. Nunca coloque segredos em variáveis `VITE_*`.
- Se o projeto Vercel estiver apontando para a raiz do repositório, o `vercel.json` instala e compila o frontend dentro de `frontend/`, mantendo as rotas da SPA em `index.html`.

API serverless da Vercel:

- `api/[...path].js` é o único arquivo de endpoint dentro de `api/` e encaminha as rotas para `server/api-handler.js`. O roteador delega para módulos server-side separados: `database.js`, `http.js`, `settings.js`, `participants.js`, `voting.js`, `results.js` e `admin.js`. Eles ficam fora da pasta que a Vercel trata como Functions.
- Os caminhos (`/api/settings`, `/api/participants`, `/api/voting/status`, `/api/voting/live-results`, `/api/admin/*`, `/api/votes` e `/api/results`) continuam disponíveis pela mesma Function. Isso mantém o deployment dentro do limite do plano Hobby.
- Configure `DATABASE_URL`, `ADMIN_REGISTRATION_CODE`, `JWT_SECRET`, `VOTER_COOKIE_SECRET` e `IP_HASH_SECRET` nas variáveis server-side da Vercel. `VOTER_COOKIE_SECRET` deve ter pelo menos 32 caracteres e permanecer estável entre deploys; se não estiver definida, o backend usa `JWT_SECRET`. `IP_HASH_SECRET` deve ser server-side e estável para gerar o hash de IP sem salvar o IP bruto. Em produção, o cookie também recebe `Secure`. O backend usa `pg` e PostgreSQL (incluindo Neon); não usa Prisma. `VITE_API_URL` não é necessária para chamadas same-origin.
- `POST /api/admin/register` exige `ADMIN_REGISTRATION_CODE` e permite registrar outra conta; `POST /api/admin/login` requer somente e-mail e senha. O endpoint legado `/api/admin/bootstrap` continua restrito à criação inicial.
- O cadastro público de participantes envia as fotos para o Vercel Blob. Conecte o Blob Store ao projeto Vercel correto e habilite OIDC para o ambiente Production. `@vercel/blob` usa a credencial OIDC e o `BLOB_STORE_ID` fornecidos pela Vercel automaticamente; não passe um token manual para `put`. `BLOB_READ_WRITE_TOKEN` é alternativa quando OIDC não estiver disponível.

Banco:

- Neon, Supabase ou Railway.
- Configure `DATABASE_URL` para a API serverless, com SSL quando exigido pelo provedor. Não use banco efêmero em produção.

## Upload de Fotos

O cadastro público da API serverless valida JPG, PNG e WEBP de até 5 MB, envia a foto ao Vercel Blob e salva somente a URL pública retornada em `photo_url` no Neon. O pacote `@vercel/blob` está fixado em `2.8.0` no lockfile e dá suporte à autenticação OIDC da Vercel sem token manual. A implementação Spring Boot separada usa Cloudinary e suas variáveis `CLOUDINARY_*`; elas não são usadas pelo fluxo serverless do frontend.

## Testes e Build

API serverless:

```bash
npm test
```

Frontend:

```bash
cd frontend
npm run build
```

Os testes da API verificam a assinatura/flags do cookie, voto duplicado concorrente, isolamento teste/oficial e participante inativo. O build do frontend também executa o TypeScript. O módulo Spring Boot é uma implementação separada no repositório; os testes dele podem ser executados com JDK 17 usando `cd backend; .\mvnw.cmd test` no Windows.

## Dados de Desenvolvimento

Com perfil `dev`, o Flyway carrega:

- Letícia — Malévola
- João — Coringa
- Ana — Wandinha
- Pedro — Harry Potter

Esses dados ficam em `backend/src/main/resources/db/dev` e não rodam no perfil padrão de produção.
