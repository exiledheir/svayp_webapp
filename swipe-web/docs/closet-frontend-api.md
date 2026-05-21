# Closet API — Frontend Developer Guide

> **Status:** ✅ Все ручки реализованы и собраны (`mvn compile` → BUILD SUCCESS).
> Базовый URL: `https://api.svayp.com` (prod) / `http://localhost:8080` (dev).
> Все запросы требуют `Authorization: Bearer <jwt>` если не указано иное.

---

## 0. Общие правила

### Формат ответа
Все эндпоинты оборачивают payload в `ApiResponse<T>`:

```json
{ "data": <T>, "message": "optional human-readable note" }
```

### Формат ошибки
```json
{
  "code": "QUOTA_EXCEEDED",
  "message": "REGEN_MONTHLY_LIMIT exceeded (limit=5). Upgrade to Premium for unlimited access.",
  "status": 402
}
```

### Коды ошибок (closet-специфичные)
| HTTP | code | Когда |
|---|---|---|
| 400 | `CALENDAR_RANGE_INVALID` | `to < from` или окно > лимита тира |
| 402 | `QUOTA_EXCEEDED` | Превышен любой квотный счётчик (см. `quotaCode` в сообщении) |
| 404 | `WARDROBE_ITEM_NOT_FOUND` | Не принадлежит юзеру / не существует |
| 404 | `CANVAS_NOT_FOUND` | Канвас не найден |
| 404 | `TRY_ON_JOB_NOT_FOUND` | Try-on job не найден |
| 404 | `UPLOAD_JOB_NOT_FOUND` | Upload job не найден |
| 413 | `FILE_TOO_LARGE` | >20 MB |
| 422 | `WARDROBE_ITEM_NOT_READY` | Айтем ещё в ML-пайплайне, не `READY` |

Quota codes внутри `QUOTA_EXCEEDED.message`: `WARDROBE_ITEM_LIMIT`, `CANVAS_LIMIT`, `TRY_ON_MONTHLY_LIMIT`, `REGEN_MONTHLY_LIMIT`, `DAILY_LOOK_LIMIT`.

---

## 1. Plan (тариф + лимиты + usage)

### `GET /api/v1/me/plan`
Единая ручка для экрана «Manage Plan» и для UI-гейтинга (отрисовка прогресс-баров, кнопок «Upgrade»).
Первый вызов автоматически создаёт 7-дневный TRIAL.

**Response 200**
```json
{
  "data": {
    "tier": "TRIAL",
    "trialEndsAt": "2026-05-28T00:00:00Z",
    "premiumEndsAt": null,
    "limits": {
      "wardrobeItems": 50,
      "canvases": 3,
      "tryOnPerMonth": 10,
      "regenPerMonth": 15,
      "calendarDays": 7
    },
    "usage": {
      "wardrobeItems": 12,
      "canvases": 1,
      "tryOnThisMonth": 2,
      "regenThisMonth": 4
    }
  }
}
```

### Таблица лимитов по тирам
| Tier    | items | canvases | tryOn/мес | regen/мес | calDays |
|---------|-------|----------|-----------|-----------|---------|
| FREE    | 20    | 1        | 2         | 5         | 2       |
| TRIAL   | 50    | 3        | 10        | 15        | 7       |
| PREMIUM | 999   | 7        | 30        | 50        | 7       |

---

## 2. Wardrobe (гардероб)

Префикс: `/api/v1/wardrobe/items`.

| Метод | Путь | Назначение |
|---|---|---|
| GET | `/stats` | Счётчики + `itemCountByCategory` |
| GET | `?category=&page=&size=` | Список READY-айтемов |
| GET | `/{id}` | Один айтем |
| PATCH | `/{id}` | Обновление: label/notes/favorite/clean/**category/subcategory** |
| DELETE | `/{id}` | Soft-archive |
| POST | `/{id}/wear` | Отметить «надевал сегодня» |

### `GET /stats`
```json
{
  "data": {
    "ready": 12, "processing": 1, "failed": 0, "archived": 3, "total": 13,
    "itemCountByCategory": {
      "TOPS": 3, "JEANS": 2, "SNEAKERS": 1, "DRESSES": 4, "BAGS": 2
    }
  }
}
```

### `WardrobeItemResponse`
```json
{
  "id": "uuid",
  "category": "TOPS",
  "subcategory": "TSHIRTS",
  "layer": "BASE",
  "status": "READY",
  "imageUrl": "https://cdn.svayp.com/...",
  "thumbnailUrl": "https://...",
  "colorPrimary": "#1a2b3c",
  "pattern": "SOLID",
  "material": "COTTON",
  "season": "ALL",
  "styleTags": ["casual"],
  "formalityScore": 4,
  "warmthScore": 2,
  "userLabel": "Любимая футболка",
  "userNotes": null,
  "isFavorite": true,
  "isClean": true,
  "timesWorn": 7,
  "lastWornAt": "2026-05-18T09:12:00Z",
  "createdAt": "2026-04-01T00:00:00Z"
}
```

### `PATCH /{id}`  — request
```json
{
  "userLabel": "string?",
  "userNotes": "string?",
  "isFavorite": true,
  "isClean": false,
  "category": "TOPS",
  "subcategory": "TSHIRTS"
}
```
Все поля опциональны; передавайте только то, что меняете.

### Enums
**`WardrobeCategory`** (крупная): `TOP`, `BOTTOM`, `OUTERWEAR`, `DRESS`, `SHOES`, `ACCESSORY`, `BAG`, `HEADWEAR`, `OTHER` *(точный список см. backend; UI берёт `category` как есть).*
**`WardrobeSubcategory`** (21 значение, точно совпадает с фронтовым `ClosetCategory`):
```
TOPS, TSHIRTS, BLOUSES, DRESSES, JUMPSUITS, JACKETS,
SKIRTS, JEANS, PANTS, SHORTS,
SHOES, SNEAKERS, HEELS, BOOTS, SANDALS, FLATS,
BAGS, ACCESSORIES, SHAWL, JEWELRY, UNDERWEAR
```

---

## 3. Upload (загрузка фото гардероба)

Префикс: `/api/v1/wardrobe/uploads`. Двухшаговый поток:

### Шаг 1. `POST /init` (или `POST /`)
Получаем SAS-URL для прямой заливки в Azure Blob.

**Request**
```json
{
  "contentType": "image/jpeg",
  "idempotencyKey": "optional-uuid",
  "category": "TOP",
  "subcategory": "TSHIRTS",
  "fileSizeBytes": 524288
}
```

**Response 200**
```json
{
  "data": {
    "jobId": "uuid",
    "s3Key": "users/<uid>/wardrobe/abc.jpg",
    "putUrl": "https://...?sas=...",
    "expiresAt": "2026-05-21T10:30:00Z",
    "method": "PUT"
  }
}
```

### Шаг 2. PUT bytes напрямую в blob
```http
PUT <putUrl>
Content-Type: image/jpeg
x-ms-blob-type: BlockBlob
<binary>
```

### Шаг 3. `POST /{jobId}/confirm`
Дёргаем после успешного PUT. Backend проверяет наличие blob-а, создаёт `WardrobeItem` в статусе `UPLOADED`, кикает ML-пайплайн.

### Шаг 4. Polling: `GET /{jobId}`
```json
{
  "data": {
    "jobId": "uuid",
    "wardrobeItemId": "uuid",
    "status": "PROCESSING",
    "progressPercent": 35,
    "currentStep": "product_shot_ready",
    "failureReason": null,
    "updatedAt": "2026-05-21T10:25:00Z"
  }
}
```
**Pipeline (порядок шагов и проценты):**

| progress | status | currentStep | что происходит |
|---|---|---|---|
| 10 | UPLOADED | `downloaded` | бек скачал blob |
| 20 | NSFW_SCAN | `nsfw_passed` | модерация |
| 35 | UPSCALE | `product_shot_ready` | **gpt-image-2** генерит flat-lay по промпту категории |
| 50 | BG_REMOVE | `bg_removed` | rembg вырезает фон уже у product-shot |
| 55 | UPSCALE | `thumbnail_built` | 400×400 превью |
| 65 | EMBED | `visual_embedded` | FashionCLIP-вектор |
| 90 | ANALYZE | `metadata_extracted` | GPT-4o Vision → category/color/material/season/... |
| 100 | COMPLETED | `ready` | `WardrobeItem.status = READY`, `imageUrl` доступен |
| 100 | FAILED | `nsfw_rejected` / `not_clothing_rejected` / `exception` | см. `failureReason` |

UI должен поллить раз в 2–3 сек до `status ∈ {COMPLETED, FAILED}`. После `COMPLETED` сразу читай `GET /api/v1/wardrobe/items/{wardrobeItemId}` — там `imageUrl` уже будет указывать на `enhanced` (gpt-image-2) или, при его отсутствии, на `processed` (bg-removed) / `original`.

### Список своих job-ов
`GET /api/v1/wardrobe/uploads?page=&size=` — пагинированный список.

### Квоты
`init` упирается в `WARDROBE_ITEM_LIMIT` (402). UI должен показать paywall.

---

## 4. Outfit Suggestions (AI-подбор)

⚠️ **Маршруты перенесены** с `/api/v1/outfits/*` на `/api/v1/outfits/suggestions/*`. Старые пути удалены.

| Метод | Путь | Назначение |
|---|---|---|
| GET | `/api/v1/outfits/suggestions` | Page<Outfit> активных (не dismissed), отсортировано по score |
| GET | `/api/v1/outfits/suggestions/by-date?date=2026-05-21` | На конкретный день |
| GET | `/api/v1/outfits/suggestions/{id}` | Один |
| POST | `/api/v1/outfits/suggestions/{id}/wear` | Отметить «надел» (тратит daily look quota на FREE) |
| POST | `/api/v1/outfits/suggestions/{id}/rate?rating=4` | Оценка 1–5 |
| DELETE | `/api/v1/outfits/suggestions/{id}` | Dismiss (мягко скрыть, сигнал предпочтений) |
| POST | `/api/v1/outfits/generate?count=3` | Re-generate (квотится `REGEN_MONTHLY_LIMIT`), 202 Accepted |

### `OutfitResponse` (форма из `OutfitResponse.from`)
Содержит: `id, userId, coreItemIds[], optionalItemIds[], scoreTotal, scoreColor, scoreStyle, scoreFit, scoreDiversity, silhouetteType, colorStoryType, seasonTarget, weatherTarget, temperatureC, targetDate, hasHijabLayer, generatedBy, collagePreviewUrl, createdAt`.

### `POST /generate`
```json
{ "data": { "queued": true, "count": 3 }, "message": "Outfit generation queued — check back in a few minutes" }
```
**402** при превышении месячного regen-лимита (счётчик автоматически сбрасывается 1-го числа месяца).

---

## 5. Outfit Canvases (плоский конструктор аутфитов)

Префикс: `/api/v1/outfits/canvases`. Пользовательские flat-lay композиции из своих wardrobe items.

### `GET ?page=&size=` → `Page<OutfitCanvasResponse>`
### `GET /{id}` → один
### `POST` — создание (квотится `CANVAS_LIMIT`, 402)
### `PUT /{id}` — **полная замена** метаданных + items (атомарно). Слать ВСЕГДА полный layout.
### `DELETE /{id}`

### Request (`POST` и `PUT` одинаковые)
```json
{
  "name": "Casual Friday",
  "occasion": "WORK",
  "thumbnailUrl": "https://...png",
  "items": [
    {
      "wardrobeItemId": "uuid",
      "x": 120.5,
      "y": 240.0,
      "scale": 1.0,
      "zIndex": 0,
      "itemGroup": "top"
    }
  ]
}
```
`items` обязателен и непустой. Каждый item: `wardrobeItemId/x/y` required; `scale` default `1.0`, `zIndex` default `0`, `itemGroup` свободная строка ≤20 символов (`top/bottom/shoes/accessory` рекомендуем).

### Response
```json
{
  "data": {
    "id": "uuid",
    "name": "Casual Friday",
    "occasion": "WORK",
    "thumbnailUrl": "https://...",
    "items": [
      {
        "id": "uuid",
        "wardrobeItemId": "uuid",
        "imageUrl": "https://cdn.../enhanced.png",
        "x": 120.5, "y": 240.0, "scale": 1.0, "zIndex": 0,
        "itemGroup": "top"
      }
    ],
    "createdAt": "2026-05-21T10:00:00Z",
    "updatedAt": "2026-05-21T10:00:00Z"
  }
}
```

### Валидация
- Каждый `wardrobeItemId` должен принадлежать юзеру → иначе **404 WARDROBE_ITEM_NOT_FOUND**.
- Каждый айтем должен быть `READY` → иначе **422 WARDROBE_ITEM_NOT_READY**.
- При `POST` если `count(canvases) >= limit` → **402 QUOTA_EXCEEDED / CANVAS_LIMIT**.

---

## 6. Virtual Try-On (заглушка)

Префикс: `/api/v1/outfits/try-on`. На данный момент **стаб**: создаёт PENDING-job, ML не дернётся. UI должен поллить — статус останется PENDING (пока не подключим модель).

### `POST` (квотится `TRY_ON_MONTHLY_LIMIT`)
**Request**
```json
{
  "canvasId": "uuid?",
  "wardrobeItemIds": ["uuid", "uuid"],
  "modelImageUrl": "https://...optional"
}
```

**Response 202**
```json
{
  "data": {
    "id": "uuid",
    "canvasId": "uuid",
    "wardrobeItemIds": ["uuid", "uuid"],
    "status": "PENDING",
    "modelImageUrl": null,
    "resultImageUrl": null,
    "failureReason": null,
    "createdAt": "2026-05-21T10:00:00Z",
    "completedAt": null
  },
  "message": "Try-on job queued"
}
```

### `GET /{id}` — polling
Тот же payload. Статусы: `PENDING | PROCESSING | COMPLETED | FAILED`.

### Валидация
- Все `wardrobeItemIds` должны быть свои и `READY`.
- При превышении месячного try-on квоты → **402 QUOTA_EXCEEDED / TRY_ON_MONTHLY_LIMIT**.

---

## 7. Outfit Calendar

### `GET /api/v1/outfits/calendar?from=2026-05-21&to=2026-05-27`
Возвращает плотный (densified) календарь: каждый день в `[from, to]`, даже если пустой.

**Response**
```json
{
  "data": {
    "from": "2026-05-21",
    "to": "2026-05-27",
    "days": [
      { "date": "2026-05-21", "outfits": [ { /* OutfitResponse */ } ] },
      { "date": "2026-05-22", "outfits": [] }
    ]
  }
}
```

### Ограничения
- `to >= from` иначе **400 CALENDAR_RANGE_INVALID**.
- Окно ≤ `limits.calendarDays` (FREE=2, TRIAL/PREMIUM=7) иначе **400 CALENDAR_RANGE_INVALID**.

---

## 8. Чек-лист интеграции

1. **При старте приложения**: `GET /me/plan` → сохранить `tier`, `limits`, `usage` в стор. От этого зависит отрисовка квот.
2. **Загрузка**: init → PUT в blob → confirm → poll `GET /{jobId}` каждые 2–3 сек, пока `status` не дойдёт до `READY` (на `WardrobeItem`) или `FAILED`.
3. **Список гардероба**: `GET /api/v1/wardrobe/items?category=...` + `GET /stats` для секций UI и countByCategory.
4. **Создание canvas**: проверь `usage.canvases < limits.canvases` локально → `POST /canvases`. Backend всё равно перепроверит.
5. **Re-generate**: `POST /api/v1/outfits/generate?count=3` → 202, далее показать «идёт генерация» и периодически `GET /suggestions`.
6. **Try-on**: `POST /try-on` → polling по `GET /try-on/{id}`.
7. **Календарь**: `GET /calendar?from=&to=` с окном ≤ `limits.calendarDays`.
8. **Любой 402**: показать paywall и обновить `GET /me/plan` чтобы синхронизировать usage.

---

## 9. Что НЕ реализовано (для справки)
- Реальное ML-исполнение try-on (статус всегда PENDING).
- Push-уведомления о завершении регенерации/try-on (UI должен поллить).
- Bulk-операции с canvases (move/clone).
- Аналитика на закрытие paywall (есть отдельный `POST /api/v1/me/subscription/funnel`).
