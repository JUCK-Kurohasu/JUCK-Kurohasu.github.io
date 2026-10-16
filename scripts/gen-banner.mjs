#!/usr/bin/env node
/**
 * figlet でバナー用のアスキーアートを生成して表示する。
 * 出力を src/data/ascii.ts の BANNER（または NOT_FOUND）に貼り付けて使う。
 *
 *   npm run gen:banner -- JUCK
 *   npm run gen:banner -- JUCK "ANSI Regular"
 */
import figlet from 'figlet';

const [text = 'JUCK', font = 'ANSI Shadow'] = process.argv.slice(2);
const lines = figlet
  .textSync(text, { font })
  .split('\n')
  .map((line) => line.replace(/\s+$/, ''));
while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();

console.log('export const BANNER = [');
for (const line of lines) console.log(`  ${JSON.stringify(line)},`);
console.log("].join('\\n');");
