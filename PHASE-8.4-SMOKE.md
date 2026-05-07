# Phase 8.4 — Smoke Checklist.

Manual verification recipes for the checkout + orders dashboard frontend.
Run against a backend with at least one paid course and one paid webinar
configured (`_vl_course_price` / `_vl_webinar_price` > 0). LiqPay
credentials should be set to sandbox mode (`VL_LMS_LIQPAY_SANDBOX=true`).

The frontend is a Nuxt 4 SPA (`vl-frontend`). Start it with:

```sh
cd frontend
npm run dev    # http://localhost:3000
```

Phase 8.4 does not introduce a frontend test infrastructure (consistent
with Phase 4.2 / 6.2 / 6.4 deferral). All recipes below are manual.

## 1. Course checkout — happy path

1. Log in as a student account.
2. Open `/courses/[paid-course-slug]`.
3. Verify CourseHero CTA reads **"Купити"** (not "Записатися" or
   "Оплата буде доступна пізніше").
4. Click. Page navigates to `/checkout/[slug]?type=course`.
5. Verify the page renders: course title, instructors line, duration,
   price (matches `_vl_course_price`), and a primary CTA
   "Сплатити через LiqPay".
6. Click "Сплатити через LiqPay".
7. Browser redirects to `liqpay.ua` checkout. Use sandbox-success card
   details.
8. Browser redirects back to `/orders/[uuid]/result`.
9. Verify the loading-spinner state with "Очікуємо підтвердження…".
10. Within ~30 seconds (callback latency), the page transitions to
    "Дякуємо за покупку!" with a "Перейти до курсу" CTA.
11. Click "Перейти до курсу" — `/courses/[slug]` should now show the
    enrolled state in CourseHero (CTA reads "Продовжити навчання").

## 2. Course checkout — sandbox-failure

(Same as 1, but with the sandbox-failure card.)

- Step 9 → page transitions to "Платіж не пройшов" with
  "Спробувати ще раз" CTA.
- Click "Спробувати ще раз" → returns to `/checkout/[slug]?type=course`.

## 3. Webinar checkout — happy path

1. Open `/webinars/[paid-webinar-slug]`.
2. Verify WebinarHero CTA reads **"Купити квиток"** and is enabled (the
   pre-8.4 version had a `disabled: true` paid-blocked tooltip).
3. Click. Page navigates to `/checkout/[slug]?type=webinar`.
4. Verify summary shows the scheduled-start date.
5. Continue through LiqPay (sandbox-success).
6. After redirect-back + callback, the result page shows
   "Дякуємо за покупку!" with "Перейти до вебінару" → goes to
   `/dashboard/webinars/[slug]`.

## 4. Already-enrolled prevention

1. Log in as a user already enrolled in the paid course.
2. Open `/checkout/[paid-course-slug]?type=course` directly.
3. Click "Сплатити через LiqPay".
4. Toast: "Ви вже маєте доступ до цього курсу" (info color).
5. Browser redirects to `/dashboard`.

(For webinars the same flow surfaces "Ви вже зареєстровані на цей
вебінар" and redirects to `/dashboard/webinars`.)

## 5. Polling timeout

1. Log in as a student.
2. Manually craft a `pending` order in the DB without an associated
   successful callback (e.g., `wp_vl_lms_orders` insert via DDEV
   `mysql` cli).
3. Navigate to `/orders/[uuid]/result`.
4. Verify spinner displays.
5. After 60 seconds, page transitions to "Платіж в обробці…" message
   with link "Мої замовлення" → `/dashboard/orders`.

## 6. /dashboard/orders list

1. Log in as a student with at least 3 orders in different statuses.
2. Open `/dashboard/orders`.
3. Verify all orders render with correct status badges, prices, dates.
4. Apply each filter ("Всі", "Активні", "Сплачені", "Скасовані",
   "Прострочені") — verify filtering works.
5. Click an order → navigates to detail page.

## 7. /dashboard/orders/[uuid] detail

1. Open detail page for a paid order.
2. Verify timeline shows: Замовлення створено → Сплачено
   (with correct timestamps).
3. Verify "Перейти до курсу/вебінару" CTA appears (since paid).
4. Open detail for cancelled order — timeline shows Створено → Скасовано.
5. Open detail for refunded order — timeline shows Створено → Сплачено
   → Кошти повернено.
6. Click "Оновити" — refetches the order; the row updates if backend
   state changed.

## 8. Sidebar nav

1. Log in as any user.
2. Open `/dashboard`.
3. Verify "Мої замовлення" appears in the sidebar between
   "Сертифікати" and "Профіль".
4. Click — navigates to `/dashboard/orders`.

## 9. Logout cleanup

1. Open `/dashboard/orders` while logged in.
2. Log out from another tab.
3. Switch back to the first tab.
4. Verify orders list is cleared (or page redirects to `/login`).
5. Log back in — orders re-hydrate.

## 10. CTA promotion verification (free vs paid)

1. Open a *free* course landing — verify CTA reads "Записатися на курс"
   (existing free-course flow).
2. Open a *paid* course landing — verify CTA reads "Купити" (Phase 8.4
   promotion).
3. Open a *free* webinar landing — verify CTA reads "Зареєструватися".
4. Open a *paid* webinar landing — verify CTA reads "Купити квиток"
   and is **enabled** (was disabled in 7.5).
