# Источники

С v2 картинки стоят в 13 нумерованных слотах: `assets/img/img-01.webp` … `img-13.webp` (описание слотов — `materials/images.md`, таблица статусов — README). Происхождение каждого файла записано рядом, в `img-NN.webp.json`.

## Слоты

| Слот | Файл | Статус | Источник | Лицензия |
|---|---|---|---|---|
| 01 | `assets/img/img-01.webp` | временное фото v1 | копия `hero-arch.webp`: shoreline vehicles, [Pexels 30902519](https://www.pexels.com/photo/close-up-of-sewing-machine-stitching-fabric-30902519/) | [Pexels License](https://www.pexels.com/license/) |
| 02 | `assets/img/img-02.webp` | временное фото v1 | `workshop.webp`, кадр 4:5: cottonbro studio, [Pexels 4621656](https://www.pexels.com/photo/white-textile-on-brown-brick-wall-4621656/) | [Pexels License](https://www.pexels.com/license/) |
| — | `assets/img/hero-card.webp` | временное сток-фото | карточка поверх арки на первом экране: Berna, [Pexels 35009418](https://www.pexels.com/photo/stack-of-folded-fabrics-in-neutral-tones-35009418/), кадр 4:5, 640×800 | [Pexels License](https://www.pexels.com/license/) |
| 03 | `assets/img/img-03.webp` | фото заказчицы | Портрет Олеси Аксеновой, прислан заказчицей 2026-10-01; кадр 4:5, WebP q80, без ИИ | права на публикацию подтвердить с заказчицей |
| 04–09 | `assets/img/img-04.webp` … `img-09.webp` | временное AI-фото | Higgsfield, модель nano_banana_2 (1k), 2026-09-30; одежда на деревянной вешалке, без людей и логотипов; уменьшено до 480×640, WebP q62–64 | условия Higgsfield |
| 10 | `assets/img/img-10.webp` | временное сток-фото | `_v1/dir-opt.webp`: Berna, [Pexels 35009418](https://www.pexels.com/photo/stack-of-folded-fabrics-in-neutral-tones-35009418/), кадр 4:5 | [Pexels License](https://www.pexels.com/license/) |
| 11 | `assets/img/img-11.webp` | временное сток-фото | `_v1/stitch.webp`: Jahra Tasfia Reza, [Pexels 33706427](https://www.pexels.com/photo/close-up-of-sewing-machine-needle-in-action-33706427/), кадр 4:5 | [Pexels License](https://www.pexels.com/license/) |
| 12 | `assets/img/img-12.webp` | временное сток-фото | другой кадр `workshop.webp`: cottonbro studio, [Pexels 4621656](https://www.pexels.com/photo/white-textile-on-brown-brick-wall-4621656/) | [Pexels License](https://www.pexels.com/license/) |
| 13 | `assets/img/img-13.webp` | временное сток-фото | `_v1/dir-exp.webp`: Metin Ozer, [Unsplash SjnR2gN5lwU](https://unsplash.com/photos/a-person-drawing-on-a-clothing-pattern-SjnR2gN5lwU), кадр 4:5 | [Unsplash License](https://unsplash.com/license) |

Когда слот получает картинку из `incoming/`, строка меняется на «сгенерировано в Nano Banana, дата» (или «фото заказчика»).

## Фото v1

| Файл | Где было в v1 | Автор | Источник | Лицензия |
|---|---|---|---|---|
| `assets/img/hero-arch.webp` | Первый экран, арка → исходник слота 01 | shoreline vehicles | [Pexels 30902519](https://www.pexels.com/photo/close-up-of-sewing-machine-stitching-fabric-30902519/) | [Pexels License](https://www.pexels.com/license/) |
| `assets/img/workshop.webp` | «Собственный цех» → исходник слота 02 | cottonbro studio | [Pexels 4621656](https://www.pexels.com/photo/white-textile-on-brown-brick-wall-4621656/) | [Pexels License](https://www.pexels.com/license/) |
| `assets/img/_v1/dir-opt.webp` | «Маркетплейсы и опт» (в v2 не используется) | Berna | [Pexels 35009418](https://www.pexels.com/photo/stack-of-folded-fabrics-in-neutral-tones-35009418/) | [Pexels License](https://www.pexels.com/license/) |
| `assets/img/_v1/dir-exp.webp` | «Экспериментальный цех» (в v2 не используется) | Metin Ozer | [Unsplash SjnR2gN5lwU](https://unsplash.com/photos/a-person-drawing-on-a-clothing-pattern-SjnR2gN5lwU) | [Unsplash License](https://unsplash.com/license) |
| `assets/img/_v1/stitch.webp` | «Полный цикл», липкое фото (в v2 не используется) | Jahra Tasfia Reza | [Pexels 33706427](https://www.pexels.com/photo/close-up-of-sewing-machine-needle-in-action-33706427/) | [Pexels License](https://www.pexels.com/license/) |

Обработка: кадрирование и WebP (sharp, q78). Обе лицензии разрешают коммерческое использование без указания автора, но указать всё же вежливо.

## Шрифты

| Шрифт | Автор | Лицензия | Откуда |
|---|---|---|---|
| Playfair Display (вариативный, 400–900, обычный и курсив) | Claus Eggers Sørensen | SIL Open Font License 1.1 | `@fontsource-variable/playfair-display`, woff2 cyrillic + latin |
| Onest (вариативный, 100–900) | Onest (Sergey Kovalev и команда), Gazprom-Media-Digital | SIL Open Font License 1.1 | `@fontsource-variable/onest`, woff2 cyrillic + latin |
| IBM Plex Mono 400, 500 (только ярлыки, с v3) | IBM, Mike Abbink, Bold Monday | SIL Open Font License 1.1 | `@fontsource/ibm-plex-mono`, woff2 cyrillic + latin |

Шрифты лежат в `assets/fonts/` (self-hosted). Latin-файлы Playfair и Onest урезаны до ASCII, ёлочек, тире, точки-разделителя и ₽ (`tools/subset-fonts.sh`, −45 КБ); кириллица целиком. Cormorant из проекта удалён. В Тильде все три есть в библиотеке Google Fonts, их можно подключить оттуда.

## Логотип

`assets/logo/logo-mark.svg` — векторизация швейной машинки с присланного логотипа (potrace, `tools/logo.mjs`). Надпись на табличке набрана шрифтом сайта. Для печати и вывесок нужен оригинальный вектор от заказчика.
