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
