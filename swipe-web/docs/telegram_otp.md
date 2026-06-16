# План: Добавить вход через Telegram (OIDC + scope `phone`) рядом с SMS OTP

## Контекст

Сейчас авторизация — **SMS OTP через Eskiz** (~150 UZS за сообщение). Хотим второй, **бесплатный** способ с подтверждённым телефоном — через Telegram. **SMS остаётся полностью без изменений** как альтернативный метод.

**Важное исправление к исходному ТЗ** (`TELEGRAM_AUTH_TASK_V2.md`): там предполагалось, что классический Telegram Login Widget возвращает `phone_number` внутри подписанного HMAC-пейлоада. По официальной документации это **неверно** — классический (legacy) виджет возвращает только `id, first_name, last_name, username, photo_url, auth_date, hash` и **никакого телефона**. Чтобы получить *подтверждённый телефон*, нужен **OpenID Connect (OIDC) флоу Telegram со scope `phone`**, который возвращает **подписанный JWT `id_token`** с полем `phone_number`. Поэтому в плане используется OIDC + проверка JWT, а не HMAC.

**Итог — два пути входа, на выходе одинаковый `TokenResponse`:**
- **SMS OTP** (существует, без изменений): телефон → SMS-код → проверка → токены.
- **Telegram OIDC** (новый): согласие в Telegram (со scope `phone`) → бэкенд проверяет JWT → токены.

---

## Нужен ли отдельный Telegram-бот? Нужно ли нажимать «Старт»?

- **Да, отдельный бот нужен.** Это требование Telegram: бот «представляет» ваше приложение. В **@BotFather** вы регистрируете бота и получаете **Client ID** (числовой id бота) и **Client Secret** для OIDC. Это **другой бот**, не тот, что шлёт уведомления о заказах.
- **Нет, пользователю НЕ нужно заходить в чат с ботом и жать «Старт».** В OIDC-флоу открывается **экран согласия Telegram** (`oauth.telegram.org/auth` или нативный экран в приложении Telegram). Пользователь просто подтверждает, какими данными делится (включая телефон, если запрошен scope `phone`). Никакого ручного открытия чата бота и кнопки «Старт» — бот выступает лишь как «приложение-клиент» в OAuth, а не как чат, куда нужно писать.
- Бот нужен **только для регистрации приложения** в BotFather (получить Client ID/Secret и указать разрешённые redirect URI). Отправлять сообщения этим ботом для входа **не требуется**.

---

## Юзер-флоу: РЕГИСТРАЦИЯ через Telegram (пошагово)

```
[Мобильное приложение]                 [Telegram]                    [Наш бэкенд]
        |                                  |                              |
1. Пользователь жмёт                       |                              |
   «Продолжить через Telegram»             |                              |
        |                                  |                              |
2. Приложение генерирует PKCE:             |                              |
   code_verifier (случайный) +             |                              |
   code_challenge = S256(code_verifier),   |                              |
   а также state и nonce                   |                              |
        |                                  |                              |
3. Открывает экран согласия Telegram ----> |                              |
   https://oauth.telegram.org/auth         |                              |
   ?client_id=<bot_id>                      |                              |
   &scope=openid phone profile             |                              |
   &response_type=code                     |                              |
   &redirect_uri=com.svaypai.app://auth/telegram/callback                          |
   &code_challenge=<...>&code_challenge_method=S256                       |
   &state=<...>&nonce=<...>                 |                              |
        |                                  |                              |
4.                                  Пользователь видит                    |
                                    экран: «Поделиться                    |
                                    телефоном и профилем                  |
                                    с приложением Svayp?»                 |
                                    Нажимает «Принять»                    |
        |                                  |                              |
5. Telegram редиректит обратно  <--------- |                              |
   svayp://auth/telegram/callback?code=<одноразовый код>&state=<...>      |
        |                                  |                              |
6. Приложение проверяет state и            |                              |
   отправляет на бэкенд ----------------------------------------------->  |
   POST /api/v1/auth/telegram/oidc                                        |
   { code, codeVerifier, redirectUri, nonce }                            |
        |                                  |                              |
7.                                         |   Бэкенд меняет code на токен:|
                                           | <--- POST oauth.telegram.org/token
                                           |      grant_type=authorization_code
                                           |      code, code_verifier,    |
                                           |      redirect_uri,           |
                                           |      client_id + client_secret (СЕКРЕТ только на сервере!)
                                           | ---> { id_token (JWT) }      |
        |                                  |                              |
8.                                         |   Бэкенд проверяет JWT:      |
                                           |   - подпись по JWKS (по kid) |
                                           |   - iss = oauth.telegram.org |
                                           |   - aud = client_id          |
                                           |   - exp не истёк             |
                                           |   - nonce совпадает          |
                                           |   Достаёт: id (tg user id),  |
                                           |   phone_number, name         |
        |                                  |                              |
9.                                         |   upsert пользователя по телефону:
                                           |   - есть → связываем          |
                                           |   - нет → создаём (createNewUser)
                                           |   Пишем telegram_chat_id = id,|
                                           |   telegram_verified_at = now  |
        |                                  |                              |
10. Получает TokenResponse <-------------------------------------------- |
    { access_token, refresh_token, user } |   (тот же формат, что у /otp/verify)
        |                                  |                              |
11. Сохраняет токены, пользователь вошёл/зарегистрирован.                 |
```

**Суть для пользователя:** одно нажатие «Продолжить через Telegram» → экран согласия Telegram → «Принять» → он уже внутри. Телефон подтверждён самим Telegram, SMS не нужен, денег не стоит.

**Регистрация vs вход — это один и тот же эндпоинт.** На шаге 9 если пользователь с таким телефоном уже есть — это вход; если нет — создаётся новый аккаунт. Отдельного «экрана регистрации» не нужно.

---

## Существующие пользователи (миграция / линковка по номеру)

Сейчас в базе у пользователей уже хранится `phone_number` (от SMS-регистрации). **Никаких отдельных миграций данных не требуется** — линковка происходит автоматически в момент первого входа через Telegram, **по совпадению номера телефона**.

**Логика (шаг 8 ниже, метод `telegramOidcLogin`):**
1. Берём подтверждённый `phone_number` из id_token Telegram и нормализуем его в наш формат `+998XXXXXXXXX`.
2. `findByPhoneNumber(phone)`:
   - **Найден** → это существующий юзер. Привязываем Telegram: ставим `telegram_chat_id`, `telegram_name`, `telegram_verified_at`. `full_name` НЕ перезаписываем. Аккаунт, заказы, профиль, подписка — всё сохраняется (привязка по UUID). Это просто вход.
   - **Не найден** → создаём новый аккаунт (`createNewUser`).

**Нормализация телефона — уже работает.** Проверено: `PhoneUtils.normalize` (`shared/util/PhoneUtils.java`) приводит к `+998XXXXXXXXX` и формат с `+998...`, и **без `+`** (`998901234567`) — ветка `digits.startsWith("998")`. То есть телеграмовский E.164-номер прогоняем через тот же `normalizePhoneNumber()`, и он совпадёт с тем, что в БД. Дублей не будет.

**Ограничение — только узбекские номера.** `PhoneUtils` понимает исключительно `+998`. Если в Telegram у юзера **иностранный номер**, `normalize` вернёт `null` → `normalizePhoneNumber()` бросит `INVALID_PHONE_FORMAT` (400). Для узбекского приложения (SMS Eskiz тоже только `+998`) это приемлемо, но стоит вернуть понятную ошибку («поддерживаются только номера +998»), а не общий `INVALID_PHONE_FORMAT`.

**Крайние случаи (повторяем правила существующего SMS-флоу):**
- **Найденный юзер — не CLIENT (ADMIN/SUPER_ADMIN):** вход через Telegram запрещаем, как в `sendOtp` (`adminUsePasswordLogin`) — админы только по паролю.
- **Аккаунт деактивирован (`isActive=false`):** реактивируем, как это делает `verifyOtp`.
- **Аккаунт заблокирован (`isLocked`):** отклоняем (`accountLocked`), как в `sendOtp`.
- **К найденному по телефону юзеру уже привязан ДРУГОЙ `telegram_chat_id`** (сменил Telegram-аккаунт): телефон — главный ключ системы, поэтому **перезаписываем** `telegram_chat_id` на новый.
- **Этот `telegram_chat_id` уже привязан к другому номеру** (сменил номер в Telegram): приоритет у совпадения по телефону текущего входа. Если ставим частичный unique-индекс на `telegram_chat_id` — этот случай обрабатываем явно (снять старую привязку или отклонить); по умолчанию — снимаем старую привязку и ставим новую.

---

## Telegram OIDC — подтверждённые факты (офиц. докум. + живой discovery)

- **Нужен отдельный бот.** BotFather выдаёт **Client ID** (числовой id бота) и **Client Secret**.
- Discovery (`https://oauth.telegram.org/.well-known/openid-configuration`):
  - issuer: `https://oauth.telegram.org`
  - authorization_endpoint: `https://oauth.telegram.org/auth`
  - token_endpoint: `https://oauth.telegram.org/token`
  - jwks_uri: `https://oauth.telegram.org/.well-known/jwks.json`
  - response_types: `code` → **Authorization Code Flow + PKCE (S256)**
  - аутентификация клиента: `client_secret_post` / `client_secret_basic`
  - алгоритмы id_token: `RS256, ES256, EdDSA, ES256K`
  - scopes: `openid`, `phone`, `profile`, `telegram:bot_access`
- Claims в id_token: `sub`, `iss`, `aud`, `iat`, `exp`, `id` (числовой Telegram user id), `name`, `preferred_username`, `picture`, `phone_number`.

**Главное по безопасности:** обмен `code → id_token` использует **client_secret**, поэтому он выполняется **только на сервере**. Мобильное приложение делает лишь PKCE-авторизацию и передаёт бэкенду одноразовый `code` + `code_verifier`.

---

## Текущее состояние кода

- Бэкенд: Java 21 / Spring Boot; последняя миграция Liquibase = `V91`.
- JWT-библиотека: **jjwt 0.12.6** (сейчас HMAC для наших токенов). jjwt 0.12 умеет парсить JWKS (`Jwks.parser()`) и подбирать ключ по `kid`. RS256/ES256 нативны на JDK 17; **EdDSA + ES256K требуют BouncyCastle**.
- `users.phone_number` — **unique, но nullable**; всё приложение ссылается на пользователя по **UUID** (`user.getId()`), поэтому изменение низкорисковое для заказов/профилей.
- `full_name` — NOT NULL (`createNewUser` ставит `"User"` по умолчанию).
- Готовые хелперы в `AuthService`: `createNewUser()`, `generateTokenResponse()`, `normalizePhoneNumber()`, `hashString()`; куки — `setAuthCookies()` в `AuthController`.
- **Существующий `TelegramNotificationService`** = бот **уведомлений о заказах/админ-чат** (другой бот, токен `telegram.bot.token`). **Не трогаем, не переиспользуем, не связываем.**

---

## План реализации (бэкенд)

### 1. Зависимость — BouncyCastle
**Файл**: `backend/pom.xml`
```xml
<dependency>
  <groupId>org.bouncycastle</groupId>
  <artifactId>bcprov-jdk18on</artifactId>
  <version>1.78.1</version>
</dependency>
```
Позволяет jjwt проверять все 4 алгоритма Telegram (RS256/ES256 нативно; EdDSA/ES256K через BC). Провайдер BC регистрируем один раз при старте.

### 2. Конфиг
**Файл**: `backend/src/main/resources/application.properties`
```properties
telegram.oidc.enabled=${TELEGRAM_OIDC_ENABLED:false}
telegram.oidc.client-id=${TELEGRAM_OIDC_CLIENT_ID:8713945846}  # публичный id бота (BotFather)
telegram.oidc.client-secret=${TELEGRAM_OIDC_CLIENT_SECRET:}    # СЕКРЕТ — только env/секрет-стор, НЕ в git
telegram.oidc.issuer=https://oauth.telegram.org
telegram.oidc.token-endpoint=https://oauth.telegram.org/token
telegram.oidc.jwks-uri=https://oauth.telegram.org/.well-known/jwks.json
telegram.oidc.allowed-redirect-uris=${TELEGRAM_OIDC_REDIRECT_URIS:com.svaypai.app://auth/telegram/callback}
```

**Учётные данные бота (BotFather):**
- `client_id = 8713945846` — публичное, уходит в мобильный auth-URL. Можно держать дефолтом в конфиге.
- `client_secret` — **СЕКРЕТ**. Кладём **только** в `TELEGRAM_OIDC_CLIENT_SECRET` (env / секрет-хранилище деплоя). Никогда: не в репозиторий, не в `application.properties` напрямую, не в логи, не в чат. Если секрет где-то засветился — перевыпустить в BotFather.

**Настройка в BotFather (разово):** в разделе Web Login / OIDC бота добавить **Allowed URLs / redirect URI** = `svayp://auth/telegram/callback` (и любые другие схемы/Universal Links мобайла). Без этого Telegram отклонит авторизацию.

### Redirect URI / deep link — зона ответственности

`com.svaypai.app://auth/telegram/callback` — это **deep link мобильного приложения** (адрес, на который Telegram возвращает пользователя с `code` после согласия). Значение **задаёт Flutter-разработчик** и оно должно быть **идентичным в трёх местах**: BotFather ↔ конфиг бэкенда (`telegram.oidc.allowed-redirect-uris`) ↔ нативные конфиги Flutter.

**Статус реализации Flutter:** URL-схема `com.svaypai.app` уже зарегистрирована:
- **iOS** (`Info.plist`): `CFBundleURLTypes` → scheme `com.svaypai.app` ✓
- **Android** (`AndroidManifest.xml`): `intent-filter` с `scheme="com.svaypai.app"`, `host="auth"`, `path="/telegram/callback"` ✓

Flutter-разработчику осталось: поймать этот deep link (напр. через пакет `app_links` или `uni_links`) и передать `code` + `state` в авторизационный сервис.

- **Flutter-разработчик:** регистрирует URL scheme (iOS `Info.plist` → `CFBundleURLTypes`; Android `AndroidManifest.xml` → `<intent-filter>`/`<data scheme>`), ловит диплинк, достаёт `code`. **Сообщает точное значение redirect URI.**
- **Бэкенд/DevOps:** вписывает это же значение в BotFather (Allowed URLs) и в env `TELEGRAM_OIDC_REDIRECT_URIS`.
- Текущий `com.svaypai.app://auth/telegram/callback` — **подтверждённое значение**, зарегистрированное в нативных конфигах Flutter. Нужно вписать в BotFather (Allowed URLs) и в env `TELEGRAM_OIDC_REDIRECT_URIS`.
- **Прод-рекомендация (эдж-кейс №13):** перейти с custom scheme `com.svaypai.app://` на **App Links / Universal Links** (`https://app.svaypai.com/auth/telegram/callback`) — на Android даже reverse-domain custom scheme не гарантирует эксклюзивность. Требует файлов верификации на домене (`assetlinks.json` / `apple-app-site-association`), которые тоже настраивает Flutter-разработчик.

### 3. Миграция — `V92__add_telegram_auth_to_users.sql`
**Файл**: `backend/src/main/resources/db/migration/V92__add_telegram_auth_to_users.sql`
```sql
ALTER TABLE users
  ADD COLUMN telegram_chat_id BIGINT,
  ADD COLUMN telegram_name VARCHAR(255),
  ADD COLUMN telegram_verified_at TIMESTAMP;
```
- `telegram_name` хранит имя из Telegram **отдельно** от `full_name`. `full_name` заполняется через свой онбординг-промпт и Telegram-вход его НЕ перезаписывает.
- (Можно добавить частичный уникальный индекс на `telegram_chat_id`, чтобы один Telegram id не был привязан к двум аккаунтам.)

### 4. Сущность User
**Файл**: `core/model/entity/User.java`
```java
@Column(name = "telegram_chat_id") private Long telegramChatId;
@Column(name = "telegram_name", length = 255) private String telegramName;
@Column(name = "telegram_verified_at") private Instant telegramVerifiedAt;
```

### 5. DTO — `TelegramOidcRequest`
**Файл**: `core/model/dto/request/TelegramOidcRequest.java`
```java
@NotBlank String code;          // одноразовый код от Telegram
@NotBlank String codeVerifier;  // PKCE verifier (S256)
@NotBlank String redirectUri;   // должен совпадать с разрешённым redirect URI
String nonce;                   // опционально; если клиент прислал — проверяем
```

### 6. `TelegramJwksProvider` (кэш ключей)
**Файл**: `core/service/TelegramJwksProvider.java`
- Тянет `jwks_uri`, парсит через jjwt `Jwks.parser()`, кэширует `kid → PublicKey`.
- Обновление при неизвестном `kid` (ротация ключей) и по TTL (напр. 1 ч). Свой `RestTemplate`.

### 7. `TelegramOidcService` (обмен + проверка)
**Файл**: `core/service/TelegramOidcService.java`. Отдельный сервис; свой `RestTemplate`; `TelegramNotificationService` НЕ трогает.
- `exchange(req)`: POST на `token-endpoint`, form-тело `grant_type=authorization_code`, `code`, `redirect_uri`, `code_verifier`, аутентификация клиента `client_secret_post` (`client_id`+`client_secret`). Парсит `id_token` из JSON. Сначала валидирует `redirectUri` по списку разрешённых.
- `verify(idToken, expectedNonce)`: парсер jjwt с `Locator<Key>`, который берёт ключ по `kid` из `TelegramJwksProvider`; требуем:
  - подпись валидна; alg ∈ {RS256, ES256, EdDSA, ES256K} (запрещаем `none`/HMAC)
  - `iss` == `telegram.oidc.issuer`
  - `aud` == `telegram.oidc.client-id`
  - `exp` не истёк (небольшой leeway)
  - `nonce` == expectedNonce, если был передан
- Возвращает record `TelegramIdentity(long telegramId /* из claim `id` */, String phoneNumber, String name)`.

### 8. `AuthService.telegramOidcLogin(TelegramOidcRequest req, String deviceInfo)`
**Файл**: `core/service/AuthService.java`
1. `var idToken = telegramOidcService.exchange(req)`
2. `var ident = telegramOidcService.verify(idToken, req.getNonce())`
3. Если `ident.phoneNumber()` пуст → `400` (scope `phone` не подтвердили)
4. `phone = normalizePhoneNumber(ident.phoneNumber())` (узбекские номера; иностранные → 400)
5. Upsert по номеру (см. раздел «Существующие пользователи»):
   - `findByPhoneNumber(phone)`:
     - **найден** → проверки как в SMS-флоу: не CLIENT → `adminUsePasswordLogin`; `isLocked` → `accountLocked`; `!isActive` → реактивируем. Это вход в существующий аккаунт.
     - **не найден** → `createNewUser(phone)`. `full_name` остаётся дефолтным `"User"` (его заполнит онбординг); имя из Telegram пишем в `telegram_name`.
6. Ставим `telegramChatId = ident.telegramId()`, `telegramName = ident.name()`, `telegramVerifiedAt = now`, `isVerified = true`, `lastLoginAt = now`; `full_name` НЕ трогаем; сохраняем
7. `return generateTokenResponse(user, deviceInfo)` ← тот же `TokenResponse`, что у OTP verify

### 9. Эндпоинт — `POST /api/v1/auth/telegram/oidc`
**Файл**: `core/controller/AuthController.java`
```java
@PostMapping("/telegram/oidc")
public ResponseEntity<ApiResponse<TokenResponse>> telegramOidc(
    @Valid @RequestBody TelegramOidcRequest request,
    HttpServletRequest httpRequest, HttpServletResponse httpResponse)
```
Вызывает `authService.telegramOidcLogin(request, userAgent)`, затем `setAuthCookies(...)` (как у `/otp/verify`), возвращает `200` + `TokenResponse`.

### 10. Фабрики `ApiException`
**Файл**: `core/exception/ApiException.java`
```java
telegramOidcExchangeFailed()  // 400/502 — token endpoint отверг code
telegramTokenInvalid()        // 403 — не прошла проверка подписи/iss/aud/exp/nonce
telegramPhoneMissing()        // 400 — в id_token нет phone_number
```

---

## Эдж-кейсы (обязательно учесть при реализации)

### Безопасность / проверка токена
1. **JWKS Telegram недоступен** (таймаут/5xx) — проверить подпись нельзя → **fail-closed**: `503`, НЕ пускаем. Никогда не «верим без проверки». Ключи кэшированы, разовый сбой переживаем.
2. **`nonce` обязателен** — защита от replay `id_token`. Мобайл всегда генерит и шлёт; токен без совпадающего `nonce` → `403`.
3. **Повторный/истёкший `code` (`invalid_grant`)** — двойной тап / ретрай / перехват. Telegram отдаёт ошибку (code одноразовый) → мапим в понятный `400`, не `500`. PKCE защищает от перехвата.
4. **Атаки на JWT** — запрещаем `alg:none` и HMAC (только асимметричные алгоритмы по ключу из JWKS); неизвестный `kid` → один рефреш JWKS, затем `403`; обязательная проверка `iss`/`aud`/`exp`.

### Идентичность / данные
5. **Анонимизированный аккаунт** (`anonymized_at` стоит, GDPR-удаление) с совпавшим номером — проверить, что делает анонимизация с `phone_number`; по умолчанию такой аккаунт не реактивируем через Telegram, а создаём новый (решить при реализации, посмотрев логику анонимизации).
6. **Конфликт `telegram_chat_id`** — тот же tg-id приходит с новым номером (юзер сменил номер в Telegram) → конфликт unique-индекса со старой привязкой. Приоритет у совпадения по телефону текущего входа: снимаем старую привязку `telegram_chat_id`, ставим новую.
7. **Пустой `name`** в токене → `telegram_name` оставляем `null` (НЕ дефолтим в `full_name`).

### Операционные
8. **`telegram.oidc.enabled=false` / не настроены client-id/secret** → эндпоинт отдаёт `503`, а не падает с NPE (guard на старте/входе).
9. **Внешний HTTP внутри `@Transactional`** — обмен code→token и проверку JWT делаем **до** открытия транзакции БД; в транзакции только upsert юзера (не держим DB-коннект на время внешнего запроса к Telegram).
10. **Rate limit** на `POST /telegram/oidc` — переиспользовать `OtpRateLimiterService.checkIpRateLimit` (лимит по IP), чтобы не злоупотребляли обменом токенами.
11. **Метрики/логирование** — `authCounter("auth.telegram.oidc", outcome)` для единообразия с SMS-аналитикой (success/invalid/exchange_failed/phone_missing/admin_blocked/...).

### Клиент (отдельный репозиторий мобайла — отметить в их задаче)
12. **Отмена согласия** в Telegram → редирект с `error=access_denied`; мобайл показывает «отменено», на бэкенд не идёт.
13. **Перехват deep link** (Android intent hijacking на custom scheme `com.svaypai.app://`) → для макс. безопасности рекомендовать **App Links / Universal Links** вместо custom scheme + обязательная проверка `state` на клиенте.

---

## Что НЕ меняется
- `POST /auth/otp/send`, `POST /auth/otp/verify` — SMS OTP полностью без изменений.
- `token/refresh`, `logout`, `logout/all`, `admin/login`.
- `SmsService`, `OtpRepository`, `OtpRateLimiterService`, `RefreshToken`.
- `TelegramNotificationService` (бот уведомлений о заказах) — отдельный бот, не трогаем.

---

## Файлы
**Создать**: `V92__add_telegram_auth_to_users.sql`, `TelegramOidcRequest.java`, `TelegramJwksProvider.java`, `TelegramOidcService.java`
**Изменить**: `pom.xml` (BouncyCastle), `application.properties` (telegram.oidc.*), `User.java`, `AuthService.java`, `AuthController.java`, `ApiException.java`

---

## Мобильное приложение (вне scope — отдельный репозиторий)
Authorization Code + PKCE: формируем `https://oauth.telegram.org/auth?...` с `client_id`, `scope=openid phone profile`, `response_type=code`, `redirect_uri=com.svaypai.app://auth/telegram/callback`, `code_challenge`(S256), `state`, `nonce`. После редиректа берём `code` и POST `{ code, codeVerifier, redirectUri, nonce }` на `/auth/telegram/oidc`. **client_secret в приложение НЕ кладём.** Плюс строки локализации.

---

## Проверка
1. **Юнит-тест проверки JWT** с локально сгенерированной парой ключей RSA/EC: поднимаем фейковый JWKS, подписываем токен с нужным `kid`, проверяем что `verify()` проходит; что подделанная подпись / неверный `iss` / неверный `aud` / истёкший / неверный `nonce` дают `403`.
2. **Нет claim phone_number** → `telegramPhoneMissing()` 400.
3. **Стейджинг с реальным ботом BotFather**: проходим согласие на устройстве, проверяем что `/auth/telegram/oidc` возвращает токены и в БД записаны `telegram_chat_id` + `telegram_verified_at`.
4. **Регрессия**: `POST /auth/otp/send` + `/verify` по-прежнему работают через SMS.
5. **Гигиена секрета**: `client_secret` есть только в конфиге бэкенда, клиентам не возвращается.
