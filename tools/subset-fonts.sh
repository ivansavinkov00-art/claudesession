#!/usr/bin/env bash
# Урезает latin-файлы Playfair и Onest до символов, которые есть на сайте (ASCII, кавычки-ёлочки, тире, ₽ и т. п.).
# Оригиналы берутся из node_modules (@fontsource-variable/*), результат пишется в assets/fonts/.
# Нужны Python 3 и fonttools с brotli:  python3 -m venv .venv && .venv/bin/pip install fonttools brotli
# Список символов должен совпадать с unicode-range latin-гарнитур в styles.css.
set -euo pipefail
PY=${PYFTSUBSET:-.venv/bin/pyftsubset}
U='U+0020-007E,U+00A0,U+00AB,U+00B7,U+00BB,U+00D7,U+2010-2015,U+2018-201D,U+2022,U+2026,U+2116,U+2212,U+20BD'
sub() { "$PY" "$1" --unicodes="$U" --flavor=woff2 --layout-features='kern,liga,lnum,pnum,tnum,case,ccmp,locl,mark,mkmk' --output-file="$2"; }
sub node_modules/@fontsource-variable/playfair-display/files/playfair-display-latin-wght-normal.woff2 assets/fonts/playfair-display-latin-wght-normal.woff2
sub node_modules/@fontsource-variable/playfair-display/files/playfair-display-latin-wght-italic.woff2 assets/fonts/playfair-display-latin-wght-italic.woff2
sub node_modules/@fontsource-variable/onest/files/onest-latin-wght-normal.woff2 assets/fonts/onest-latin-wght-normal.woff2

# --- тёмная тема (PLAN-v4.md, 3.1): Noto Serif с шириной 87,5% и весами 300–500 (кириллица целиком, latin урезан) и Inter ---
NS=node_modules/@fontsource-variable/noto-serif/files
INSTANCER="${PYINSTANCER:-.venv/bin/fonttools} varLib.instancer"
for s in normal italic; do
  $INSTANCER $NS/noto-serif-cyrillic-standard-$s.woff2 wdth=87.5 wght=300:500 --output=assets/fonts/noto-serif-sc-cyrillic-$s.woff2
  $INSTANCER $NS/noto-serif-latin-standard-$s.woff2 wdth=87.5 wght=300:500 --output=/tmp/ns-latin-$s.woff2
  sub /tmp/ns-latin-$s.woff2 assets/fonts/noto-serif-sc-latin-$s.woff2
done
cp node_modules/@fontsource-variable/inter/files/inter-cyrillic-wght-normal.woff2 assets/fonts/
sub node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2 assets/fonts/inter-latin-wght-normal.woff2
