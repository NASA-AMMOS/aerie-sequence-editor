/* eslint no-undef: 0 */
(() => {
  globalThis.GLOBALS = [{ name: 'BANANA01INT', type: 'int' }];
  globalThis.LINT = function commandDictionary(commandDictionary, view, node) {
    const diagnostics = [];

    if (commandDictionary) {
      const { fswCommandMap } = commandDictionary;
      const textContent = view.state.doc.sliceString(node.from, node.to);

      if (node.name === 'Stem' && fswCommandMap[textContent] && textContent === 'PREHEAT_OVEN') {
        const argNode = node.nextSibling;
        // Math to remove parens
        const nodeValue = parseFloat(view.state.doc.sliceString(argNode.from + 1, argNode.to - 1));

        if (nodeValue > 0 && nodeValue < 50) {
          diagnostics.push({
            actions: [],
            from: argNode.from,
            message: 'Temperature should be greater than 50.',
            severity: 'error',
            to: argNode.to,
          });
        }
      }
    }

    return diagnostics;
  };
})();
