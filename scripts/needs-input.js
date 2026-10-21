import { readFileSync } from 'node:fs';
import { needsInput, formatNeedsInput } from '../src/needs-input.js';

const catalog = JSON.parse(readFileSync(new URL('../data/barbarian.json', import.meta.url), 'utf8'));
const items = needsInput(catalog);
console.log(formatNeedsInput(items));
