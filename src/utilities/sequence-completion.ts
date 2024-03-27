import type { Completion, CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import { syntaxTree } from '@codemirror/language';
import type { CommandDictionary } from '@nasa-jpl/aerie-ampcs';
import { fswCommandArgDefault } from './command-dictionary';

/**
 * Completion function that returns a Code Mirror extension function.
 * Can be optionally called with a command dictionary so it's available for completion.
 */
export function sequenceCompletion(commandDictionary: CommandDictionary | null = null) {
  return (context: CompletionContext): CompletionResult | null => {
    const nodeBefore = syntaxTree(context.state).resolveInner(context.pos, -1);

    if (nodeBefore?.parent?.name === 'Args') {
      // TODO: Handle argument completions.
      return null;
    }

    const word = context.matchBefore(/\w*/);

    if (word) {
      if (word.from == word.to && !context.explicit) {
        return null;
      }

      const timeTagCompletions: Completion[] = [];
      const enumerationCompletions: Completion[] = [];
      const fswCommandsCompletions: Completion[] = [];
      const hwCommandsCompletions: Completion[] = [];
      const directivesCompletions: Completion[] = [];

      // Directives.
      directivesCompletions.push(
        {
          apply: `METADATA "Key" "Value"`,
          info: 'Any key-value pairs',
          label: `@METADATA`,
          section: 'Directives',
          type: 'keyword',
        },
        {
          apply: `LOAD_AND_GO`,
          info: 'Set Sequence as a Load and Go Sequence',
          label: '@LOAD_AND_GO',
          section: 'Directives',
          type: 'keyword',
        },
        {
          apply: `INPUT_PARAMS VALUE`,
          info: 'List of Input Parameters',
          label: '@INPUT_PARAMS',
          section: 'Directives',
          type: 'keyword',
        },
        {
          apply: `LOCALS VALUE`,
          info: 'List of Local Variables',
          label: '@LOCALS',
          section: 'Directives',
          type: 'keyword',
        },
        {
          apply: `MODEL "Variable" 0 "Offset"`,
          info: 'List of Local Variables',
          label: '@MODEL',
          section: 'Directives',
          type: 'keyword',
        },
        {
          apply: `HARDWARE`,
          info: 'A HARDWARE Directive',
          label: '@HARDWARE',
          section: 'Directives',
          type: 'keyword',
        },
        {
          apply: `IMMEDIATE`,
          info: 'A IMMEDIATE Directive',
          label: '@IMMEDIATE',
          section: 'Directives',
          type: 'keyword',
        },
        {
          apply: `ID`,
          info: 'Sequence ID',
          label: '@ID',
          section: 'Directives',
          type: 'keyword',
        },
      );

      // Time Tags.
      timeTagCompletions.push(
        {
          apply: 'A000-000T00:00:00)',
          info: 'Execute command at an absolute time',
          label: `A (absolute)`,
          section: 'Time Tags',
          type: 'keyword',
        },
        {
          apply: 'C',
          info: 'Execute command after the previous command completes',
          label: 'C (command complete)',
          section: 'Time Tags',
          type: 'keyword',
        },
        {
          apply: 'E+00:00:00',
          info: 'Execute command at an offset from an epoch',
          label: 'E (epoch)',
          section: 'Time Tags',
          type: 'keyword',
        },
        {
          apply: 'R1',
          info: 'Execute command at an offset from the previous command',
          label: 'R (relative)',
          section: 'Time Tags',
          type: 'keyword',
        },
      );

      if (commandDictionary) {
        // Enumerations.
        // TODO: Make context aware.
        // for (const enumeration of commandDictionary.enums) {
        //   for (const enumValue of enumeration.values) {
        //     const { symbol } = enumValue;

        //     enumerationCompletions.push({
        //       label: symbol,
        //       section: 'Enumerations',
        //       type: 'labelName',
        //     });
        //   }
        // }

        // Flight Software Commands.
        for (const fswCommand of commandDictionary.fswCommands) {
          const { description, stem, arguments: args } = fswCommand;
          let apply = stem;

          if (args.length) {
            const argsStr = args.map(arg => fswCommandArgDefault(arg, commandDictionary.enumMap)).join(' ');
            apply = `${stem} ${argsStr} `;
          }

          fswCommandsCompletions.push({
            apply,
            info: description,
            label: stem,
            section: 'Flight Software Commands',
            type: 'function',
          });
        }

        // Hardware Commands.
        for (const hwCommand of commandDictionary.hwCommands) {
          const { description, stem } = hwCommand;

          hwCommandsCompletions.push({
            apply: stem,
            info: description,
            label: stem,
            section: 'Hardware Commands',
            type: 'function',
          });
        }
      }

      return {
        from: word.from,
        options: [
          ...directivesCompletions,
          ...timeTagCompletions,
          ...enumerationCompletions,
          ...fswCommandsCompletions,
          ...hwCommandsCompletions,
        ],
      };
    }

    return null;
  };
}
