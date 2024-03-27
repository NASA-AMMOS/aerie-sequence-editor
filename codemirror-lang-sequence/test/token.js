/* eslint-disable no-undef */

import { SeqLanguage } from '../dist/index.js';
import assert from 'assert';
import { readFileSync, readdirSync } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const ERROR = '⚠';

describe('error positions', () => {
  for (const { testname, input, first_error } of [
    { testname: 'bad stem ending', input: 'FSW_CMD%', first_error: 7 },
    { testname: 'bad stem', input: 'FOO$BAR^BAZ', first_error: 3 },
    { testname: 'bad string arg', input: 'FOO "', first_error: 4 },
    { testname: 'bad number arg', input: 'CMD 12,34', first_error: 6 },
    {
      testname: 'good and bad commands',
      input: `COM 12345
COM "dsa"
@UNKNOWN DIRECTIVE`,
      first_error: 20,
    },
  ]) {
    it(testname, () => {
      const parsed = SeqLanguage.parser.parse(input);
      const cursor = parsed.cursor();
      do {
        const { node } = cursor;
        if (node.type.name === ERROR) {
          assert.strictEqual(cursor.from, first_error);
          break;
        }
      } while (cursor.next());
    });
  }
});

describe('seqfiles', () => {
  const seqDir = path.dirname(fileURLToPath(import.meta.url)) + '/sequences';
  for (const file of readdirSync(seqDir)) {
    if (!/\.txt$/.test(file)) continue;

    const name = /^[^.]*/.exec(file)[0];
    it(name, () => {
      const input = readFileSync(path.join(seqDir, file), 'utf8');
      // printTokens(input, (ttype) => ttype === ERROR);
      assertNoErrorTokens(input);
    });
  }
});

function assertNoErrorTokens(input) {
  const parsed = SeqLanguage.parser.parse(input);
  const cursor = parsed.cursor();
  do {
    const { node } = cursor;
    assert.notStrictEqual(node.type.name, ERROR);
  } while (cursor.next());
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function printTokens(input, filter) {
  const parsed = SeqLanguage.parser.parse(input);
  const cursor = parsed.cursor();
  do {
    const { node } = cursor;
    if (!filter || filter(node.type.name)) {
      console.log(`${node.type.name} --> '${input.substring(node.from, node.to)}'`);
    }
  } while (cursor.next());
}
