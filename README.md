# GeoBov

Aplicativo mobile para monitoramento de gado no mapa. Desenvolvido com **NativeScript** e **Angular**, o **GeoBov** consome a API GeoBov (FastAPI) para autenticação JWT e para exibir a posição dos animais a partir da telemetria LoRa/GPS.

Produção: `https://54.94.137.227` (HTTPS no IP, certificado Let's Encrypt). O build de release troca `environment.ts` por `environment.prod.ts`.

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
- [API GeoBov](#api-geobov)
- [Deploy de produção (TCC)](#deploy-de-produção-tcc)
- [Como contribuir](#como-contribuir)
- [Versionamento e changelog](#versionamento-e-changelog)
- [Licença](#licença)

---

## Funcionalidades

| Funcionalidade | Descrição | Status |
|---|---|---|
| **Login** | `POST /api/v1/users/login`. Token de 24 h. 10 erros em 15 min respondem 429 | ✅ Ativo |
| **Logout** | `POST /api/v1/users/logout` revoga o token na hora e limpa a sessão local | ✅ Ativo |
| **Fazenda ativa** | Vem no JWT (`company_id`). Se vier null, `POST /users/switch-company` | ✅ Ativo |
| **Mapa interativo** | Google Maps com marcadores do rebanho | ✅ Ativo |
| **Geolocalização** | Centraliza o mapa na posição atual do usuário | ✅ Ativo |
| **Telemetria LoRa** | Posições de `GET /api/v1/telemetry/`. O ESP32 envia o ingest sozinho | ✅ Ativo |
| **Atualização periódica** | Polling da API a cada 5 minutos | ✅ Ativo |
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
│   GeoBov (mobile)   │  HTTPS  │   API GeoBov             │
│   NativeScript +    │ ──────► │   FastAPI + JWT          │
│   Angular 18        │         │   PostgreSQL + Redis     │
└─────────────────────┘         │   Mongo (telemetria)     │
                                │   LoRa gateway ingest    │
                                └──────────────────────────┘
```

### Fluxo

1. Login em `SignIn` → `POST /api/v1/users/login`. A senha não é gravada.
2. Se `company_id` vier null, `POST /api/v1/users/switch-company` com a fazenda padrão e o app substitui o token. O token anterior deixa de valer.
3. Navegação para `Home`. A rota chama `GET /api/v1/users/me` antes de carregar o mapa.
4. `CattleService` busca gado, coleiras e telemetria, e junta a última posição por `cattle_id`.
5. Marcadores no Google Maps; polling atualiza posições.
6. Busca filtra por `name` / `tag` e centraliza o mapa.
7. **Sair** chama `POST /api/v1/users/logout`. Token revogado responde 401 e não conta como tentativa de login.

---

## Stack e versões

| Tecnologia | Versão |
|---|---|
| **GeoBov (app)** | `1.1.0` |
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

Backend: API GeoBov em `https://54.94.137.227`. Repositório **CowTrackAPI**. `/docs`, `/redoc` e `/admin` não são públicos.

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
| App de release / TCC | `https://54.94.137.227` (`environment.prod.ts`) |

**WSL2:** garanta que a porta `8000` esteja acessível a partir do Windows (espelhamento de rede ou `netsh interface portproxy`). No emulador, `10.0.2.2` aponta para o host Windows.

Com a API ainda fora do ar, use o ambiente de desenvolvimento local da CowTrackAPI (`make run` / `make docker-dev`).

### Google Maps

Chave em `App_Resources/Android/src/main/AndroidManifest.xml` (`com.google.android.geo.API_KEY`). Restrinja a chave por package `com.geobov` antes de publicar.

### Credenciais

Não grave senha nem token no repositório. O superusuário de produção existe só na máquina da API. A fazenda ativa vai no JWT (`company_id`); o app não envia `X-Company-Id`.

O gateway é o ESP32. Ele conecta no Wi-Fi pelo portal (botão BOOT), guarda a URL de ingest e a `X-Gateway-Api-Key`, e faz o `POST /api/v1/gateways/ingest`. O aplicativo só lê a telemetria que a API já gravou.

---

## Como rodar a aplicação

1. Para desenvolvimento, suba a API local. Para ensaiar contra produção: `npm run run:android:prod`.
2. Ajuste `apiBaseUrl` em `environment.ts` se o aparelho não alcançar `127.0.0.1`.
3. No app:

```bash
ns run android
# ou
ns run ios
```

O APK assinado do TCC está em [Deploy de produção (TCC)](#deploy-de-produção-tcc). `ns build android --release` também aponta para a API de produção.

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
│   │   ├── services/              # users, cattle, devices, telemetry
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
├── tools/build-android-release.ps1
├── package.json                   # name: geobov
└── nativescript.config.ts         # id: com.geobov
```

---

## API GeoBov

Base de produção: `https://54.94.137.227`. JSON em todas as rotas. Rotas protegidas usam `Authorization: Bearer <access_token>`.

Listas levam barra no final (`/api/v1/cattle/`). `/login`, `/me`, `/logout` e `/switch-company` não levam.

| Método | Rota | Uso |
|---|---|---|
| `GET` | `/health` | Saúde pública (banco, Redis, Mongo) |
| `POST` | `/api/v1/users/login` | Login. Body `{ email, password }` |
| `GET` | `/api/v1/users/me` | Sessão atual |
| `POST` | `/api/v1/users/logout` | Revoga o token na hora |
| `POST` | `/api/v1/users/switch-company` | Novo JWT com `company_id` |
| `GET` | `/api/v1/companies/` | Fazendas (`q`, `page`, `page_size`) |
| `GET` | `/api/v1/companies/me` | Fazenda do JWT |
| `GET`/`POST` | `/api/v1/cattle/` | Lista e cadastro |
| `GET`/`PATCH` | `/api/v1/cattle/{id}` | Detalhe e atualização |
| `GET`/`POST` | `/api/v1/devices/` | Coleiras |
| `GET` | `/api/v1/devices/{id}` | Detalhe da coleira |
| `GET` | `/api/v1/telemetry/` | Amostras para o mapa |
| `GET` | `/api/v1/telemetry/{id}` | Uma amostra |

Erros: `{ "detail": "..." }` com 400, 401, 403, 404, 422 ou 429. Busca de fazenda com `%` ou `_` responde 422; o app bloqueia esses caracteres antes do request.

O `POST /api/v1/gateways/ingest` fica no firmware do ESP32, com o header `X-Gateway-Api-Key`. A URL padrão do firmware já é `https://54.94.137.227/api/v1/gateways/ingest`. A chave é colada no portal WiFiManager do aparelho, não no aplicativo.

O certificado é Let's Encrypt para o IP, sem domínio, e dura poucos dias. O app confia na CA do sistema e não faz pin. Renove o certificado na máquina da API antes da apresentação.

---

## Deploy de produção (TCC)

O APK de release usa `environment.prod.ts` (`https://54.94.137.227`). O `ns run android` comum continua na API local. Para ensaiar no celular contra produção sem assinar:

```bash
npm run run:android:prod
```

### Keystore (fora do Git)

```powershell
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.geobov"
keytool -genkeypair -v -keystore "$env:USERPROFILE\.geobov\upload.jks" -alias geobov -keyalg RSA -keysize 2048 -validity 10000
keytool -list -v -keystore "$env:USERPROFILE\.geobov\upload.jks" -alias geobov
```

Use o SHA-1 desse keystore para restringir a chave do Google Maps ao package `com.geobov`. Não commite o `.jks` nem as senhas.

### APK assinado

```powershell
$env:GEOBOV_KEYSTORE_PATH = "$env:USERPROFILE\.geobov\upload.jks"
$env:GEOBOV_KEYSTORE_PASSWORD = "<senha do keystore>"
$env:GEOBOV_KEY_ALIAS = "geobov"
$env:GEOBOV_KEY_PASSWORD = "<senha da chave>"
npm run build:android:release
```

O script `tools/build-android-release.ps1` gera o APK em `dist/`. Instale no celular da apresentação (`adb install -r` no arquivo `.apk`). Versão alinhada: **1.1.0** (`versionName` / `versionCode` 2).

Antes da banca:

- [ ] Certificado HTTPS da API renovado (Let's Encrypt do IP `54.94.137.227`)
- [ ] `GET /health` responde `status: ok`
- [ ] Login, mapa, busca, troca de fazenda e logout no aparelho físico
- [ ] ESP32 no portal `GeoBov-Gateway`, com a chave no campo `X-Gateway-Api-Key`
- [ ] Chave do Google Maps restrita ao package e ao SHA-1 de release

Cleartext HTTP permanece ligado para o desenvolvimento local. O binário de release só fala com a API em HTTPS.

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
