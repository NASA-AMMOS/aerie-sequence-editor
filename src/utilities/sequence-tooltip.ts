import type { Extension } from '@codemirror/state';
import { hoverTooltip, type Tooltip } from '@codemirror/view';
import type { CommandDictionary, FswCommand, HwCommand } from '@nasa-jpl/aerie-ampcs';
import CommandTooltip from '../lib/CommandTooltip.svelte';

/**
 * Tooltip function that returns a Code Mirror extension function.
 * Can be optionally called with a command dictionary so it's available during tooltip generation.
 */
export function sequenceTooltip(commandDictionary: CommandDictionary | null = null): Extension {
  return hoverTooltip((view, pos, side): Tooltip | null => {
    const { from, to, text } = view.state.doc.lineAt(pos);
    let start = pos;
    let end = pos;

    while (start > from && /\w/.test(text[start - from - 1])) start--;
    while (end < to && /\w/.test(text[end - from])) end++;

    if ((start == pos && side < 0) || (end == pos && side > 0)) {
      return null;
    } else {
      const textContent = text.slice(start - from, end - from);

      if (commandDictionary) {
        const { fswCommandMap, hwCommandMap } = commandDictionary;
        const command: FswCommand | HwCommand | null = fswCommandMap[textContent] ?? hwCommandMap[textContent] ?? null;

        if (command) {
          return {
            above: true,
            create() {
              const dom = document.createElement('div');
              new CommandTooltip({ props: { command }, target: dom });
              return { dom };
            },
            end,
            pos: start,
          };
        }
      }

      return null;
    }
  });
}
