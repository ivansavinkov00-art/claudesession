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
4. «Обсудить задачу» — callback with a time slot (09–12, 12–15, 15–18, 18–20 Moscow time), added in v2.

## Positioning

Full cycle under one roof, run by a technologist-owner who talks to clients in plain language. Two production modes, deliberately split (user decision 2026-09-24):

- **Опт и маркетплейсы** — WB and OZON sellers and wholesale, **from 300 units**; "second layer" garments: dresses, shirts, trousers, shorts, hoodies, sweatshirts, zip hoodies.
- **Экспериментальный цех** — any sample in 2–3 days; small batches for brands. Minimum batch is **undecided** (brief contradicts itself: §10 says "from 100 units", §7 says brand orders can be ~10) → shown as `[уточнить минимум]`, never invented.

## Four client types (v2)

The home page speaks to four kinds of customer. The first three come from the brief (block 3); the fourth is the second production mode. Each has a row in the «Задачи» screen and a preselected direction in the quiz.

| # | Client | Task | What we offer | Quiz direction |
|---|---|---|---|---|
| 01 | Селлеры WB и OZON | Sew a batch for a delivery date and not miss it | Wholesale from 300 units, labels, composition tags, packaging per spec, shipping by any carrier | `wb` «Партия для WB и OZON» |
| 02 | Бренды одежды | Launch a collection and grow without changing production | Patterns, sample, sewing, a technologist who explains every stage; small batches from `[уточнить минимум]` | `brand` «Коллекция бренда» |
| 03 | Бизнес: опт и СТМ | Stable volume and deadlines for years | Own workshop, regulated processes, QC; the same quality from batch to batch | `opt` «Опт и СТМ» |
| 04 | Экспериментальный цех | Check model, fit and fabric before a batch | Any sample in 2–3 days, including non-standard models and sizes | `sample` «Образец» |

**Why row 04 is «Экспериментальный цех» and not «Индивидуальный пошив».** The brief's second direction is «any sample in 2–3 days and small batches for brands». «Индивидуальный пошив» attracts private persons with single orders, and the brief explicitly asks to filter those out.

## Home page structure (v2)

Logic: what this is → why the production can be trusted → who answers personally → what we sew → which task is yours → calculate → get in touch. Screens 2 and 3A carry trust and have no buttons; the rest carry an action.

| # | Screen | id | Essence | Image slots |
|---|---|---|---|---|
| 1 | First screen | — | summary: who, what, for whom, three figures (10+ лет, 2–3 дня, 1 цех), two actions | 01 |
| 2 | Производство | `#proizvodstvo` | full cycle in one workshop, four accent facts | 02 |
| 3A | Основатель | `#osnovatel` | Olesya Aksenova, technologist, leads the client by the hand | 03 |
| 3B | Что мы шьём | `#portfolio` | second-layer clothing, 3D carousel of six garments | 04–09 |
| seam | Нестандартные размеры | — | strip that leads to the quiz with «non-standard sizes» ticked | — |
| 4 | Задачи | `#zadachi` | the four client types above, hover list with a picture | 10–13 |
| 5 | От идеи до реализации | `#raschet` | five-step order path and the four-step quiz | thumbnails 04–09 |
| 6 | Финал | — | «Скачать прайс» and «Обсудить задачу» | — |
| — | Подвал | `#kontakty` | contacts, documents | — |

Every «Рассчитать стоимость» (first screen, tape, sticky button, menu, carousel cards, task list, seam) leads to the quiz in `#raschet`; the preselection travels in `data-calc-direction`, `data-calc-item`, `data-calc-nonstandard`. On inner Tilda pages the same quiz opens as a popup.

## Operating Context

- Work is done on **давальческое сырьё** (client-supplied fabric).
- Full cycle: design & patterns (конструкторское бюро) → sample → batch sewing → quality control (ОТК) → labels, composition tags, any packaging per client spec → shipping by any transport company across Russia.
- Extra services: DTF printing, embroidery.
- Leads should go to the manager's e-mail + a Telegram bot (production concern; prototype only marks a TODO).
- Existing channels: VK https://vk.ru/24poshiv7, Instagram poshiv24_7. Domain: aksenovasew.ru. Phone: +7 999 588-88-04.

## Capabilities and Constraints

- The quiz must steer orders under 300 units away from the wholesale flow **without losing brands**: under 300 in «Партия для WB и OZON» or «Опт и СТМ» is a calm hint with a «Переключить» button to «Коллекция бренда», not an error. For «Образец» the quantity field is replaced by «Сколько моделей». One quiz with a direction choice answers the brief's question about two calculators: different prices are different directions inside one form, and the price itself is calculated by a technologist after the visitor leaves contacts.
- Personal-data consent (152-ФЗ, separate consent document required since 2025-09-01): separate unchecked checkbox, links to both «Согласие на обработку персональных данных» and «Политика конфиденциальности».
- Required site sections (future pages): Главная, Услуги, Портфолио, Производство, Прайс с калькулятором, Контакты, Политика. Only the home page is in scope now; «Портфолио» is now a real screen of the home page (`#portfolio`).
- Undecided facts (must stay marked `[уточнить]`): brand/experimental minimum batch, response time for a calculation, fabric sourcing/consultation option, callback working hours, legal requirements (реквизиты), real photos, capacity numbers.

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
- **Absent, must not be fabricated:** client count, capacity/volume per month, lead times beyond "sample in 2–3 days", testimonials, client logos, prices, case studies. The owner's quote is the last sentence of the customer's own text 3 («Приходите с идеей…»); the wording still needs the customer's confirmation.

## Product Principles

1. **Qualify, don't reject.** Every path sorts a visitor into wholesale or experimental; nobody hits a dead end.
2. **One window.** Show the full cycle as one continuous sequence owned by one production.
3. **Predictability is the product.** Concrete facts (300 units, 2–3 days, ОТК, 10+ years) over adjectives.
4. **A technologist talking.** Plain, specific language; no marketing superlatives.
5. **Transferable by construction.** Anything built here must survive being rebuilt by hand in Tilda.

## Accessibility & Inclusion

WCAG AA contrast minimum, visible focus, touch targets ≥44px, Russian alt text, `prefers-reduced-motion` respected, correct Russian typography (lang="ru", non-breaking spaces, «ёлочки», ё).
