# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Static HTML/CSS + minimal vanilla JS, no framework, no build step (user decision via PROMPT.md). This is a design prototype for client approval; the production site will be assembled on Tilda, so every layout, motion and fixed element must be reproducible in a Tilda Zero Block (12-col grid, 1200px container, breakpoints 1200 / 960 / 640 / 480 / 320). All assets local, no CDNs. Forms do not submit anywhere.

## Users

B2B, all of Russia. Three confirmed personas (brief, block 3):

1. **Owner of a starting clothing brand** — 28–42, ~70% women, large cities with a fashion scene (Moscow, St Petersburg, Yekaterinburg, Kazan, Novosibirsk, Krasnodar). Has 300 000–1 500 000 ₽ starting capital, a niche, maybe patterns. Job: find a production that will not cheat them.
2. **Growing brand that is scaling** — 30–48, ~80% women, regions across Russia, revenue 3–15 M ₽/yr. Has sewn collections for 2–3 years across small workshops and home seamstresses; tired of missed deadlines and uneven quality. Job: hand the whole volume to one reliable production.
3. **Wholesaler / retailer / private label (СТМ)** — 35–55, 50/50, million-plus cities, companies with 50 M ₽+/yr turnover. Job: find a production that holds stable volumes and deadlines for years.

Devices: phone and desktop, equally.

## Product Purpose

«Культура шитья» — a sewing production in Chelyabinsk (owner and technologist: Олеся Сергеевна Аксенова). The site exists to generate **qualified B2B leads** from clothing brands and wholesale clients (organic + paid traffic), to **filter out non-target requests** (private persons with one-off orders), and to demonstrate production capacity and expertise to build trust.

Success = leads arrive, leads are B2B not private persons, the site pays for itself.

Target actions, in order:
1. «Рассчитать стоимость» — calculation request form (item type, quantity, fabric, deadline, name + phone/e-mail). Must be reachable on every page, including as a floating button.
2. «Скачать прайс» — price list PDF in exchange for phone/e-mail.
3. Direct contact via phone, WhatsApp, Telegram, Max.
(Brief also mentions callback with a time slot — not in this prototype.)

## Positioning

Full cycle under one roof, run by a technologist-owner who talks to clients in plain language. Two production modes, deliberately split (user decision 2026-09-24):

- **Опт и маркетплейсы** — WB and OZON sellers and wholesale, **from 300 units**; "second layer" garments: dresses, shirts, trousers, shorts, hoodies, sweatshirts, zip hoodies.
- **Экспериментальный цех** — any sample in 2–3 days; small batches for brands. Minimum batch is **undecided** (brief contradicts itself: §10 says "from 100 units", §7 says brand orders can be ~10) → shown as `[уточнить минимум]`, never invented.

## Operating Context

- Work is done on **давальческое сырьё** (client-supplied fabric).
- Full cycle: design & patterns (конструкторское бюро) → sample → batch sewing → quality control (ОТК) → labels, composition tags, any packaging per client spec → shipping by any transport company across Russia.
- Extra services: DTF printing, embroidery.
- Leads should go to the manager's e-mail + a Telegram bot (production concern; prototype only marks a TODO).
- Existing channels: VK https://vk.ru/24poshiv7, Instagram poshiv24_7. Domain: aksenovasew.ru. Phone: +7 999 588-88-04.

## Capabilities and Constraints

- Calculator must steer orders under 300 units away from the wholesale flow **without losing brands**: under 300 in "Опт" is a hint + switch to "Экспериментальный цех", not an error.
- Personal-data consent (152-ФЗ, separate consent document required since 2025-09-01): separate unchecked checkbox, links to both «Согласие на обработку персональных данных» and «Политика конфиденциальности».
- Required site sections (future pages): Главная, Услуги, Портфолио, Производство, Прайс с калькулятором, Контакты, Политика. Only the home page is in scope now; «Портфолио» is a `#` stub.
- Undecided facts (must stay marked `[уточнить]`): brand/experimental minimum batch, response time for a calculation, fabric sourcing/consultation option, legal requirements (реквизиты), real photos, capacity numbers.

## Brand Commitments

- Name: «Культура шитья». Existing logo: sewing-machine silhouette in a white circle + «КУЛЬТУРА ШИТЬЯ» in a rectangular plate, on a watercolor/gold background (`materials/logo.jpg`). The mark stays; the watercolor, gold and splashes are dropped because they violate the brief's own antipathies.
- Voice: calm and expert — "a technologist explaining things like a person". No pathos, no «лучшие», «лидеры», «уникальный подход».
- Style direction requested by client: "тёплый минимализм / крафт-премиум" — cozy but not "home handicraft". Text dark graphite/chocolate, never pure black.
- Antipathies (binding): acid/neon, aggressive pure red, hard black-and-white monochrome, "baby" pastels, glossy gold, glitter, "rich" gradients, handwritten script fonts.
- Anti-references: home-handicraft imagery (needles, spools, buttons clip-art, knitting with tea), the generic AI landing page, mass-production "conveyor of hundreds of workers" imagery.
- WB and OZON are mentioned in text only, never as logos.

## Evidence on Hand

- Facts: 10+ years, own workshop, regulated processes, ОТК; sample in 2–3 days; wholesale from 300 units; owner is a technologist.
- No real photos of the workshop yet → stock placeholders (Unsplash/Pexels), to be replaced; see README slot table.
- **Absent, must not be fabricated:** client count, capacity/volume per month, lead times beyond "sample in 2–3 days", testimonials, client logos, prices, case studies. The owner quote is paraphrased from the brief and marked `[согласовать]`.

## Product Principles

1. **Qualify, don't reject.** Every path sorts a visitor into wholesale or experimental; nobody hits a dead end.
2. **One window.** Show the full cycle as one continuous sequence owned by one production.
3. **Predictability is the product.** Concrete facts (300 units, 2–3 days, ОТК, 10+ years) over adjectives.
4. **A technologist talking.** Plain, specific language; no marketing superlatives.
5. **Transferable by construction.** Anything built here must survive being rebuilt by hand in Tilda.

## Accessibility & Inclusion

WCAG AA contrast minimum, visible focus, touch targets ≥44px, Russian alt text, `prefers-reduced-motion` respected, correct Russian typography (lang="ru", non-breaking spaces, «ёлочки», ё).
