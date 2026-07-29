# GeoBov

Aplicativo mobile para monitoramento de gado no mapa. Desenvolvido com **NativeScript** e **Angular**, o **GeoBov** consome a **CowTrackAPI** (FastAPI) para autenticação JWT e para exibir a posição dos animais a partir da telemetria LoRa/GPS.

---

## Índice

- [Funcionalidades](#funcionalidades)
- [Arquitetura](#arquitetura)
- [Stack e versões](#stack-e-versões)
- [Pré-requisitos](#pré-requisitos)
- [Como clonar o repositório](#como-clonar-o-repositório)
- [Configuração do ambiente](#configuração-do-ambiente)
- [Como rodar a aplicação](#como-rodar-a-aplicação)
- [Estrutura do projeto](#estrutura-do-projeto)
- [CowTrackAPI](#cowtrackapi)
- [Publicação nas lojas](#publicação-nas-lojas)
- [Como contribuir](#como-contribuir)
- [Versionamento e changelog](#versionamento-e-changelog)
- [Licença](#licença)

---

## Funcionalidades

| Funcionalidade | Descrição | Status |
|---|---|---|
| **Login** | Autenticação JWT via CowTrackAPI (`POST /api/v1/users/login`) | ✅ Ativo |
| **Logout** | Invalida sessão na API e limpa o token local | ✅ Ativo |
| **Mapa interativo** | Google Maps com marcadores do rebanho | ✅ Ativo |
| **Geolocalização** | Centraliza o mapa na posição atual do usuário | ✅ Ativo |
| **Telemetria LoRa** | Posições vindas de `GET /api/v1/telemetry/` (ingest via gateway) | ✅ Ativo |
| **Atualização periódica** | Polling da API (padrão 15s) enquanto o Firebase não existe mais | ✅ Ativo |
| **Busca de animais** | Filtro por nome, brinco ou descrição com foco no mapa | ✅ Ativo |

### Modelo exibido no mapa

```typescript
interface Cattle {
  id: number;
  name: string;
  tag: string;          // brinco
  description?: string;
  lat: number;          // da telemetria (lon → lng)
  lng: number;
  lastSeenAt?: string;
}
```

Cadastro do animal: `GET /api/v1/cattle/`. Coordenadas: última amostra em `GET /api/v1/telemetry/`.

---

## Arquitetura

```
┌─────────────────────┐         ┌──────────────────────────┐
│   GeoBov (mobile)   │  HTTPS  │   CowTrackAPI            │
│   NativeScript +    │ ──────► │   FastAPI + JWT          │
│   Angular 18        │         │   PostgreSQL + Redis     │
└─────────────────────┘         │   Mongo (telemetria)     │
                                │   LoRa gateway ingest    │
                                └──────────────────────────┘
```

### Fluxo

1. Login em `SignIn` → `UserService` chama `POST /api/v1/users/login` e guarda o JWT.
2. Navegação para `Home` (rota protegida).
3. `CattleService` busca gado + telemetria, junta a última posição por `cattle_id`.
4. Marcadores no Google Maps; polling atualiza posições.
5. Busca filtra por `name` / `tag` e centraliza o mapa.

---

## Stack e versões

| Tecnologia | Versão |
|---|---|
| **GeoBov (app)** | `1.0.0` |
| **Application ID** | `com.geobov` |
| **Angular** | `~18.0.0` |
| **NativeScript Core** | `~8.8.0` |
| **NativeScript Angular** | `^18.0.0` |
| **TypeScript** | `~5.4.0` |
| **RxJS** | `~7.8.0` |

### Integrações

| Pacote | Uso |
|---|---|
| `@angular/common/http` | Cliente HTTP + interceptor JWT |
| `@nativescript/google-maps` | Mapa |
| `@nativescript/geolocation` | Localização do usuário |
| `@triniwiz/nativescript-toasty` | Toasts |

Backend: repositório **CowTrackAPI** (`/home/vitor/house_agro/CowTrackAPI` no WSL).

---

## Pré-requisitos

1. **[Node.js](https://nodejs.org/)** LTS 18 ou 20
2. **[NativeScript CLI](https://docs.nativescript.org/setup/)** (`npm install -g nativescript`)
3. **Android Studio** (SDK + emulador) e/ou **Xcode** (macOS)
4. **CowTrackAPI** rodando (local ou servidor)
5. **Chave Google Maps** (Maps SDK Android/iOS)

```bash
node -v
npm -v
ns -v
```

---

## Como clonar o repositório

```bash
git clone https://github.com/Vitor47/house-agro-app.git
cd house-agro-app
npm install
```

---

## Configuração do ambiente

### URL da API

Edite `src/environments/environment.ts`:

| Cenário | `apiBaseUrl` |
|---|---|
| Emulador Android → API no PC/WSL | `http://10.0.2.2:8000` |
| Celular físico na mesma rede | `http://SEU_IP_LAN:8000` |
| API em produção (HTTPS) | URL pública (veja `environment.prod.ts`) |

**WSL2:** garanta que a porta `8000` esteja acessível a partir do Windows (espelhamento de rede ou `netsh interface portproxy`). No emulador, `10.0.2.2` aponta para o host Windows.

Com a API ainda fora do ar, use o ambiente de desenvolvimento local da CowTrackAPI (`make run` / `make docker-dev`).

### Google Maps

Chave em `App_Resources/Android/src/main/AndroidManifest.xml` (`com.google.android.geo.API_KEY`). Restrinja a chave por package `com.geobov` antes de publicar.

### Credenciais de teste

Use o usuário seed da CowTrackAPI (ex.: `admin@example.com` / senha do `.env`). Usuários de fazenda precisam ter `company_id`; superuser exige `X-Company-Id` (o app envia se `companyId` estiver na sessão).

---

## Como rodar a aplicação

1. Suba a CowTrackAPI e rode `make seed` se ainda não houver dados.
2. Ajuste `apiBaseUrl` se necessário.
3. No app:

```bash
ns run android
# ou
ns run ios
```

### Build de release

```bash
ns build android --release
ns build ios --release
```

### Fluxo de teste manual

1. Login com usuário da API.
2. Mapa centraliza na sua localização.
3. Marcadores aparecem para animais com telemetria.
4. Busca por nome/brinco.
5. **Sair** limpa o token e volta ao login.

---

## Estrutura do projeto

```
geobov/
├── App_Resources/                 # Ícones, splash, manifest
├── src/
│   ├── app/
│   │   ├── home/                  # Mapa + busca
│   │   ├── signIn/                # Login
│   │   ├── services/
│   │   │   ├── user.service.ts    # Auth JWT
│   │   │   ├── cattle.service.ts  # Gado + telemetria
│   │   │   └── auth-storage.service.ts
│   │   ├── interceptors/
│   │   │   └── auth.interceptor.ts
│   │   └── models/
│   ├── environments/
│   │   ├── environment.ts
│   │   └── environment.prod.ts
│   └── main.ts
├── package.json                   # name: geobov
└── nativescript.config.ts         # id: com.geobov
```

---

## CowTrackAPI

Endpoints usados pelo app:

| Método | Rota | Uso |
|---|---|---|
| `POST` | `/api/v1/users/login` | Login + JWT |
| `POST` | `/api/v1/users/logout` | Logout |
| `GET` | `/api/v1/cattle/` | Lista de animais |
| `GET` | `/api/v1/telemetry/` | Amostras GPS (LoRa → gateway ingest) |

Docs da API: `http://localhost:8000/docs/scalar`

Ingestão de campo (não chamada pelo app): `POST /api/v1/gateways/ingest` com `X-Gateway-Api-Key`.

---

## Publicação nas lojas

Checklist antes de subir:

- [ ] Trocar `apiBaseUrl` de produção para HTTPS (`environment.prod.ts`)
- [ ] Desativar cleartext HTTP quando só HTTPS for usado (`usesCleartextTraffic` / ATS)
- [ ] Restringir a chave do Google Maps ao package `com.geobov` e ao SHA-1 de release
- [ ] Gerar keystore de upload Android e assinar o AAB/APK
- [ ] Atualizar ícones/splash com a identidade GeoBov
- [ ] Preencher fichas Play Console / App Store Connect (privacidade, localização)
- [ ] Alinhar `versionCode` / `versionName` (`app.gradle`) e iOS `CFBundleShortVersionString`
- [ ] Testar login, mapa, busca e logout em dispositivo físico

Versão atual alinhada: **1.0.0** (`package.json` + Android `versionName`).

---

## Como contribuir

Use [Conventional Commits](https://www.conventionalcommits.org/) (`feat`, `fix`, `docs`, `refactor`, `test`, `chore`).

```bash
git checkout -b feat/minha-feature
```

Checklist de PR: app compila, sem credenciais commitadas, README/CHANGELOG atualizados se necessário.

---

## Versionamento e changelog

Semantic Versioning. Histórico em [`CHANGELOG.md`](./CHANGELOG.md).

```bash
npm run changelog
```

---

## Licença

Uso acadêmico — Lab de Inovação 3. Consulte o mantenedor para licenciamento.

---

## Contato

- **App:** [github.com/Vitor47/house-agro-app](https://github.com/Vitor47/house-agro-app)
- **API:** [github.com/Vitor47/CowTrackAPI](https://github.com/Vitor47/CowTrackAPI)
- **Mantenedor:** [@Vitor47](https://github.com/Vitor47)
