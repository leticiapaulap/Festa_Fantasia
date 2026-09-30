# Halloween — Concurso de Melhor Fantasia

Sistema full stack para uma festa real: cadastro de fantasias, listagem pública, votação com códigos únicos, painel administrativo, QR Codes, encerramento da votação e resultado público com ranking e confetes.

## Tecnologias

- Backend: Java 17+, Spring Boot, Spring Web, Spring Data JPA, Spring Security, JWT, BCrypt, Bean Validation, Flyway, Maven e PostgreSQL.
- Frontend: React, TypeScript, Vite, Tailwind CSS, React Router, Axios, React Hook Form, Zod, Lucide Icons, QR Code e canvas-confetti.
- Banco: PostgreSQL persistente. Os dados ficam no banco e não desaparecem quando uma nova versão é publicada.

## Arquitetura

- `backend/`: API REST, regras de negócio, autenticação admin, migrações e testes.
- `frontend/`: aplicação pública e painel admin responsivo, mobile-first.
- `docker-compose.yml`: PostgreSQL local com volume persistente.

Principais tabelas criadas pelo Flyway:

- `participants`
- `vote_codes`
- `votes`
- `event_settings`
- `admin_users`

As regras críticas também existem no banco: `vote_codes.code` é `UNIQUE` e `votes.vote_code_id` é `UNIQUE`, impedindo dois votos para o mesmo código mesmo sob concorrência.

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
3. Admin gera códigos no painel.
4. Convidados acessam `/votar` ou `/votar?codigo=FESTA-XXXXX`.
5. Backend valida código, votação aberta e duplicidade em transação.
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

- `api/[...path].js` é o único arquivo de endpoint dentro de `api/` e encaminha as rotas para `server/api-handler.js`. Os módulos compartilhados ficam fora da pasta que a Vercel trata como Functions.
- Os caminhos existentes (`/api/settings`, `/api/participants`, `/api/admin/*`, `/api/votes` e `/api/results`) continuam disponíveis pela mesma Function. Isso mantém o deployment dentro do limite do plano Hobby.
- Configure `DATABASE_URL` e `ADMIN_REGISTRATION_CODE` nas variáveis server-side da Vercel. O backend usa `pg` e PostgreSQL (incluindo Neon); não usa Prisma. `VITE_API_URL` não é necessária para chamadas same-origin.
- `POST /api/admin/register` exige `ADMIN_REGISTRATION_CODE` e permite registrar outra conta; `POST /api/admin/login` requer somente e-mail e senha. O endpoint legado `/api/admin/bootstrap` continua restrito à criação inicial.

Banco:

- Neon, Supabase ou Railway.
- Configure `DATABASE_URL` para a API serverless, com SSL quando exigido pelo provedor. Não use banco efêmero em produção.

## Upload de Fotos

A aplicação salva `photoUrl` no banco e não grava arquivos dentro do projeto. O storage configurado neste projeto é Cloudinary via upload preset; o usuário escolhe um arquivo e o backend grava somente a URL segura retornada.

## Testes e Build

Backend:

```bash
cd backend
./mvnw test
```

Frontend:

```bash
cd frontend
npm run build
```

Cobertura backend criada para regras críticas:

- Código válido consegue votar.
- Código inválido não vota.
- Código utilizado não vota novamente.
- Duas requisições simultâneas com o mesmo código geram só um voto.
- Votação encerrada rejeita votos.
- Resultado soma votos e identifica empate.

## Dados de Desenvolvimento

Com perfil `dev`, o Flyway carrega:

- Letícia — Malévola
- João — Coringa
- Ana — Wandinha
- Pedro — Harry Potter

Esses dados ficam em `backend/src/main/resources/db/dev` e não rodam no perfil padrão de produção.
