/* eslint-disable no-undef */

import { SeqLanguage } from '../dist/index.js';
import assert from 'assert';

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
        if (node.type.name === '⚠') {
          assert.strictEqual(cursor.from, first_error);
          break;
        }
      } while (cursor.next());
    });
  }
});
