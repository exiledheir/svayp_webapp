# Closet Feature — Backend API Specification

> **Version**: 2.0 (aligned with actual backend implementation)  
> **Date**: 2026-05-21  
> **Base URL**: `https://api.svayp.com` (prod) / `http://localhost:8080` (dev)  
> **Proxy**: Frontend uses `/proxy/*` → rewrites to `https://app.svaypai.com/api/v1/*`  
> **Auth**: Bearer JWT in `Authorization` header (all endpoints require auth)  
> **Status**: ✅ All endpoints implemented and compiled (`mvn compile` → BUILD SUCCESS)

---

See [closet-frontend-api.md](./closet-frontend-api.md) for the full backend developer guide with response examples.

---

## Table of Contents

1. [Data Models](#1-data-models)
2. [User Plan & Usage](#2-user-plan--usage)
3. [Wardrobe Items (CRUD)](#3-wardrobe-items-crud)
4. [Image Upload Pipeline](#4-image-upload-pipeline)
5. [Outfit Canvases](#5-outfit-canvases)
6. [Outfit Generation (AI)](#6-outfit-generation-ai)
7. [Virtual Try-On (AI)](#7-virtual-try-on-ai)
8. [Calendar Outfits](#8-calendar-outfits)
9. [Error Handling](#9-error-handling)
10. [Business Rules Summary](#10-business-rules-summary)

---

## 1. Data Models

### 1.1 WardrobeCategory (enum)

```
TOPS | TSHIRTS | SHIRTS | PANTS | JEANS | SKIRTS | DRESSES
| SHOES | BAGS | ACCESSORIES | HIJAB_SCARVES | OUTERWEAR | OTHER
```

### 1.2 WardrobeSubcategory (enum) — NEW

Fine-grained subcategory stored alongside category for UI filtering:

```
tops | tshirts | blouses | dresses | jumpsuits | jackets
| skirts | jeans | pants | shorts
| shoes | sneakers | heels | boots | sandals | flats
| bags | accessories | shawl | jewelry | underwear
```

**Mapping to parent category:**

| Subcategory    | Parent Category   |
|----------------|-------------------|
| tops           | TOPS              |
| tshirts        | TSHIRTS           |
| blouses        | SHIRTS            |
| dresses        | DRESSES           |
| jumpsuits      | DRESSES           |
| jackets        | OUTERWEAR         |
| skirts         | SKIRTS            |
| jeans          | JEANS             |
| pants          | PANTS             |
| shorts         | PANTS             |
| shoes          | SHOES             |
| sneakers       | SHOES             |
| heels          | SHOES             |
| boots          | SHOES             |
| sandals        | SHOES             |
| flats          | SHOES             |
| bags           | BAGS              |
| accessories    | ACCESSORIES       |
| shawl          | HIJAB_SCARVES     |
| jewelry        | ACCESSORIES       |
| underwear      | OTHER             |

### 1.3 WardrobeItem

```json
{
  "id": "uuid",
  "userId": "uuid",
  "category": "SHOES",
  "subcategory": "sneakers",
  "layer": "INNER | MID | OUTER | null",
  "status": "READY | PROCESSING | FAILED | ARCHIVED",
  "imageUrl": "https://cdn.svaypai.com/items/full/abc.jpg",
  "thumbnailUrl": "https://cdn.svaypai.com/items/thumb/abc.jpg",
  "colorPrimary": "#2D2D2D",
  "pattern": "solid | striped | plaid | floral | ...",
  "material": "cotton | denim | leather | ...",
  "season": "ALL_SEASON | SUMMER | WINTER | SPRING_FALL",
  "styleTags": ["casual", "streetwear"],
  "formalityScore": 3,
  "warmthScore": 2,
  "userLabel": "My favorite sneakers",
  "userNotes": "Goes well with jeans",
  "isFavorite": false,
  "isClean": true,
  "timesWorn": 5,
  "lastWornAt": "2025-05-15T10:00:00Z",
  "createdAt": "2025-04-01T12:00:00Z"
}
```

### 1.4 OutfitCanvas

```json
{
  "id": "uuid",
  "userId": "uuid",
  "name": "Weekend Look",
  "items": [
    {
      "wardrobeItemId": "uuid",
      "x": 32.0,
      "y": 4.0,
      "scale": 1.0,
      "zIndex": 1,
      "group": "upper"
    }
  ],
  "thumbnailUrl": "https://cdn.svaypai.com/outfits/thumb/xyz.jpg",
  "occasion": "weekend | work | party | casual | null",
  "createdAt": "2025-05-10T08:00:00Z",
  "updatedAt": "2025-05-20T14:30:00Z"
}
```

### 1.5 UserPlan

```json
{
  "userId": "uuid",
  "plan": "free | pro | premium",
  "limits": {
    "itemsPerCategory": 2,
    "outfitCanvases": 1,
    "tryItOns": 2,
    "regenerations": 5,
    "calendarDays": 2
  },
  "usage": {
    "regenerationsUsed": 3,
    "tryItOnsUsed": 1,
    "itemCountByCategory": {
      "tops": 2,
      "sneakers": 1
    }
  },
  "billingPeriodStart": "2025-05-01T00:00:00Z",
  "billingPeriodEnd": "2025-06-01T00:00:00Z"
}
```

### 1.6 OutfitCanvasItem (embedded in OutfitCanvas)

| Field            | Type    | Description                                       |
|------------------|---------|---------------------------------------------------|
| wardrobeItemId   | uuid    | Reference to the WardrobeItem                     |
| x                | float   | Horizontal position in canvas (% of width, 0-100) |
| y                | float   | Vertical position in canvas (% of height, 0-100)  |
| scale            | float   | Scale factor (0.3–3.0)                            |
| zIndex           | int     | Layer order (higher = on top)                     |
| group            | string  | Item group: `upper | lower | shoes | acc`         |

---

## 2. User Plan & Usage

### 2.1 GET `/users/me/plan`

**Why**: Load user's current plan, limits, and usage on app start and before each gated action. Replaces current localStorage-based plan tracking with server-enforced data.

**Parameters**: None (user from auth token)

**Response** `200 OK`:
```json
{
  "data": {
    "userId": "uuid",
    "plan": "pro",
    "limits": {
      "itemsPerCategory": 10,
      "outfitCanvases": 3,
      "tryItOns": 10,
      "regenerations": 15,
      "calendarDays": 7
    },
    "usage": {
      "regenerationsUsed": 3,
      "tryItOnsUsed": 1,
      "itemCountByCategory": {
        "tops": 4,
        "sneakers": 2,
        "jeans": 3
      }
    },
    "billingPeriodStart": "2025-05-01T00:00:00Z",
    "billingPeriodEnd": "2025-06-01T00:00:00Z"
  }
}
```

**Plan Limits Reference:**

| Plan    | itemsPerCategory | outfitCanvases | tryItOns | regenerations | calendarDays |
|---------|------------------|----------------|----------|---------------|--------------|
| free    | 2                | 1              | 2        | 5             | 2            |
| pro     | 10               | 3              | 10       | 15            | 7            |
| premium | 20               | 7              | 30       | 50            | 7            |

**Business Rules:**
- Usage counters reset at `billingPeriodStart` each cycle
- `itemCountByCategory` counts by **subcategory** (not parent category)
- This endpoint is called: (a) on first login/OTP, (b) every time app loads/closet page opens

---

## 3. Wardrobe Items (CRUD)

### 3.1 GET `/wardrobe/items`

**Why**: Load all user's wardrobe items to populate the closet grid. Supports filtering by category/subcategory and pagination.

**Query Parameters:**

| Param       | Type   | Required | Description                        |
|-------------|--------|----------|------------------------------------|
| category    | string | No       | Filter by parent category (SHOES)  |
| subcategory | string | No       | Filter by subcategory (sneakers)   |
| page        | int    | No       | Page number, 0-indexed (default 0) |
| size        | int    | No       | Page size (default 30, max 100)    |
| status      | string | No       | Filter by status (default READY)   |

**Response** `200 OK`:
```json
{
  "data": {
    "content": [
      {
        "id": "uuid",
        "category": "SHOES",
        "subcategory": "sneakers",
        "layer": null,
        "status": "READY",
        "imageUrl": "https://cdn.svaypai.com/items/full/abc.jpg",
        "thumbnailUrl": "https://cdn.svaypai.com/items/thumb/abc.jpg",
        "colorPrimary": "#FFFFFF",
        "pattern": "solid",
        "material": "synthetic",
        "season": "ALL_SEASON",
        "styleTags": ["sporty", "casual"],
        "formalityScore": 2,
        "warmthScore": 1,
        "userLabel": null,
        "userNotes": null,
        "isFavorite": false,
        "isClean": true,
        "timesWorn": 0,
        "lastWornAt": null,
        "createdAt": "2025-05-01T12:00:00Z"
      }
    ],
    "totalElements": 15,
    "totalPages": 1,
    "number": 0,
    "size": 30
  }
}
```

### 3.2 GET `/wardrobe/items/{id}`

**Why**: Load a single item's full details (e.g., for edit sheet).

**Path Parameters:** `id` — item UUID

**Response** `200 OK`: Single `WardrobeItem` object in `data`.

### 3.3 PATCH `/wardrobe/items/{id}`

**Why**: Update item metadata (category change, notes, favorite toggle). Used when user changes an item's subcategory in the edit sheet.

**Path Parameters:** `id` — item UUID

**Request Body:**
```json
{
  "subcategory": "heels",
  "category": "SHOES",
  "userLabel": "Red heels",
  "userNotes": "For parties",
  "isFavorite": true,
  "isClean": false
}
```

All fields optional — only send what changed.

**Response** `200 OK`: Updated `WardrobeItem`.

**Business Rules:**
- When `subcategory` changes, backend should re-derive `category` from the mapping table (or accept both)
- Changing subcategory must validate item count in new subcategory against plan limit

### 3.4 DELETE `/wardrobe/items/{id}`

**Why**: Remove an item from the user's wardrobe. Also removes from any outfit canvases that reference it.

**Path Parameters:** `id` — item UUID

**Response** `204 No Content`

**Business Rules:**
- Cascading: remove item references from all outfit canvases containing it
- Decrement `itemCountByCategory` for the item's subcategory
- Delete associated images from CDN/blob storage (can be async)

### 3.5 GET `/wardrobe/items/stats`

**Why**: Quick count overview without loading all items (used for UI badges/counters).

**Response** `200 OK`:
```json
{
  "data": {
    "ready": 12,
    "processing": 1,
    "failed": 0,
    "archived": 0,
    "total": 13
  }
}
```

---

## 4. Image Upload Pipeline

### Why This Flow Exists

When a user uploads a clothing photo, it must be:
1. Checked for NSFW content → reject if inappropriate
2. Background removed → clean product-style image
3. Upscaled → consistent quality
4. AI-embedded → generate embeddings for outfit matching
5. AI-analyzed → extract color, pattern, material, season, style tags, scores

This is a multi-step async pipeline.

### 4.1 POST `/wardrobe/uploads`

**Why**: Initiate upload — get a pre-signed URL to upload the image directly to blob storage (avoids large file going through API server).

**Request Body:**
```json
{
  "contentType": "image/jpeg",
  "idempotencyKey": "uuid-v4",
  "category": "SHOES",
  "subcategory": "sneakers"
}
```

| Field          | Type   | Required | Description                                    |
|----------------|--------|----------|------------------------------------------------|
| contentType    | string | Yes      | MIME type of the image                         |
| idempotencyKey | uuid   | Yes      | Client-generated UUID to prevent duplicate uploads |
| category       | string | No       | Parent category hint                           |
| subcategory    | string | No       | Fine-grained subcategory                       |

**Response** `201 Created`:
```json
{
  "data": {
    "uploadJobId": "uuid",
    "blobKey": "uploads/user123/abc.jpg",
    "uploadUrl": "https://storage.blob.core.windows.net/wardrobe/...",
    "uploadUrlExpiresAt": "2025-05-21T12:01:00Z",
    "httpMethod": "PUT"
  }
}
```

**Business Rules:**
- **Enforce plan limit**: Before generating upload URL, check `itemCountByCategory[subcategory] < plan.itemsPerCategory`. If over limit, return `403` with error code `PLAN_LIMIT_EXCEEDED`.
- Upload URL expires in 60 seconds
- `idempotencyKey` prevents duplicate processing if client retries

### 4.2 Client uploads file directly to blob storage

```
PUT {uploadUrl}
Headers:
  Content-Type: image/jpeg
  x-ms-blob-type: BlockBlob
Body: raw file bytes
```

This is NOT an API endpoint — it's a direct upload to Azure Blob Storage using the pre-signed URL.

### 4.3 POST `/wardrobe/uploads/{uploadJobId}/confirm`

**Why**: Tell the backend the file is uploaded and it should start the AI processing pipeline.

**Path Parameters:** `uploadJobId` — from step 4.1

**Response** `200 OK`:
```json
{
  "data": {
    "uploadJobId": "uuid",
    "wardrobeItemId": null,
    "status": "UPLOADED",
    "progressPercent": 0,
    "currentStep": "Queued for processing",
    "failureReason": null,
    "updatedAt": "2025-05-21T12:00:05Z"
  }
}
```

### 4.4 GET `/wardrobe/uploads/{uploadJobId}`

**Why**: Poll for upload processing status. Client polls until terminal state is reached.

**Path Parameters:** `uploadJobId`

**Response** `200 OK`:
```json
{
  "data": {
    "uploadJobId": "uuid",
    "wardrobeItemId": "uuid-or-null",
    "status": "BG_REMOVED",
    "progressPercent": 45,
    "currentStep": "Removing background...",
    "failureReason": null,
    "updatedAt": "2025-05-21T12:00:12Z"
  }
}
```

**Status Progression:**

| Status        | progressPercent | currentStep                   | Notes                      |
|---------------|-----------------|-------------------------------|----------------------------|
| UPLOADED      | 0–10            | Queued for processing         | Initial                    |
| NSFW_CHECKED  | 15–20           | Content verified              | Passed safety check        |
| BG_REMOVED    | 30–50           | Removing background...        | Background removal done    |
| UPSCALED      | 55–65           | Enhancing image quality...    | Image upscaled             |
| EMBEDDED      | 70–80           | Generating style embeddings...| Vector embedding created   |
| ANALYZED      | 85–95           | Analyzing attributes...       | Color/pattern/style done   |
| READY         | 100             | Complete                      | **Terminal** — item ready  |
| FAILED        | —               | Processing failed             | **Terminal** — see reason  |
| REJECTED_NSFW | —               | Content rejected              | **Terminal** — inappropriate |

**Polling Strategy (client-side):**
- UPLOADED/NSFW_CHECKED: every 2s
- BG_REMOVED/UPSCALED/EMBEDDED: every 3s
- Other: every 5s
- Timeout after 3 minutes

**When `status === "READY"`:**
- `wardrobeItemId` is now populated (the created item's UUID)
- Item is available via GET `/wardrobe/items/{wardrobeItemId}`

---

## 5. Outfit Canvases

### Why

Users create outfit compositions by placing wardrobe items on a canvas with specific positions, sizes, and layering. These must persist server-side for cross-device sync.

### 5.1 POST `/outfits`

**Why**: Create a new outfit canvas. Requires at least 1 upper-body item + 1 lower-body or shoes item.

**Request Body:**
```json
{
  "name": "Weekend Look",
  "occasion": "weekend",
  "items": [
    {
      "wardrobeItemId": "uuid-1",
      "x": 32.0,
      "y": 4.0,
      "scale": 1.0,
      "zIndex": 1,
      "group": "upper"
    },
    {
      "wardrobeItemId": "uuid-2",
      "x": 32.0,
      "y": 37.0,
      "scale": 1.0,
      "zIndex": 2,
      "group": "lower"
    },
    {
      "wardrobeItemId": "uuid-3",
      "x": 32.0,
      "y": 68.0,
      "scale": 0.72,
      "zIndex": 3,
      "group": "shoes"
    }
  ]
}
```

| Field    | Type   | Required | Description                                     |
|----------|--------|----------|-------------------------------------------------|
| name     | string | No       | User-given name (auto-generated if null)        |
| occasion | string | No       | `weekend | work | party | casual | null`        |
| items    | array  | Yes      | At least 2 items (1 upper + 1 lower/shoes)      |

**Response** `201 Created`:
```json
{
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "name": "Weekend Look",
    "items": [...],
    "thumbnailUrl": null,
    "occasion": "weekend",
    "createdAt": "2025-05-21T12:00:00Z",
    "updatedAt": "2025-05-21T12:00:00Z"
  }
}
```

**Business Rules:**
- **Enforce plan limit**: `outfitCanvasCount < plan.outfitCanvases`. Return `403 PLAN_LIMIT_EXCEEDED` if over.
- **Minimum validation**: Must have at least 1 item with `group: "upper"` AND at least 1 item with `group: "lower"` or `group: "shoes"`
- All referenced `wardrobeItemId`s must belong to this user and have `status: READY`
- Thumbnail is generated asynchronously after creation (composite of items)

### 5.2 GET `/outfits`

**Why**: List all user's outfit canvases for the closet page and calendar.

**Query Parameters:**

| Param    | Type   | Required | Description                     |
|----------|--------|----------|---------------------------------|
| page     | int    | No       | Page number (default 0)         |
| size     | int    | No       | Page size (default 20)          |
| occasion | string | No       | Filter by occasion type         |

**Response** `200 OK`:
```json
{
  "data": {
    "content": [
      {
        "id": "uuid",
        "name": "Weekend Look",
        "items": [...],
        "thumbnailUrl": "https://cdn.svaypai.com/outfits/thumb/xyz.jpg",
        "occasion": "weekend",
        "createdAt": "2025-05-21T12:00:00Z",
        "updatedAt": "2025-05-21T14:00:00Z"
      }
    ],
    "totalElements": 3,
    "totalPages": 1,
    "number": 0,
    "size": 20
  }
}
```

### 5.3 GET `/outfits/{id}`

**Why**: Load a specific canvas with full item details (for editing/viewing).

**Response** `200 OK`: Full `OutfitCanvas` object with `items` array.

### 5.4 PUT `/outfits/{id}`

**Why**: Update an outfit canvas — save new layout after user drags/resizes/adds/removes items or swaps items.

**Request Body:**
```json
{
  "name": "Updated Weekend Look",
  "occasion": "casual",
  "items": [
    {
      "wardrobeItemId": "uuid-1",
      "x": 35.0,
      "y": 10.0,
      "scale": 0.88,
      "zIndex": 1,
      "group": "upper"
    },
    {
      "wardrobeItemId": "uuid-new",
      "x": 32.0,
      "y": 48.0,
      "scale": 0.88,
      "zIndex": 2,
      "group": "lower"
    }
  ]
}
```

**Response** `200 OK`: Updated `OutfitCanvas`.

**Business Rules:**
- Same minimum validation as creation (at least upper + lower/shoes)
- Deduplicate: if same `wardrobeItemId` appears multiple times, keep last occurrence
- Regenerate thumbnail asynchronously if items changed

### 5.5 DELETE `/outfits/{id}`

**Why**: Delete an outfit canvas.

**Response** `204 No Content`

### 5.6 POST `/outfits/{id}/items`

**Why**: Add a single item to an existing outfit canvas (quick add from swap picker).

**Request Body:**
```json
{
  "wardrobeItemId": "uuid",
  "x": 30.0,
  "y": 30.0,
  "scale": 1.0,
  "zIndex": 5,
  "group": "acc"
}
```

**Response** `200 OK`: Updated `OutfitCanvas`.

### 5.7 DELETE `/outfits/{id}/items/{wardrobeItemId}`

**Why**: Remove a specific item from an outfit canvas.

**Response** `200 OK`: Updated `OutfitCanvas`.

---

## 6. Outfit Generation (AI)

### Why

User clicks "Generate" / "Regenerate" to get AI-suggested outfit combinations from their wardrobe items. Backend selects compatible items using style embeddings, color harmony, occasion, season.

### 6.1 POST `/outfits/generate`

**Why**: Generate a new outfit layout from user's wardrobe using AI recommendation.

**Request Body:**
```json
{
  "occasion": "weekend",
  "season": "SUMMER",
  "excludeItemIds": ["uuid-already-used"],
  "preferredStyle": "casual"
}
```

| Field          | Type     | Required | Description                                           |
|----------------|----------|----------|-------------------------------------------------------|
| occasion       | string   | No       | Hint for outfit style                                 |
| season         | string   | No       | Filter items by season compatibility                  |
| excludeItemIds | string[] | No       | Items to exclude (e.g., from previous generation)     |
| preferredStyle | string   | No       | Style preference (casual, formal, sporty, etc.)       |

**Response** `200 OK`:
```json
{
  "data": {
    "generationId": "uuid",
    "items": [
      {
        "wardrobeItemId": "uuid-1",
        "x": 32.0,
        "y": 4.0,
        "scale": 1.0,
        "zIndex": 1,
        "group": "upper"
      },
      {
        "wardrobeItemId": "uuid-2",
        "x": 32.0,
        "y": 37.0,
        "scale": 1.0,
        "zIndex": 2,
        "group": "lower"
      },
      {
        "wardrobeItemId": "uuid-3",
        "x": 32.0,
        "y": 68.0,
        "scale": 0.72,
        "zIndex": 3,
        "group": "shoes"
      },
      {
        "wardrobeItemId": "uuid-4",
        "x": 63.0,
        "y": 5.0,
        "scale": 0.6,
        "zIndex": 4,
        "group": "acc"
      }
    ],
    "compatibilityScore": 0.87,
    "reasoning": "Matched earth tones with casual denim for a relaxed weekend look"
  }
}
```

**Business Rules:**
- **Enforce plan limit**: `regenerationsUsed < plan.regenerations`. Return `403 PLAN_LIMIT_EXCEEDED` if over.
- **Increment usage counter**: After successful generation, increment `regenerationsUsed`
- **Minimum items required**: User must have at least 1 upper-body item + 1 lower-body/shoes item in wardrobe. Return `422 INSUFFICIENT_ITEMS` otherwise.
- AI must pick at least 1 upper + 1 lower/shoes. Accessories/shawl are optional.
- Position values follow the layout conventions:
  - Without shawl: upper y=4, lower y=37, shoes y=68(scale 0.72), side-acc x=63 y=5(scale 0.6)
  - With shawl: all items scale=0.88, shawl at x=32 y=-5(scale 0.55, zIndex=10), upper y=19, lower y=48, shoes y=73(scale 0.65)

---

## 7. Virtual Try-On (AI)

### Why

User wants to visualize how a complete outfit looks on a body/mannequin. Backend takes the outfit items and generates a composite image showing the outfit worn on a figure.

### 7.1 POST `/outfits/try-on`

**Why**: Generate a virtual try-on image for a given outfit.

**Request Body:**
```json
{
  "outfitId": "uuid",
  "bodyType": "default"
}
```

OR (without saved outfit — direct item IDs):

```json
{
  "wardrobeItemIds": ["uuid-top", "uuid-pants", "uuid-shoes"],
  "bodyType": "default"
}
```

| Field           | Type     | Required          | Description                                        |
|-----------------|----------|-------------------|----------------------------------------------------|
| outfitId        | uuid     | One of these two  | Reference to saved outfit canvas                   |
| wardrobeItemIds | string[] | One of these two  | Direct list of item IDs (if no saved outfit)       |
| bodyType        | string   | No                | Body type for mannequin (future: user body photo)  |

**Response** `202 Accepted` (async processing):
```json
{
  "data": {
    "tryOnJobId": "uuid",
    "status": "PROCESSING",
    "estimatedSeconds": 15
  }
}
```

### 7.2 GET `/outfits/try-on/{tryOnJobId}`

**Why**: Poll for try-on generation result.

**Response** `200 OK`:
```json
{
  "data": {
    "tryOnJobId": "uuid",
    "status": "COMPLETED",
    "resultImageUrl": "https://cdn.svaypai.com/try-on/result-abc.jpg",
    "createdAt": "2025-05-21T12:00:00Z"
  }
}
```

**Statuses**: `PROCESSING | COMPLETED | FAILED`

**Business Rules:**
- **Enforce plan limit**: `tryItOnsUsed < plan.tryItOns`. Return `403 PLAN_LIMIT_EXCEEDED` if over.
- **Increment usage counter**: Increment `tryItOnsUsed` when job starts (not when complete, to prevent abuse)
- Items sent must include at minimum: 1 upper + 1 lower/shoes
- Generated image cached for 7 days (avoid re-generation of same combination)

---

## 8. Calendar Outfits

### Why

Users see AI-suggested outfits for each day. The backend generates unique daily outfits from the user's wardrobe, ensuring variety across the week.

### 8.1 GET `/outfits/calendar`

**Why**: Get outfit suggestions for a date range (calendar view).

**Query Parameters:**

| Param     | Type   | Required | Description                               |
|-----------|--------|----------|-------------------------------------------|
| startDate | string | Yes      | ISO date (YYYY-MM-DD), e.g. `2025-05-21` |
| endDate   | string | Yes      | ISO date (YYYY-MM-DD), e.g. `2025-05-27` |

**Response** `200 OK`:
```json
{
  "data": {
    "days": [
      {
        "date": "2025-05-21",
        "locked": false,
        "outfit": {
          "items": [
            {
              "wardrobeItemId": "uuid-1",
              "group": "upper",
              "thumbnailUrl": "https://cdn.svaypai.com/items/thumb/abc.jpg"
            },
            {
              "wardrobeItemId": "uuid-2",
              "group": "lower",
              "thumbnailUrl": "https://cdn.svaypai.com/items/thumb/def.jpg"
            },
            {
              "wardrobeItemId": "uuid-3",
              "group": "shoes",
              "thumbnailUrl": "https://cdn.svaypai.com/items/thumb/ghi.jpg"
            }
          ]
        }
      },
      {
        "date": "2025-05-23",
        "locked": true,
        "outfit": null
      }
    ],
    "unlockedDays": 2,
    "totalDays": 7
  }
}
```

**Business Rules:**
- Number of unlocked days = `plan.calendarDays` (free=2, pro/premium=7)
- Days beyond limit have `locked: true` and `outfit: null`
- AI generates different outfits for each unlocked day — no repeat of the exact same combination within a 7-day window
- If user doesn't have enough items for variety, items can repeat but ordering/accessories should differ
- Outfits are regenerated daily (or cached for 24h)
- Deterministic by day: same user + same date + same wardrobe = same outfit (unless user regenerates)

---

## 9. Error Handling

### Standard Error Response

```json
{
  "error": {
    "code": "PLAN_LIMIT_EXCEEDED",
    "message": "You have reached the maximum number of items for this category on your current plan",
    "details": {
      "currentCount": 2,
      "maxAllowed": 2,
      "plan": "free",
      "category": "sneakers"
    }
  }
}
```

### Error Codes

| Code                  | HTTP | When                                                      |
|-----------------------|------|-----------------------------------------------------------|
| PLAN_LIMIT_EXCEEDED   | 403  | Any action exceeds plan limit                             |
| INSUFFICIENT_ITEMS    | 422  | Outfit generation requires more items in wardrobe         |
| ITEM_NOT_FOUND        | 404  | Referenced wardrobeItemId doesn't exist                   |
| ITEM_NOT_READY        | 422  | Referenced item still processing (status ≠ READY)         |
| INVALID_OUTFIT        | 422  | Outfit doesn't meet minimum requirements (upper+lower)   |
| UPLOAD_EXPIRED        | 410  | Upload URL expired (>60s)                                 |
| NSFW_REJECTED         | 422  | Image rejected by NSFW check                             |
| PROCESSING_FAILED     | 500  | AI pipeline failed                                        |
| UNAUTHORIZED          | 401  | Invalid/expired token                                     |

---

## 10. Business Rules Summary

### Plan Enforcement (Server-Side)

All limits checked server-side. Frontend may pre-check for UX but backend is the source of truth.

| Action                     | Limit Field          | Enforcement Point                      |
|----------------------------|----------------------|----------------------------------------|
| Upload new item            | itemsPerCategory     | POST `/wardrobe/uploads` — check before generating URL |
| Create outfit canvas       | outfitCanvases       | POST `/outfits` — check before creation |
| Generate/regenerate outfit | regenerations        | POST `/outfits/generate` — check & increment |
| Virtual try-on             | tryItOns             | POST `/outfits/try-on` — check & increment |
| Calendar unlocked days     | calendarDays         | GET `/outfits/calendar` — lock excess days |

### Image Processing Pipeline

```
User photo → NSFW check → Background removal → Upscale → Embedding → Attribute analysis → READY
```

- Background removal ensures clean product-style images regardless of user's photo quality/background
- Embeddings enable AI outfit matching based on visual style similarity
- Attribute analysis extracts: color, pattern, material, season, formality, warmth — used for outfit generation

### Canvas Layout Conventions

Items positioned using percentage-based coordinates (relative to canvas container):

| Position  | x    | y (no shawl) | y (with shawl) | scale (no shawl) | scale (with shawl) | zIndex |
|-----------|------|--------------|----------------|-------------------|---------------------|--------|
| Upper     | 32   | 4            | 19             | 1.0               | 0.88                | 1      |
| Lower     | 32   | 37           | 48             | 1.0               | 0.88                | 2      |
| Shoes     | 32   | 68           | 73             | 0.72              | 0.65                | 3      |
| Side Acc  | 63   | 5            | 20             | 0.6               | 0.6                 | 4      |
| Shawl     | 32   | —            | -5             | —                 | 0.55                | 10     |

### Item Group Classification

| Group  | Subcategories                                          |
|--------|--------------------------------------------------------|
| upper  | tops, tshirts, blouses, dresses, jumpsuits, jackets    |
| lower  | skirts, jeans, pants, shorts                           |
| shoes  | shoes, sneakers, heels, boots, sandals, flats          |
| acc    | accessories, bags, shawl, jewelry, underwear           |

### Cascading Deletes

- Delete wardrobe item → remove from all outfit canvases referencing it
- Delete outfit canvas → no effect on wardrobe items
- If removing an item makes an outfit invalid (no upper or no lower/shoes), mark outfit as `INCOMPLETE` but don't delete

---

## API Endpoints Summary Table

| # | Method | Endpoint                              | Purpose                          |
|---|--------|---------------------------------------|----------------------------------|
| 1 | GET    | `/users/me/plan`                      | Get plan, limits & usage         |
| 2 | GET    | `/wardrobe/items`                     | List items (paginated, filtered) |
| 3 | GET    | `/wardrobe/items/{id}`                | Get single item                  |
| 4 | PATCH  | `/wardrobe/items/{id}`                | Update item metadata             |
| 5 | DELETE | `/wardrobe/items/{id}`                | Delete item                      |
| 6 | GET    | `/wardrobe/items/stats`               | Item count stats                 |
| 7 | POST   | `/wardrobe/uploads`                   | Initiate upload                  |
| 8 | POST   | `/wardrobe/uploads/{id}/confirm`      | Confirm upload, start pipeline   |
| 9 | GET    | `/wardrobe/uploads/{id}`              | Poll upload status               |
| 10| POST   | `/outfits`                            | Create outfit canvas             |
| 11| GET    | `/outfits`                            | List outfit canvases             |
| 12| GET    | `/outfits/{id}`                       | Get single outfit canvas         |
| 13| PUT    | `/outfits/{id}`                       | Update outfit canvas layout      |
| 14| DELETE | `/outfits/{id}`                       | Delete outfit canvas             |
| 15| POST   | `/outfits/{id}/items`                 | Add item to outfit               |
| 16| DELETE | `/outfits/{id}/items/{wardrobeItemId}`| Remove item from outfit          |
| 17| POST   | `/outfits/generate`                   | AI generate outfit               |
| 18| POST   | `/outfits/try-on`                     | Start virtual try-on             |
| 19| GET    | `/outfits/try-on/{jobId}`             | Poll try-on status               |
| 20| GET    | `/outfits/calendar`                   | Get calendar day outfits         |
