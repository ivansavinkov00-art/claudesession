// Импорт семантики: seo/semantics.xlsx → seo/semantics.json (компактный источник для генератора и выгрузки в Директ).
// node tools/seo-import.mjs [путь к xlsx]
// Книга — данные от SEO-специалиста: читаем только значения (формулы → результат), ничего не выполняем.
import ExcelJS from 'exceljs';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = process.argv[2] || resolve(root, 'seo/semantics.xlsx');

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(src);

const val = (c) => {
  let v = c.value;
  if (v && typeof v === 'object') {
    if ('result' in v) v = v.result;
    else if ('richText' in v) v = v.richText.map((t) => t.text).join('');
    else if ('text' in v) v = v.text;
  }
  return v === undefined || v === '' ? null : v;
};
const table = (name) => {
  const ws = wb.getWorksheet(name);
  if (!ws) throw new Error(`Нет листа «${name}»`);
  const rows = [];
  ws.eachRow({ includeEmpty: false }, (row) => rows.push(row.values.slice(1).map((_, i) => val(row.getCell(i + 1)))));
  const head = rows.shift();
  return rows.filter((r) => r[0] !== null || r[1] !== null).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? null])));
};
const num = (x) => (typeof x === 'number' ? x : null);
const clusterId = (name) => (name || '').slice(0, 2);

const core = table('Семантическое ядро').filter((r) => r['Фраза']);
const phrases = core.map((r) => ({
  n: r['№'],
  phrase: String(r['Фраза']).trim(),
  cluster: clusterId(r['Кластер']),
  type: r['Тип запроса'],
  source: r['Источник'],
  rfBroad: num(r['РФ, широкая (в мес.)']),
  rfExact: num(r['РФ, точная']),
  obBroad: num(r['Челябинская обл., широкая']),
  obExact: num(r['Челябинская обл., точная']),
  freqClass: r['Класс частотности (обл.)'],
  priority: r['Приоритет'],
  direct: r['Фраза для Директа'],
  note: r[Object.keys(r).at(-1)],
}));

const clusterRows = table('Кластеры и страницы').filter((r) => /^\d\d /.test(r['Кластер'] || ''));
const clusters = clusterRows.map((r) => ({
  id: clusterId(r['Кластер']),
  name: r['Кластер'].slice(3),
  page: r['Страница сайта'],
  phrases: r['Фраз'],
  h1: r['H1 страницы (черновик)'] && r['H1 страницы (черновик)'] !== '—' ? r['H1 страницы (черновик)'] : null,
  minus: r['Минус-слова кластера (добавить к общим)'],
}));

const pages = table('Страницы SEO').filter((r) => /^\d\d /.test(r['Кластер'] || '')).map((r) => ({
  cluster: clusterId(r['Кластер']),
  url: r['URL'],
  title: r['Title'],
  description: r['Description'],
  h1: r['H1'],
}));

const minus = table('Минус-слова').filter((r) => r['Минус-слово / фраза']).map((r) => ({
  category: r['Категория'], word: String(r['Минус-слово / фраза']), type: r['Тип'], direct: r['В формате Директа'], why: r['Зачем'],
}));

const crossMinus = table('Кросс-минусовка').filter((r) => r['Фраза-получатель']).map((r) => ({
  receiver: r['Фраза-получатель'], cluster: clusterId(r['Её кластер']), minus: r['Минус-слова к ней'], because: r['Из-за каких более узких фраз других кластеров'],
}));

const questions = table('Вопросы клиенту').map((r) => ({ n: r['№'], question: r['Вопрос'], why: r['Почему важно для семантики'], changes: r['Что поменяется'] }));

const out = { source: 'seo/semantics.xlsx', collected: '2026-10-09', region: 'Челябинская область (11225)', clusters, pages, phrases, minus, crossMinus, questions };
writeFileSync(resolve(root, 'seo/semantics.json'), JSON.stringify(out, null, 1));
console.log(`фраз ${phrases.length}, кластеров ${clusters.length}, страниц ${pages.length}, минус-слов ${minus.length}, кросс-минусовок ${crossMinus.length}`);
