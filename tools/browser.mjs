// Запуск Chromium для скриптов tools/.
// Обычно берётся браузер, который поставил `npx playwright install`. Если его версии нет
// (облачная сессия: браузер предустановлен в /opt/pw-browsers), берём CHROMIUM_PATH или /opt/pw-browsers/chromium.
import { chromium } from 'playwright';
import { existsSync } from 'node:fs';

export async function launch(options = {}) {
  try {
    return await chromium.launch(options);
  } catch (err) {
    const fallback = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium';
    if (existsSync(fallback)) return chromium.launch({ ...options, executablePath: fallback });
    throw err;
  }
}
