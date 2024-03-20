import type { GlobalType } from './types/global-type';

declare global {
  namespace App {}
  // eslint-disable-next-line no-var
  var GLOBALS: GlobalType[];
  function LINT(commandDictionary, view, node);
}

export {};
