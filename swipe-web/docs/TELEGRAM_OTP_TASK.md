# Task: Replace SMS OTP with Telegram Bot OTP

## Background

Authentication currently uses a custom SMS OTP flow costing ~150 UZS (~$0.0125) per message.  
Target: **$0 per authentication** by delivering OTP codes via Telegram Bot.  
Since 100% of target users (Uzbekistan) have Telegram, this is a zero-friction change for end users.

---

## Current Flow (to replace)

```
Mobile → POST /api/v1/auth/otp/send { phoneNumber }
       ← { success, message, data: { expires_in_seconds } }
Backend → SMS provider → user receives SMS with code
Mobile → POST /api/v1/auth/otp/verify { phoneNumber, otpCode }
       ← { access_token, refresh_token, token_type, expires_in, user }
```

### Current DB/Cache record (inferred)
```
otp_session {
  phone_number: string
  otp_code: string        # 6-digit
  expires_at: datetime
}
```

---

## Target Flow

```
Mobile → POST /api/v1/auth/otp/send { phoneNumber }
       ← { success, message, data: { telegram_link, expires_in_seconds } }
Mobile → opens https://t.me/YOUR_BOT?start=SESSION_TOKEN via url_launcher
User   → taps Start in Telegram
Bot    ← Telegram sends webhook: /start SESSION_TOKEN
Bot    → saves telegram_chat_id to session
Bot    → sends "Your Svayp code: XXXXXX" to user in Telegram chat
User   → comes back to app, enters code
Mobile → POST /api/v1/auth/otp/verify { phoneNumber, otpCode }   ← UNCHANGED
       ← { access_token, ... }                                    ← UNCHANGED
```

The verify endpoint and its response contract do **not change**.  
Only `/auth/otp/send` response shape changes, and a new Telegram bot handler is added.

---

## Backend Tasks

### Step 0 — Register the Bot (manual, do once)
1. Open Telegram, message `@BotFather`
2. Run `/newbot`, set name (e.g. `Svayp Auth Bot`) and username (e.g. `@SvaypAuthBot`)
3. Save the `BOT_TOKEN`
4. Store as environment variable: `TELEGRAM_BOT_TOKEN`
5. Also store bot username: `TELEGRAM_BOT_USERNAME=SvaypAuthBot`

---

### Step 1 — Update OTP Session Model

Add two fields to the existing OTP session store (Redis key or DB table):

```
otp_session {
  session_token: UUID         # NEW — primary key for Telegram lookup
  phone_number: string
  otp_code: string
  expires_at: datetime
  telegram_chat_id: int|null  # NEW — set when user opens bot
}
```

If using Redis, store as a hash keyed by `otp:session:{session_token}` with TTL of 300 seconds.  
Also keep a secondary index `otp:phone:{phone_number}` → `session_token` for rate limiting.

---

### Step 2 — Modify `POST /api/v1/auth/otp/send`

#### Request (unchanged)
```json
{ "phoneNumber": "+998901234567" }
```

#### New logic
1. Normalize phone number (strip spaces, dashes, parens) — already done in existing code
2. **Rate limit check**: if phone has had ≥ 3 send requests in the last 10 minutes → return `429 Too Many Requests`
3. Generate `session_token = UUID v4`
4. Generate `otp_code = random 6-digit string` (zero-padded)
5. Store session with TTL 300s (5 minutes):
   ```
   session_token → { phone_number, otp_code, expires_at, telegram_chat_id: null }
   ```
6. **Do NOT send SMS**
7. Return:

```json
{
  "success": true,
  "message": "Please open Telegram to receive your code",
  "data": {
    "telegram_link": "https://t.me/SvaypAuthBot?start=SESSION_TOKEN_HERE",
    "expires_in_seconds": 300
  }
}
```

#### Rate limiting implementation (simple, no extra deps)
```
key: rate_limit:otp:{phone_number}
value: counter (increment on each send)
TTL: 600 seconds (10 minutes)
Reject if counter > 3
```

---

### Step 3 — Add Telegram Bot Webhook Handler

#### Set up webhook (do once on deploy)
```
POST https://api.telegram.org/bot{BOT_TOKEN}/setWebhook
Body: { "url": "https://app.svaypai.com/api/v1/telegram/webhook" }
```

#### New endpoint: `POST /api/v1/telegram/webhook`

This endpoint receives all Telegram updates. It should:
1. Validate the request comes from Telegram (check `X-Telegram-Bot-Api-Secret-Token` header if you set one during webhook registration — recommended)
2. Parse the update JSON
3. Handle only `message` updates where `text` starts with `/start`
4. Extract `SESSION_TOKEN` from `/start SESSION_TOKEN`
5. Look up session by `session_token`
6. If not found or expired → send user: "This link has expired. Please request a new code in the app."
7. If found:
   - Save `telegram_chat_id = update.message.from.id` into the session
   - Send OTP via Telegram API:
     ```
     POST https://api.telegram.org/bot{BOT_TOKEN}/sendMessage
     Body: {
       "chat_id": telegram_chat_id,
       "text": "Your Svayp code: *XXXXXX*\n\nDo not share this code with anyone.",
       "parse_mode": "Markdown"
     }
     ```
8. Return HTTP 200 to Telegram (always, even on errors — Telegram retries otherwise)

#### Security note
The webhook endpoint must be **unauthenticated** (Telegram calls it), but validate the secret token:
```
When registering: POST /setWebhook with "secret_token": "YOUR_RANDOM_SECRET"
On each request: check header X-Telegram-Bot-Api-Secret-Token == YOUR_RANDOM_SECRET
```
Store `TELEGRAM_WEBHOOK_SECRET` as an environment variable.

---

### Step 4 — Modify `POST /api/v1/auth/otp/verify`

#### Request (unchanged)
```json
{ "phoneNumber": "+998901234567", "otpCode": "123456" }
```

#### Change to lookup logic
Currently the lookup is probably `WHERE phone_number = ? AND otp_code = ?`.  
No change needed if you can still do that lookup. If you moved to session-token-keyed storage, also add a secondary index on `phone_number` → `session_token` so verify can find the record.

Everything else in `/verify` (JWT generation, user creation/lookup, response shape) stays the same.

---

### Step 5 — Environment Variables to Add

```env
TELEGRAM_BOT_TOKEN=<from BotFather>
TELEGRAM_BOT_USERNAME=SvaypAuthBot
TELEGRAM_WEBHOOK_SECRET=<random 32-char string you generate>
```

---

## Mobile Tasks (for mobile dev — separate ticket)

These are **small** changes needed to consume the new API response.

### 1. Update `MessageResponse` model
**File:** `svayp_mobile/lib/features/auth/data/models/auth_models.dart`

Add `telegramLink` field to `MessageResponse`:
```dart
final String? telegramLink;
```
In `MessageResponse.fromJson`, parse it from `data['telegram_link']`.

### 2. Update `phone_auth_screen.dart`
**File:** `svayp_mobile/lib/features/auth/presentation/screens/phone_auth_screen.dart`

After `await _authService.sendOTP(phoneNumber)` succeeds, if `response.telegramLink != null`:
```dart
await launchUrl(Uri.parse(response.telegramLink!), mode: LaunchMode.externalApplication);
```
`url_launcher` is already imported in this file.

### 3. Update `otp_verification_screen.dart`
**File:** `svayp_mobile/lib/features/auth/presentation/screens/otp_verification_screen.dart`

- Accept `telegramLink` as a constructor parameter (passed alongside `phoneNumber`)
- Add a small instruction label: "Open Telegram → tap Start → enter the code"
- Add a secondary button "Open Telegram again" that re-launches the link (for users who accidentally closed it before the code arrived)

### 4. Localization strings to add
All three ARB files (`app_en.arb`, `app_uz.arb`, `app_ru.arb`):
```
"telegramOtpInstruction": "Open Telegram → tap Start → enter the code"
"openTelegramAgain": "Open Telegram again"
```

---

## Acceptance Criteria

- [ ] `POST /auth/otp/send` returns `telegram_link` in `data`, sends no SMS
- [ ] Opening the Telegram link delivers the OTP code as a bot message
- [ ] `POST /auth/otp/verify` still works with the same request/response shape
- [ ] A phone number can only request OTP 3 times in 10 minutes (test: 4th request returns 429)
- [ ] OTP session expires after 300 seconds (test: verify with an old code returns 401/400)
- [ ] Expired/invalid session token in Telegram bot replies with a graceful message
- [ ] Webhook rejects requests missing the secret token header (returns 403)

---

## What Does NOT Change

- `POST /api/v1/auth/otp/verify` — request body, response shape, JWT logic
- `POST /api/v1/auth/token/refresh`
- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/admin/login` (partner login — different flow, uses username/password)
- Any other endpoint

---

## Notes

- OTP code length is **6 digits** (confirmed from mobile `otp_verification_screen.dart` validation: `otpCode.length != 6`)
- The mobile app already has a 60-second client-side resend cooldown — the new server-side rate limit (3 per 10 min) provides a separate abuse layer
- If in the future you need an SMS fallback, add an optional `?channel=sms` query param to `/auth/otp/send` and keep the old SMS path behind it