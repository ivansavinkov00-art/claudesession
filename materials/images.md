# Картинки — v2: слоты и промпты для Nano Banana

## Как это работает

1. На странице 13 нумерованных слотов: `assets/img/img-01.webp` … `img-13.webp`. Пока картинки нет, стоит заглушка с крупным номером. Добавь `?slots` к адресу страницы, и на каждой картинке появится её номер.
2. Генерируешь картинку по промпту ниже. Промпты на английском, потому что Nano Banana точнее понимает английский. Строка «Что получить» написана по-русски, чтобы было с чем сверить результат.
3. Кладёшь файл в папку `incoming/` репозитория. Номер слота ставишь в начало имени: `03.png`, `07-platye.jpg`. Пишешь в сессию Claude Code: «Новые картинки в incoming». Он сам кадрирует, сожмёт, поставит и покажет скриншот.

**Пропорции:** выбери их в настройках генерации, если там есть такая опция. Если опции нет, пропорции уже указаны в тексте промпта. Если модель не выдаёт нужные пропорции, генерируй шире: Claude Code обрежет.
**Размер:** генерируй в максимальном качестве (2K/4K в Pro-версии). Минимум по длинной стороне указан в таблице. Если картинка меньше минимума, увеличь её апскейлером до отправки.

## Слоты

| № | Где | Пропорции | Минимум | Безопасная зона |
|---|---|---|---|---|
| 01 | Экран 1, арка | 4:5 | 1600×2000 | верх срежет полукруг: главное в нижних ⅔, по центру |
| 02 | Экран 2, цех слева | 4:5 (на мобильном кадрируем в 3:2) | 1600×2000 | центр кадра |
| 03 | Экран 3A, Олеся | 4:5 | 1200×1500 | лицо в верхней трети, по центру |
| 04–09 | Экран 3B, карусель | 3:4 | 1200×1600 | изделие по центру, воздух сверху и снизу |
| 10–13 | Экран 4, задачи | 4:5 (на мобильном 3:2) | 1200×1500 | центр кадра |

Сейчас в слоте 01 временно стоит фото из v1 (руки и машинка), в слоте 02 тоже фото из v1 (цех). Остальные слоты пока заглушки.

## Общий стиль — добавляй в конец каждого промпта

```
Documentary editorial photograph for a premium craft sewing studio. Warm natural daylight from a large window, soft directional shadows. Palette: linen beige, milk white, warm graphite, chocolate brown, muted clay-terracotta and olive accents. Natural cotton, linen and knit textures, real imperfections, subtle film grain. 50mm lens, f/2.8, true-to-life colors, slightly warm white balance. No text, no logos, no brand labels, no watermarks, no neon, no cold blue light, no glossy gold, no glitter, no vintage filter, no plastic-looking skin.
```

---

## 01 — Первый экран, арка

**Что получить:** крупный план: руки ведут ткань под лапкой промышленной машины, видна ровная строчка. Движение ткани направлено влево, к заголовку: так взгляд ведёт от фото к тексту и кнопке.

```
Close-up of a seamstress's hands guiding sand-beige cotton twill under the presser foot of an industrial lockstitch sewing machine; the needle is mid-stitch and a neat straight seam runs across the fabric. The fabric and the seam line flow diagonally toward the left edge of the frame. Sharp focus on the needle and fingertips, the machine body softly out of focus at the top. Vertical 4:5 composition, main subject in the lower two thirds and centered, calm uncluttered background.
```

## 02 — Экран 2, цех

**Что получить:** небольшой аккуратный цех при дневном свете: машины в два ряда, раскройный стол с лекалами, стойка с готовыми изделиями. Люди видны со спины или не в фокусе. Не «завод-конвейер».

```
Interior of a small, tidy sewing workshop in daylight: two rows of industrial sewing machines, a large cutting table with brown paper patterns and tailor's chalk in the foreground, a rolling rack with finished hoodies and shirts in neutral tones, bolts of natural fabric on shelves, plastered or brick walls and tall windows. Three or four seamstresses at work, seen from behind or in soft focus, faces not recognizable. Orderly and calm, a modern craft workshop, not a giant factory or a conveyor line. Vertical 4:5, eye level, depth from the foreground table to the windows.
```

> Этот кадр подписан «наш цех». Когда появится реальное фото цеха, лучше поставить его.

## 03 — Экран 3A, Олеся Аксенова

**Только по её настоящему фото.** Загрузи фото Олеси в Nano Banana и попроси поменять только фон и свет. Если фото пока нет, слот остаётся заглушкой. Не генерируй «похожую женщину»: на сайте это конкретный человек с именем, и выдуманное лицо обманет клиентов.

```
Use the attached photo as the only reference for the person: keep her face, facial features, age, skin, hairstyle and body exactly as they are; do not beautify or alter her identity. Change only the setting and light: waist-up portrait of her standing at a cutting table in a sewing workshop, a measuring tape around her neck, one hand resting on a paper pattern, looking at the camera with a calm, friendly half-smile. Plain knit top in milk or sand tone. Background: softly blurred workshop with fabric bolts and a dress form. Vertical 4:5, face in the upper third, centered.
```

---

## 04–09 — Экран 3B, карусель «Что мы шьём»

Это **серия**: у всех шести кадров должны совпадать фон, свет, вешалка и ракурс. Генерируй все шесть подряд в одном чате. Первую удачную картинку прикладывай к следующим промптам как референс и допиши: «same backdrop, light, hanger and framing as the reference image».

Начало промпта — одинаковое для всех шести:

```
Catalog photo, one garment only, hung on a light natural-wood hanger against a seamless linen-beige paper backdrop, front view, perfectly centered, generous empty space above and below, soft warm daylight from the left with a gentle shadow on the backdrop. Visible quality construction: clean seams, even topstitching, neat ribbing. No brand logos, no prints, no people, no mannequin. Vertical 3:4.
```

Потом добавь строку изделия, а в конце общий стиль.

| № | Изделие | Строка изделия |
|---|---|---|
| 04 | Худи и зип-худи | `Garment: a heavyweight cotton-fleece pullover hoodie in warm sand color, kangaroo pocket, ribbed cuffs and hem, drawstrings.` |
| 05 | Свитшоты | `Garment: a crew-neck cotton sweatshirt in milk-ecru color with raglan sleeves and a ribbed neckline.` |
| 06 | Рубашки | `Garment: a relaxed-fit cotton poplin shirt in muted sage-olive, fully buttoned, classic collar, one chest pocket.` |
| 07 | Платья | `Garment: a midi linen dress in muted clay-terracotta with short sleeves and a waist tie, fabric falling in soft folds.` |
| 08 | Брюки | `Garment: wide-leg pleated trousers in chocolate-brown cotton twill, hung by the waistband on a wooden clip hanger.` |
| 09 | Шорты | `Garment: knee-length cotton shorts in warm graphite with a drawstring waist, hung by the waistband on a wooden clip hanger.` |

---

## 10–13 — Экран 4, задачи клиента

### 10 — Селлерам WB и OZON

**Что получить:** готовая партия упакована к отправке: пакеты, бирки, коробки. Много одинаковых единиц. Логотипов маркетплейсов и читаемого текста в кадре нет.

```
Garments packed and ready for shipping: folded sand and graphite hoodies in clear polybags with blank white size stickers and small sewn-in composition labels, stacked neatly in open kraft cardboard boxes on a workshop table; a tape dispenser and a stack of flat boxes nearby. Orderly, many identical units, a finished batch. No readable text, no marketplace logos. Vertical 4:5, three-quarter top view.
```

### 11 — Брендам одежды

**Что получить:** основательница бренда и технолог обсуждают образец на манекене. Руки, эскиз, образцы ткани. Лица в кадре не главные.

```
A clothing brand founder and a technologist, two women in their thirties, discuss a sample dress on a dress form in a bright workshop; one pins the shoulder seam, the other holds a sketch; fabric swatches, a paper pattern and a measuring tape on the table in the foreground. Faces turned away or partly out of frame, focus on hands and the garment. Collaborative and calm. Vertical 4:5.
```

### 12 — Бизнесу: опт и СТМ

**Что получить:** длинная стойка с одинаковыми рубашками одного цвета разных размеров. Ощущение стабильного объёма и порядка, но это средний цех, а не гигантская фабрика.

```
A long rolling rack in a bright workshop holding a batch of identical cotton shirts in the same muted olive color, graded sizes, perfectly aligned on identical wooden hangers; beyond it, bundles of cut fabric pieces tied and tagged on a shelf. Stable volume, order and consistency; a mid-size workshop, not a giant factory. Vertical 4:5, slight perspective along the rack.
```

### 13 — Экспериментальный цех

**Что получить:** стол конструктора: лекала, линейка, мел, булавки. Рука чертит линию, на заднем плане образец на манекене.

```
Close-up of a pattern-making table: brown paper patterns, a pattern-master ruler, tailor's chalk, a pencil, dressmaker's pins and scissors; a hand draws a line on the pattern; in the soft background a half-finished sample garment pinned on a dress form. Precise, hands-on, experimental. Vertical 4:5.
```

---

## Что проверить до отправки

- Руки и пальцы: их количество, форма и то, как пальцы держат ткань. ИИ чаще всего ошибается именно здесь.
- Игла, лапка и нить машины, молнии, пуговицы и петли должны выглядеть как настоящие.
- На бирках, пакетах и коробках нет текста и логотипов.
- Серия 04–09 выглядит как одна съёмка.
- Нет холодного синего света, глянца и «пластиковой» кожи.
