// Выгрузка для Яндекс Директа: структура кампаний из семантики, объявления из seo/pages/*.json, минус-слова, цели Метрики.
//   node tools/direct-export.mjs  →  seo/direct/direct-ready.xlsx и seo/direct/phrases.csv
// Это структура для ручной загрузки или переноса в Директ Коммандер: названия колонок Коммандера нужно сверить с актуальным шаблоном.
// Ставки и бюджеты не заданы: данных о ценах конверсий пока нет (см. лист «Что нужно»).
import ExcelJS from 'exceljs';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const J = (p) => JSON.parse(readFileSync(resolve(ROOT, p), 'utf8'));
const site = J('seo/site.json');
const sem = J('seo/semantics.json');
const page = (slug) => J(`seo/pages/${slug}.json`);

// ---------- структура: что в какую кампанию и на какую страницу ----------
const CAMPAIGNS = [
  { id: 'K1', name: 'Поиск | Опт и маркетплейсы', geo: 'Россия', note: 'Основная кампания: B2B-запросы про партии, WB и Ozon, давальческое сырьё.',
    groups: [{ cluster: '02', slug: 'opt', name: 'Пошив оптом' }, { cluster: '03', slug: 'marketplejsy', name: 'Wildberries и Ozon' }, { cluster: '06', slug: 'davalcheskoe', name: 'Давальческое сырьё' }, { cluster: '13', slug: 'price', name: 'Стоимость пошива (B2B)' }] },
  { id: 'K2', name: 'Поиск | Бренды, образец, лекала', geo: 'Россия', note: 'Бренды и стартапы: малые партии, образец за 2–3 дня, лекала.',
    groups: [{ cluster: '04', slug: 'brendam', name: 'Для брендов' }, { cluster: '05', slug: 'obrazec', name: 'Образец и экспериментальный цех' }, { cluster: '12', slug: 'lekala-konstruktor', name: 'Лекала и технолог' }] },
  { id: 'K3', name: 'Поиск | Изделия партиями', geo: 'Россия', note: 'Только фразы с «оптом», «партии», «от производителя»: фразы про один экземпляр вынесены в резерв (B2C-риск).',
    groups: [{ cluster: '07', slug: 'hudi-svitshoty', name: 'Худи и свитшоты' }, { cluster: '08', slug: 'platya-rubashki-bryuki', name: 'Платья, рубашки, брюки, шорты' }] },
  { id: 'K4', name: 'Поиск | Печать и вышивка (тест)', geo: 'Челябинская область', note: 'Аудитория часто ищет единичное нанесение: запускать тестом с минимальными ставками и смотреть долю заявок от физлиц.',
    groups: [{ cluster: '09', slug: 'dtf-pechat', name: 'ДТФ-печать' }, { cluster: '10', slug: 'vyshivka', name: 'Вышивка' }] },
  { id: 'K5', name: 'Поиск | Бирки и упаковка', geo: 'Россия', note: 'Сопутствующая услуга к партии.', groups: [{ cluster: '11', slug: 'birki-upakovka', name: 'Бирки, составники, упаковка' }] },
  { id: 'K6', name: 'Поиск | Общие, Челябинск', geo: 'Челябинская область', note: 'Широкие фразы «швейное производство», «швейная фабрика»: нужна кросс-минусовка, иначе показы уйдут на узкие группы других кампаний.',
    groups: [{ cluster: '01', slug: '', name: 'Швейное производство, Челябинск' }] },
];
const CALLOUTS = ['Образец за 2–3 дня', 'От 300 единиц', 'Отправка по России', 'Бирки и упаковка', 'Давальческое сырьё', 'Полный цикл в одном цехе', 'ОТК на каждом этапе', 'Расчёт онлайн'];
const SITELINKS = ['obrazec', 'price', 'brendam', 'davalcheskoe', 'marketplejsy', 'birki-upakovka', 'lekala-konstruktor', 'opt'];

const HOME_ADS = [
  { t1: 'Швейное производство в Челябинске', t2: 'Образец за 2–3 дня', text: 'Полный цикл в одном цехе: лекала, пошив, ОТК, упаковка. Отправка по России' },
  { t1: 'Контрактный пошив одежды партиями', t2: 'От 300 единиц', text: 'Шьём для брендов и селлеров WB и OZON на вашем сырье. Рассчитайте онлайн' },
];

// ---------- помощники ----------
const words = (s) => s.toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
const stem = (w) => (w.length > 5 ? w.slice(0, 5) : w);
const bare = (ph) => ph.replace(/[+!\[\]"]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
const url = (slug, group) => `${site.domain}/${slug ? `${slug}/` : ''}?utm_source=yandex&utm_medium=cpc&utm_campaign={campaign_id}&utm_content={ad_id}&utm_term={keyword}&utm_group=${encodeURIComponent(group)}`;
const clip = (s, n) => (s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, '').replace(/[,;:\s]+$/, ''));
const problems = [];
const check = (where, label, s, max) => { if (s.length > max) problems.push([where, label, `${s.length} > ${max}`, s]); };

const minusAll = sem.minus.filter((m) => m.direct).map((m) => m.direct.trim());
const minusSingle = new Set(sem.minus.filter((m) => m.type === 'слово' && !m.word.includes('-')).map((m) => m.word.toLowerCase().replace(/ё/g, 'е')));
const crossBy = Object.fromEntries(sem.crossMinus.map((c) => [c.receiver.toLowerCase(), c.minus]));
const clusterMinus = Object.fromEntries(sem.clusters.filter((c) => c.minus).map((c) => [c.id, c.minus]));

// ---------- сборка строк ----------
const rows = { groups: [], phrases: [], ads: [], reserve: [], conflicts: [] };
for (const camp of CAMPAIGNS) {
  for (const g of camp.groups) {
    const pg = g.slug ? page(g.slug) : null;
    const landing = url(g.slug, g.name);
    const all = sem.phrases.filter((p) => p.cluster === g.cluster);
    const take = all.filter((p) => ['A', 'B', 'C', 'нет данных'].includes(p.priority));
    const risky = all.filter((p) => p.priority === 'B2C-риск' || p.priority === 'Проверка');
    const gm = [clusterMinus[g.cluster]].filter(Boolean).join(' ');
    rows.groups.push({ camp: camp.name, geo: camp.geo, group: g.name, cluster: g.cluster, landing, phrases: take.length, minus: gm });
    for (const p of take) {
      let phrase = p.direct || p.phrase;
      const cross = crossBy[bare(phrase)];
      if (cross) phrase = `${phrase} ${cross}`;
      const n = words(bare(p.direct || p.phrase)).length;
      if (n > 7) problems.push([g.name, 'фраза длиннее 7 слов', String(n), p.phrase]);
      rows.phrases.push({ camp: camp.name, group: g.name, phrase, plain: p.phrase, priority: p.priority, rf: p.rfExact, ob: p.obExact, landing, cross: cross || '' });
      // минус-слова кампании, которые совпадают со словами самой фразы: ключ приоритетнее, но стоит знать
      const hit = words(p.phrase).filter((w) => minusSingle.has(w));
      if (hit.length) rows.conflicts.push({ phrase: p.phrase, group: g.name, words: [...new Set(hit)].join(', ') });
    }
    for (const p of risky) rows.reserve.push({ group: g.name, phrase: p.phrase, direct: p.direct || p.phrase, priority: p.priority, rf: p.rfExact, ob: p.obExact, note: p.note || '' });
    const ads = pg ? pg.ads : HOME_ADS;
    ads.forEach((a, i) => {
      const where = `${g.name} / объявление ${i + 1}`;
      check(where, 'заголовок 1', a.t1, 56); check(where, 'заголовок 2', a.t2, 30); check(where, 'текст', a.text, 81);
      rows.ads.push({ camp: camp.name, group: g.name, n: i + 1, t1: a.t1, t2: a.t2, text: a.text, url: landing, display: g.slug || 'shveynoe-proizvodstvo' });
    });
  }
}

// конкуренты: только таргетинг по фразам, названия в тексте объявлений не используются
const competitors = sem.phrases.filter((p) => p.cluster === '15');

// быстрые ссылки и уточнения
const sitelinks = SITELINKS.map((slug) => {
  const p = page(slug);
  const title = p.crumb; const desc = clip(p.card, 60);
  check(`быстрая ссылка ${slug}`, 'название', title, 30); check(`быстрая ссылка ${slug}`, 'описание', desc, 60);
  return { title, desc, url: `${site.domain}/${slug}/?utm_source=yandex&utm_medium=cpc&utm_campaign={campaign_id}&utm_content=sitelink` };
});
CALLOUTS.forEach((c) => check('уточнение', c, c, 25));

const GOALS = [
  ['calc_submit', 'Заявка из калькулятора', 'JavaScript-событие', 'Главная цель: оптимизировать кампании по ней', 'Да'],
  ['callback_submit', 'Заказ обратного звонка', 'JavaScript-событие', 'Вторая цель', 'Да'],
  ['price_submit', 'Запрос прайс-листа', 'JavaScript-событие', 'Мягкая конверсия: не оптимизировать только по ней', 'Нет'],
  ['price_download', 'Скачивание прайс-листа', 'JavaScript-событие', 'Контроль', 'Нет'],
  ['phone_click', 'Клик по телефону', 'JavaScript-событие', 'Звонок: на мобильном почти всегда намерение', 'Да'],
  ['messenger_click', 'Переход в мессенджер', 'JavaScript-событие', 'Параметры: название, место на странице', 'Да'],
  ['cta_click', 'Клик «Рассчитать стоимость»', 'JavaScript-событие', 'Микроконверсия, отчёты по местам кнопок', 'Нет'],
  ['calc_start', 'Начал заполнять калькулятор', 'JavaScript-событие', 'Воронка: старт → заявка', 'Нет'],
  ['price_open', 'Открыл окно прайса', 'JavaScript-событие', 'Воронка', 'Нет'],
];

// ---------- XLSX ----------
const wb = new ExcelJS.Workbook();
wb.creator = 'tools/direct-export.mjs';
const sheet = (name, cols, data, widths) => {
  const ws = wb.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 1 }] });
  ws.columns = cols.map((c, i) => ({ header: c, key: String(i), width: widths?.[i] || 24 }));
  data.forEach((r) => ws.addRow(r));
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFE1CB' } };
  ws.eachRow((row) => row.eachCell((c) => { c.alignment = { vertical: 'top', wrapText: true }; }));
  return ws;
};

sheet('Что нужно', ['Тема', 'Пояснение'], [
  ['Как читать файл', 'Кампании → группы → фразы (лист «Фразы») → объявления. Ссылки с метками: в Директе макросы {campaign_id}, {ad_id}, {keyword} подставятся сами; проверьте актуальные названия макросов в справке Директа перед запуском.'],
  ['Источник', `Семантика: ${sem.source}, собрана ${sem.collected}, частоты Вордстата по региону «${sem.region}» (точные частоты по РФ есть не у всех фраз).`],
  ['Что не заполнено', 'Ставки, бюджеты, цели по цене конверсии. Для расчёта нужны: средний чек и маржа партии, доля заявок, доходящих до договора, допустимая стоимость заявки (целевой CPA). Без них стратегию «Максимум конверсий» запускать рано.'],
  ['Гео', 'Бизнес в Челябинске, доставка по России. Спрос по фразам без города замерен слабо: начните с Челябинской области для общих фраз (К6) и с России для узких B2B-фраз (К1, К2, К5).'],
  ['Ожидания по объёму', `Сумма точных частот по области — около ${sem.phrases.reduce((s, p) => s + (p.obExact || 0), 0)} запросов в месяц на всё ядро, по узким B2B-фразам по России — единицы и десятки. Директ даст десятки кликов, а не сотни: бюджет на тест разумно держать небольшим, а решения принимать по заявкам, а не по кликам.`],
  ['Риски', 'ДТФ-печать и вышивка привлекают единичные заказы физлиц (кампания К4: тест). Фразы с «пошив худи», «пошив платья» без слов «оптом/партия» вынесены в лист «Резерв B2C-риск». Названия конкурентов в текстах объявлений не использовать (товарные знаки).'],
  ['Маркировка рекламы', 'Директ передаёт данные в ЕРИР при заполненных реквизитах рекламодателя в кабинете (ИНН). Реквизиты оператора на сайте тоже нужны: см. seo/site.json (legal).'],
], [28, 120]);

sheet('Кампании', ['Кампания', 'Гео', 'Заметка', 'Групп'], CAMPAIGNS.map((c) => [c.name, c.geo, c.note, c.groups.length]), [38, 24, 100, 8]);
sheet('Группы', ['Кампания', 'Группа', 'Кластер', 'Страница', 'Фраз', 'Минус-слова группы'], rows.groups.map((g) => [g.camp, g.group, g.cluster, g.landing, g.phrases, g.minus]), [34, 36, 8, 70, 8, 50]);
sheet('Фразы', ['Кампания', 'Группа', 'Фраза для Директа (с операторами и кросс-минусами)', 'Исходная фраза', 'Приоритет', 'РФ, точная', 'Обл., точная', 'Кросс-минусовка'], rows.phrases.map((p) => [p.camp, p.group, p.phrase, p.plain, p.priority, p.rf, p.ob, p.cross]), [34, 32, 60, 40, 10, 10, 10, 30]);
sheet('Объявления', ['Кампания', 'Группа', '№', 'Заголовок 1 (≤56)', 'Заголовок 2 (≤30)', 'Текст (≤81)', 'Ссылка', 'Отображаемая ссылка (≤20)'], rows.ads.map((a) => [a.camp, a.group, a.n, a.t1, a.t2, a.text, a.url, a.display.slice(0, 20)]), [34, 32, 5, 44, 28, 70, 80, 22]);
sheet('Быстрые ссылки и уточнения', ['Тип', 'Название (≤30 / уточнение ≤25)', 'Описание (≤60)', 'Ссылка'], [
  ...sitelinks.map((s) => ['Быстрая ссылка', s.title, s.desc, s.url]),
  ...CALLOUTS.map((c) => ['Уточнение', c, '', '']),
], [18, 40, 70, 90]);
sheet('Минус-слова кампаний', ['Тип', 'Содержимое'], [
  ['Общие минус-слова (вставить на уровне кампании)', minusAll.join(' ')],
  ...Object.entries(clusterMinus).map(([id, m]) => [`Кластер ${id}: добавить к общим`, m]),
], [48, 160]);
sheet('Кросс-минусовка', ['Фраза-получатель', 'Кластер', 'Минус-слова к ней', 'Из-за каких фраз'], sem.crossMinus.map((c) => [c.receiver, c.cluster, c.minus, c.because]), [30, 8, 50, 90]);
sheet('Резерв B2C-риск', ['Группа', 'Фраза', 'Для Директа', 'Приоритет', 'РФ, точная', 'Обл., точная', 'Примечание'], rows.reserve.map((r) => [r.group, r.phrase, r.direct, r.priority, r.rf, r.ob, r.note]), [30, 40, 40, 12, 10, 10, 80]);
sheet('Конкуренты', ['Фраза', 'РФ, точная', 'Обл., точная', 'Правило'], competitors.map((c) => [c.phrase, c.rfExact, c.obExact, 'Отдельная кампания, ставка минимальная; название конкурента в тексте объявления не использовать']), [40, 12, 12, 100]);
sheet('Проверка', ['Что', 'Где', 'Деталь', 'Значение'], [
  ...problems.map((p) => ['Лимит Директа', p[0], `${p[1]}: ${p[2]}`, p[3]]),
  ...rows.conflicts.map((c) => ['Минус-слово совпадает со словом фразы', c.group, `слова: ${c.words}`, c.phrase]),
  ...(problems.length || rows.conflicts.length ? [] : [['Ошибок нет', '', '', '']]),
], [34, 36, 40, 60]);
sheet('Цели Метрики', ['Идентификатор', 'Название цели', 'Тип условия', 'Зачем', 'Для оптимизации Директа'], GOALS, [20, 36, 22, 60, 22]);
sheet('Источники трафика (UTM)', ['Параметр', 'Значение'], [
  ['utm_source', 'yandex'], ['utm_medium', 'cpc'], ['utm_campaign', '{campaign_id}'], ['utm_content', '{ad_id}'], ['utm_term', '{keyword}'],
  ['Авторазметка', 'Включить в кабинете Директа «Разметка ссылок для Метрики» (yclid). Robots.txt уже содержит Clean-param для utm_* и yclid.'],
], [20, 110]);

mkdirSync(resolve(ROOT, 'seo/direct'), { recursive: true });
await wb.xlsx.writeFile(resolve(ROOT, 'seo/direct/direct-ready.xlsx'));
const csv = ['Кампания;Группа;Фраза;Страница', ...rows.phrases.map((p) => [p.camp, p.group, p.phrase, p.landing].map((x) => `"${String(x).replace(/"/g, '""')}"`).join(';'))].join('\n');
writeFileSync(resolve(ROOT, 'seo/direct/phrases.csv'), `﻿${csv}\n`);
console.log(`direct: кампаний ${CAMPAIGNS.length}, групп ${rows.groups.length}, фраз ${rows.phrases.length}, объявлений ${rows.ads.length}, резерв ${rows.reserve.length}`);
console.log(`проверка: нарушений лимитов ${problems.length}, пересечений минус-слов ${rows.conflicts.length}`);
for (const p of problems) console.log(`  ✗ ${p[0]}: ${p[1]} ${p[2]} «${p[3]}»`);
if (problems.length) process.exit(1);
