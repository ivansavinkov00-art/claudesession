// Слоты картинок v2 — единый источник для tools/placeholders.mjs и tools/incoming.mjs.
// Файл слота: assets/img/img-NN.webp (+ img-NN.webp.json с происхождением).
// Пропорции, минимумы и безопасные зоны — из materials/images.md.
// position — куда прижимать кадр при кадрировании (sharp: north | centre | south):
//   01 — арка срезает верх полукругом, главное в нижних ⅔ → south
//   03 — лицо в верхней трети → north
export const SLOTS = [
  { n: '01', label: 'Первый экран, арка',     where: 'Экран 1, арка',                 ratio: [4, 5], size: [1600, 2000], position: 'south' },
  { n: '02', label: 'Цех',                     where: 'Экран 2, фото цеха',            ratio: [4, 5], size: [1600, 2000], position: 'centre' },
  { n: '03', label: 'Олеся Аксенова',          where: 'Экран 3A, портрет в окне',      ratio: [4, 5], size: [1200, 1500], position: 'north' },
  { n: '04', label: 'Худи и зип-худи',         where: 'Экран 3B, карусель, карточка 01', ratio: [3, 4], size: [1200, 1600], position: 'centre' },
  { n: '05', label: 'Свитшоты',                where: 'Экран 3B, карусель, карточка 02', ratio: [3, 4], size: [1200, 1600], position: 'centre' },
  { n: '06', label: 'Рубашки',                 where: 'Экран 3B, карусель, карточка 03', ratio: [3, 4], size: [1200, 1600], position: 'centre' },
  { n: '07', label: 'Платья',                  where: 'Экран 3B, карусель, карточка 04', ratio: [3, 4], size: [1200, 1600], position: 'centre' },
  { n: '08', label: 'Брюки',                   where: 'Экран 3B, карусель, карточка 05', ratio: [3, 4], size: [1200, 1600], position: 'centre' },
  { n: '09', label: 'Шорты',                   where: 'Экран 3B, карусель, карточка 06', ratio: [3, 4], size: [1200, 1600], position: 'centre' },
  { n: '10', label: 'Селлерам WB и OZON',      where: 'Экран 4, задача 01',            ratio: [4, 5], size: [1200, 1500], position: 'centre' },
  { n: '11', label: 'Брендам одежды',          where: 'Экран 4, задача 02',            ratio: [4, 5], size: [1200, 1500], position: 'centre' },
  { n: '12', label: 'Опт и СТМ',               where: 'Экран 4, задача 03',            ratio: [4, 5], size: [1200, 1500], position: 'centre' },
  { n: '13', label: 'Экспериментальный цех',   where: 'Экран 4, задача 04',            ratio: [4, 5], size: [1200, 1500], position: 'centre' },
];

export const slotFile = (n) => `assets/img/img-${n}.webp`;
export const getSlot = (n) => SLOTS.find((s) => s.n === String(n).padStart(2, '0'));
