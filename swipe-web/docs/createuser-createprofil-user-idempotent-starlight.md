# План: упрощённое создание профиля (v2) без онбординга и квиза

## Context

В v1 после логина (SMS/Telegram OIDC) пользователь проходит полный онбординг: создание
профиля через `POST /api/v1/users/profile` требует много обязательных полей
(`heightCm`, `weightKg`, `hijabPreference` помечены `@NotNull` в DTO и `NOT NULL` в БД),
плюс отдельный style-quiz.

В v2 продукт уходит от онбординга и квиза. После Telegram-логина пользователь видит
только экран с **именем** и **датой рождения** (и пол — по умолчанию `FEMALE`). Нужна
новая ручка, которая создаёт профиль только из этих трёх полей.

Пример payload (phoneNumber игнорируем — юзер уже авторизован):
```json
{ "fullName": "11", "dateOfBirth": "2002-01-01", "gender": "FEMALE", "phoneNumber": "+998900221201" }
```

Решения (согласовано с пользователем):
- `heightCm` / `weightKg` / `hijabPreference` → делаем **nullable** (миграция + сущность).
- `phoneNumber` в теле **игнорируем**, юзера берём из `@AuthenticationPrincipal`.
- Путь: **`POST /api/v2/users/profile`** (новый `ProfileV2Controller`).
- `gender` по умолчанию `FEMALE`, если не передан.

## Изменения

### 1. Миграция БД — снять NOT NULL
Новый файл `backend/src/main/resources/db/migration/V93__make_profile_measurements_nullable.sql`:
```sql
ALTER TABLE user_profiles
    ALTER COLUMN height_cm        DROP NOT NULL,
    ALTER COLUMN weight_kg        DROP NOT NULL,
    ALTER COLUMN hijab_preference DROP NOT NULL;
```
(Стиль и нумерацию повторяем за [V92__add_telegram_auth_to_users.sql](backend/src/main/resources/db/migration/V92__add_telegram_auth_to_users.sql).)

### 2. Сущность UserProfile — синхронизировать nullability
В [UserProfile.java](backend/src/main/java/uz/svayp/svayp/core/model/entity/UserProfile.java)
убрать `nullable = false` у трёх колонок (строки 45, 48, 94):
`height_cm`, `weight_kg`, `hijab_preference`. `gender` и `date_of_birth` остаются `NOT NULL`
(в v2 всегда заполняются). v1-флоу не ломается — там поля по-прежнему обязательны на уровне DTO.

### 3. Новый DTO `ProfileCreateV2Request`
Новый файл `backend/src/main/java/uz/svayp/svayp/core/model/dto/request/ProfileCreateV2Request.java`
по образцу [ProfileCreateRequest.java](backend/src/main/java/uz/svayp/svayp/core/model/dto/request/ProfileCreateRequest.java),
только три поля:
- `fullName` — `@NotNull`
- `dateOfBirth` — `@NotNull @Past`
- `gender` — без `@NotNull` (в сервисе дефолт `FEMALE`)

`phoneNumber` в DTO **не добавляем** (игнор; лишнее поле в JSON Spring просто отбросит).

### 4. Сервис — метод `createProfileV2`
В [ProfileService.java](backend/src/main/java/uz/svayp/svayp/core/service/ProfileService.java)
добавить метод по образцу существующего `createProfile` (строка 50):
- проверка `existsByUserId` → `ApiException.profileAlreadyExists()` (поведение как в v1);
- `findById(userId)` → обновить `user.setFullName(...)`;
- `UserProfile.builder()` только с `user`, `gender` (`request.getGender() != null ? ... : Gender.FEMALE`),
  `dateOfBirth`; остальные поля — дефолты билдера (`budgetType=FLEXIBLE`, списки — пустые,
  `styleQuizCompleted=false`), `heightCm/weightKg/hijabPreference` остаются `null`;
- `save` в try/catch `DataIntegrityViolationException` → `profileAlreadyExists()`;
- вернуть `mapToResponse(profile)` (строка 222) — он уже null-safe.

`validateProfileMeasurements` вызывать не нужно (замеров нет).

### 5. Новый контроллер `ProfileV2Controller`
Новый файл `backend/src/main/java/uz/svayp/svayp/core/controller/ProfileV2Controller.java`
по образцу [ProfileController.java](backend/src/main/java/uz/svayp/svayp/core/controller/ProfileController.java):
- `@RestController @RequestMapping("/api/v2/users")`;
- `POST /profile` → `@AuthenticationPrincipal User user` (null-check → `authenticationRequired()`),
  `@Valid @RequestBody ProfileCreateV2Request`, вызвать `profileService.createProfileV2(...)`,
  вернуть `201 CREATED` + `ApiResponse.of(response)`.

### 6. SecurityConfig — изменений не требуется
[SecurityConfig.java](backend/src/main/java/uz/svayp/svayp/config/SecurityConfig.java) уже
закрывает всё неуказанное через `anyRequest().authenticated()` (строка 96), так что
`/api/v2/users/profile` требует авторизации автоматически.

## Анализ NPE (проверено по всему `backend/src/main/java`)
Прогнал поиск по всем читателям `getHeightCm` / `getWeightKg` / `getHijabPreference`
у `UserProfile`. Разыменования этих полей вне write-путей встречаются **только** в двух местах,
оба null-safe:

- **`heightCm` / `weightKg`** — нигде в бизнес-логике не читаются. Используются лишь в:
  - `ProfileService.mapToResponse` (строки 229-230) — простой pass-through в `ProfileResponse`
    (поля `Integer`/`BigDecimal`, `null` допустим);
  - `ProfileService.updateProfile` (строки 143-144) — запись под `!= null`-гардом;
  - `UserProfile.calculateProfileCompletion` (строки 176-177) — проверка `!= null`.
  В рекомендациях (`RecommendationScoringService`) **не участвуют вообще** — `computeFitScore`
  работает по `fitPreference`, не по замерам.

- **`hijabPreference`** — единственный реальный читатель в скоринге:
  [`RecommendationScoringService.computeModestyScore`](backend/src/main/java/uz/svayp/svayp/recommendation/service/ranking/RecommendationScoringService.java#L195-L198)
  — уже имеет гард `if (productCoverage == null || hijabPref == null) return 0.5;`.
  Также `mapToResponse` (строка 241) и `updateProfile` (строка 131, под гардом).

**Вывод:** делать колонки nullable безопасно — добавлять новые null-проверки в код не требуется.
v2-профили просто получают нейтральный скор `0.5` по modesty-составляющей.

- v1 (`POST /api/v1/users/profile`) и квиз (`/style-quiz`) остаются без изменений.

## Проверка
1. `cd backend && ./mvnw -q compile` — сборка проходит, Flyway-миграция V93 валидна.
2. Запустить бэкенд, прогнать Flyway (`./mvnw spring-boot:run` или тесты с миграциями).
3. Получить токен через Telegram OIDC (`POST /api/v1/auth/telegram/oidc`) или OTP.
4. `POST /api/v2/users/profile` с телом примера + `Authorization: Bearer <token>` →
   ожидаем `201` и `ProfileResponse` с `heightCm/weightKg/hijabPreference = null`,
   `gender = FEMALE`, `fullName` сохранён в `users.full_name`.
5. Повторный `POST` → `409 PROFILE_ALREADY_EXISTS`.
6. (Регрессия) `POST /api/v1/users/profile` без замеров → по-прежнему `400` (валидация DTO).
