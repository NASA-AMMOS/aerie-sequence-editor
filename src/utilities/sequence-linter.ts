import { syntaxTree } from '@codemirror/language';
import { linter, type Diagnostic } from '@codemirror/lint';
import type { Extension } from '@codemirror/state';
import type { SyntaxNode } from '@lezer/common';
import type { CommandDictionary, EnumMap, FswCommand, FswCommandArgument } from '@nasa-jpl/aerie-ampcs';
import { numberOfChildren, getChildrenNode, getDeepestNode } from './tree-utils';

const ERROR = '⚠';

export function getAllEnumSymbols(enumMap: EnumMap, enumName: string) {
  const enumSymbols = enumMap[enumName].values.map(({ symbol }) => symbol);
  const enumSymbolsDisplayStr = enumSymbols.join('  |  ');
  return { enumSymbols, enumSymbolsDisplayStr };
}

/**
 * Linter function that returns a Code Mirror extension function.
 * Can be optionally called with a command dictionary so it's available during linting.
 */
export function sequenceLinter(commandDictionary: CommandDictionary | null = null): Extension {
  return linter(view => {
    const treeNode = syntaxTree(view.state).topNode;
    const diagnostics: Diagnostic[] = [];

    diagnostics.push(
      ...commandLinter(treeNode.getChild('Commands')?.getChildren('Command') || [], view.state.doc.toString()),
    );

    diagnostics.push(
      ...immediateCommandLinter(
        treeNode.getChild('ImmediateCommands')?.getChildren('Command') || [],
        view.state.doc.toString(),
      ),
    );

    diagnostics.push(
      ...hardwareCommandLinter(
        treeNode.getChild('HardwareCommands')?.getChildren('Command') || [],
        view.state.doc.toString(),
      ),
    );

    return diagnostics;
  });

  /**
   * Function to generate diagnostics based on Commands section in the parse tree.
   *
   * @param {SyntaxNode[] | undefined} commandNodes - nodes representing commands
   * @param {string} text - the text to validate against
   * @return {Diagnostic[]} an array of diagnostics
   */
  function commandLinter(commandNodes: SyntaxNode[] | undefined, text: string): Diagnostic[] {
    // If there are no command nodes, return an empty array of diagnostics
    if (!commandNodes) {
      return [];
    }

    // Initialize an empty array to hold diagnostics
    const diagnostics: Diagnostic[] = [];

    // Iterate over each command node
    for (const command of commandNodes) {
      // Get the TimeTag node for the current command
      const timeTagNode = command.getChild('TimeTag');

      // If the TimeTag node is missing, create a diagnostic
      if (!timeTagNode) {
        diagnostics.push({
          actions: [],
          from: command.from,
          message: "Missing 'Time Tag' for command",
          severity: 'error',
          to: command.to,
        });
      }

      // Validate the command and push the generated diagnostics to the array
      diagnostics.push(...validateCommand(command, text));

      // Lint the metadata and models
      diagnostics.push(...validateMetadata(command));
      diagnostics.push(...validateModel(command));
    }

    // Return the array of diagnostics
    return diagnostics;
  }

  /**
   * Function to generate diagnostics for immediate commands in the parse tree.
   *
   * @param {SyntaxNode[] | undefined} commandNodes - Array of command nodes or undefined.
   * @param {string} text - Text of the sequence.
   * @return {Diagnostic[]} Array of diagnostics.
   */
  function immediateCommandLinter(commandNodes: SyntaxNode[] | undefined, text: string): Diagnostic[] {
    // If there are no command nodes, return the empty array
    if (!commandNodes) {
      return [];
    }
    // Initialize an array to hold diagnostics

    const diagnostics: Diagnostic[] = [];

    // Iterate over each command node
    for (const command of commandNodes) {
      // Get the TimeTag node for the current command
      const timeTagNode = command.getChild('TimeTag');

      // If the TimeTag node exists, create a diagnostic
      if (timeTagNode) {
        diagnostics.push({
          actions: [],
          from: command.from,
          message: "Immediate commands can't have a time tag",
          severity: 'error',
          to: command.to,
        });
      }

      // Validate the command and push the generated diagnostics to the array
      diagnostics.push(...validateCommand(command, text));
    }

    // Return the array of diagnostics
    return diagnostics;
  }

  /**
   * Function to generate diagnostics based on HardwareCommands section in the parse tree.
   *
   * @param {SyntaxNode[] | undefined} commands - nodes representing hardware commands
   * @param {string} text - the text to validate against
   * @return {Diagnostic[]} an array of diagnostics
   */
  function hardwareCommandLinter(commands: SyntaxNode[] | undefined, text: string): Diagnostic[] {
    // Initialize an empty array to hold diagnostics
    const diagnostics: Diagnostic[] = [];

    // If there are no command nodes, return an empty array of diagnostics
    if (!commands) {
      return diagnostics;
    }

    // Iterate over each command node
    for (const command of commands) {
      // Get the TimeTag node for the current command
      const timeTag = command.getChild('TimeTag');

      // If the TimeTag node exists, create a diagnostic
      if (timeTag) {
        // Push a diagnostic to the array indicating that time tags are not allowed for hardware commands
        diagnostics.push({
          actions: [],
          from: command.from,
          message: 'Time tag is not allowed for hardware commands',
          severity: 'error',
          to: command.to,
        });
      }

      // Validate the command and push the generated diagnostics to the array
      diagnostics.push(...validateCommand(command, text));
    }

    // Return the array of diagnostics
    return diagnostics;
  }

  /**
   * Validates a command by validating its stem and arguments.
   *
   * @param command - The SyntaxNode representing the command.
   * @param text - The text of the whole command.
   * @returns An array of Diagnostic objects representing the validation errors.
   */
  function validateCommand(command: SyntaxNode, text: string): Diagnostic[] {
    // If the command dictionary is not initialized, return an empty array of diagnostics.
    if (!commandDictionary) {
      return [];
    }

    // Get the stem node of the command.
    const stem = command.getChild('Stem');
    // If the stem node is null, return an empty array of diagnostics.
    if (stem === null) {
      return [];
    }

    // Initialize an array to store the diagnostic errors.
    const diagnostics: Diagnostic[] = [];

    // Validate the stem of the command.
    const result = validateStem(stem, text);
    // No command dictionary return [].
    if (result === null) {
      return [];
    }

    // Stem was invalid.
    else if (typeof result === 'object' && 'message' in result) {
      diagnostics.push(result);
      return diagnostics;
    }

    const argNode = command.getChild('Args');
    const { arguments: dictArgs } = result;

    // Lint the arguments of the command.
    diagnostics.push(...validateAndLintArguments(dictArgs, argNode, command, text));

    // Return the array of diagnostics.
    return diagnostics;
  }

  /**
   * Validates the stem of a command.
   * @param stemNode - The SyntaxNode representing the stem of the command.
   * @param text - The text of the whole command.
   * @returns A Diagnostic if the stem is invalid, a FswCommand if the stem is valid, or null if the command dictionary is not initialized.
   */
  function validateStem(stemNode: SyntaxNode, text: string): Diagnostic | FswCommand | null {
    // If the command dictionary is not initialized, return null.
    if (commandDictionary === null) {
      return null;
    }
    const { fswCommandMap, hwCommandMap } = commandDictionary;

    // Get the text of the stem.
    const stemText = text.slice(stemNode.from, stemNode.to);

    // Try to find the stem text in the fswCommandMap and hwCommandMap.
    const dictionaryCommand = fswCommandMap[stemText] ?? hwCommandMap[stemText] ?? null;

    // If the stem text is not found in command dictionary, return a Diagnostic.
    if (!dictionaryCommand) {
      return {
        actions: [],
        from: stemNode.from,
        message: 'Command not found',
        severity: 'error',
        to: stemNode.to,
      };
    }

    // Return the found command.
    return dictionaryCommand;
  }

  /**
   * Validates and lints the command arguments based on the dictionary of command arguments.
   * @param dictArgs - The dictionary of command arguments.
   * @param argNode - The SyntaxNode representing the arguments of the command.
   * @param command - The SyntaxNode representing the command.
   * @param text - The text of the document.
   * @returns An array of Diagnostic objects representing the validation errors.
   */
  function validateAndLintArguments(
    dictArgs: FswCommandArgument[],
    argNode: SyntaxNode | null,
    command: SyntaxNode,
    text: string,
  ): Diagnostic[] {
    // Initialize an array to store the validation errors
    let diagnostics: Diagnostic[] = [];

    // Check if the dictionary command has arguments
    const hasArgs = dictArgs.length > 0;
    // Check if the command was provided arguments
    const hasProvidedArgs = argNode !== null;

    const numberOfNodeArgs = argNode ? numberOfChildren(argNode) : 0;

    // Check if the command should have arguments but doesn't
    if (hasArgs && !hasProvidedArgs) {
      // Push a diagnostic error for missing arguments
      diagnostics.push({
        actions: [],
        from: command.from,
        message: 'The command is missing arguments.',
        severity: 'error',
        to: command.to,
      });
      return diagnostics;
    }

    // Check if the command shouldn't have arguments but does
    if (!hasArgs && hasProvidedArgs) {
      // Push a diagnostic error for extra arguments
      diagnostics.push({
        actions: [],
        from: command.from,
        message: 'The command should not have arguments',
        severity: 'error',
        to: command.to,
      });
      return diagnostics;
    }

    if (hasArgs && hasProvidedArgs && numberOfNodeArgs !== dictArgs.length) {
      // Push a diagnostic error for extra arguments
      diagnostics.push({
        actions: [],
        from: argNode.name === 'RepeatArg' ? argNode.from : command.from,
        message: `The ${argNode.name === 'RepeatArg' ? 'RepeatArg' : 'command '} should have ${
          dictArgs.length
        } arguments`,
        severity: 'error',
        to: argNode.name === 'RepeatArg' ? argNode.to : command.to,
      });
      return diagnostics;
    }

    // grab the first argument node
    let node = argNode?.firstChild ?? null;

    // Iterate through the dictionary of command arguments
    for (let i = 0; i < dictArgs.length; i++) {
      const dictArg = dictArgs[i]; // Get the current dictionary argument

      // Check if there are no more argument nodes
      if (!node) {
        // Push a diagnostic error for missing argument
        diagnostics.push({
          actions: [],
          from: command.from,
          message: `Missing argument #${i + 1}, '${dictArg.name}' of type '${dictArg.arg_type}'`,
          severity: 'error',
          to: command.to,
        });
        break;
      }

      // Validate and lint the current argument node
      diagnostics = diagnostics.concat(...validateArguments(dictArg, node, command, text));

      // Move to the next argument node
      node = node.nextSibling;
    }

    // Return the array of validation errors
    return diagnostics;
  }

  /**
+ * Validates the given FSW command argument against the provided syntax node,
+ * and generates diagnostics if the validation fails.
+ *
+ * @param dictArg The FSW command argument to validate.
+ * @param argNode The syntax node to validate against.
+ * @param command The command node containing the argument node.
+ * @param text The full text of the document.
+ * @returns An array of diagnostics generated during the validation.
+ */
  function validateArguments(
    dictArg: FswCommandArgument,
    argNode: SyntaxNode,
    command: SyntaxNode,
    text: string,
  ): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    const dictArgType = dictArg.arg_type;
    const argType = argNode.name;
    const argText = text.slice(argNode.from, argNode.to);

    switch (dictArgType) {
      case 'enum':
        if (argType !== 'String' && argType !== 'Enum') {
          diagnostics.push({
            actions: [],
            from: argNode.from,
            message: `Incorrect type - expected 'enum' but got ${argType}`,
            severity: 'error',
            to: argNode.to,
          });
        } else if (argType === 'Enum') {
          diagnostics.push({
            actions: [],
            from: argNode.from,
            message: `Enum should be a "string"`,
            severity: 'warning',
            to: argNode.to,
          });
        }
        break;
      case 'float':
      case 'integer':
      case 'numeric':
      case 'unsigned':
        if (argType === 'Number') {
          if (dictArg.range === null) {
            break;
          }
          const { max, min } = dictArg.range;
          const nodeTextAsNumber = parseFloat(argText);

          if (nodeTextAsNumber < min || nodeTextAsNumber > max) {
            const message = `Number out of range. Make sure this number is between ${min} and ${max} inclusive.`;
            diagnostics.push({
              actions: [],
              from: argNode.from,
              message,
              severity: 'error',
              to: argNode.to,
            });
          }
        } else {
          diagnostics.push({
            actions: [],
            from: argNode.from,
            message: `Incorrect type - expected 'Number' but got ${argType}`,
            severity: 'error',
            to: argNode.to,
          });
        }
        break;
      case 'fixed_string':
      case 'var_string':
        if (argType !== 'String') {
          diagnostics.push({
            actions: [],
            from: argNode.from,
            message: `Incorrect type - expected 'String' but got ${argType}`,
            severity: 'error',
            to: argNode.to,
          });
        }
        break;
      case 'repeat':
        if (argType !== 'RepeatArgs') {
          diagnostics.push({
            actions: [],
            from: argNode.from,
            message: `Incorrect type - expected 'RepeatArgs' but got ${argType}`,
            severity: 'error',
            to: argNode.to,
          });
        } else {
          const repeatNodes = argNode.getChildren('RepeatArg');
          if ((dictArg.repeat?.min ?? 0) > repeatNodes.length) {
            diagnostics.push({
              actions: [],
              from: argNode.from,
              message: `Repeat command should have at least ${dictArg.repeat?.min ?? 0} arguments`,
              severity: 'error',
              to: argNode.to,
            });
          } else if ((dictArg.repeat?.max ?? Infinity) < repeatNodes.length) {
            diagnostics.push({
              actions: [],
              from: argNode.from,
              message: `Repeat command should have at most ${dictArg.repeat?.max ?? Infinity} arguments`,
              severity: 'error',
              to: argNode.to,
            });
          }
          argNode.getChildren('RepeatArg').forEach(node => {
            diagnostics.push(...validateAndLintArguments(dictArg.repeat?.arguments ?? [], node, command, text));
          });
        }

        break;
    }
    return diagnostics;
  }

  /**
   * Validates the metadata of a command node and returns an array of diagnostics.
   * @param commandNode - The command node to validate.
   * @returns An array of diagnostic objects.
   */
  function validateMetadata(commandNode: SyntaxNode): Diagnostic[] {
    // Get the metadata node of the command node
    const metadataNode = commandNode.getChild('Metadata');
    // If there is no metadata node, return an empty array
    if (!metadataNode) {
      return [];
    }
    // Get the metadata entry nodes of the metadata node
    const metadataEntry = metadataNode.getChildren('MetaEntry');
    // If there are no metadata entry nodes, return an empty array
    if (!metadataEntry) {
      return [];
    }

    const diagnostics: Diagnostic[] = [];

    // Iterate over each metadata entry node
    metadataEntry.forEach(entry => {
      // Get the children nodes of the metadata entry node
      const metadataNodeChildren = getChildrenNode(entry);

      if (metadataNodeChildren.length > 2) {
        diagnostics.push({
          actions: [],
          from: entry.from,
          message: `Should only have a 'key' and a 'value'`,
          severity: 'error',
          to: entry.to,
        });
      } else {
        // Define the template for metadata nodes
        const metadataTemplate = ['Key', 'Value'];
        // Iterate over each template node
        for (let i = 0; i < metadataTemplate.length; i++) {
          // Get the name of the template node
          const templateName = metadataTemplate[i];
          // Get the metadata node of the current template node
          const metadataNode = metadataNodeChildren[i];

          // If there is no metadata node, add a diagnostic
          if (!metadataNode) {
            diagnostics.push({
              actions: [],
              from: entry.from,
              message: `Missing ${templateName}`,
              severity: 'error',
              to: entry.to,
            });
            break;
          }

          // If the name of the metadata node is not the template node name
          if (metadataNode.name !== templateName) {
            // Get the name of the deepest node of the metadata node
            const deepestNodeName = getDeepestNode(metadataNode).name;
            // Add a diagnostic based on the name of the deepest node
            switch (deepestNodeName) {
              case 'String':
                break; // do nothing as it is a string
              case 'Number':
              case 'Enum':
              case 'Boolean':
                diagnostics.push({
                  actions: [],
                  from: metadataNode.from,
                  message: `Incorrect type - expected 'String' but got ${deepestNodeName}`,
                  severity: 'error',
                  to: metadataNode.to,
                });
                break;
              default:
                diagnostics.push({
                  actions: [],
                  from: entry.from,
                  message: `Missing ${templateName}`,
                  severity: 'error',
                  to: entry.to,
                });
            }
          }
        }
      }
    });

    return diagnostics;
  }

  function validateModel(commandNode: SyntaxNode): Diagnostic[] {
    const modelConstainerNode = commandNode.getChild('Models');
    if (!modelConstainerNode) {
      return [];
    }
    const models = modelConstainerNode.getChildren('Model');
    if (!models) {
      return [];
    }

    const diagnostics: Diagnostic[] = [];

    models.forEach(model => {
      const modelChildren = getChildrenNode(model);
      if (modelChildren.length > 3) {
        diagnostics.push({
          actions: [],
          from: model.from,
          message: `Should only have 'Variable', 'value', and 'Offset'`,
          severity: 'error',
          to: model.to,
        });
      } else {
        const modelTemplate = ['Variable', 'Value', 'Offset'];
        for (let i = 0; i < modelTemplate.length; i++) {
          const templateName = modelTemplate[i];
          const modelNode = modelChildren[i];
          if (!modelNode) {
            diagnostics.push({
              actions: [],
              from: model.from,
              message: `Missing ${templateName}`,
              severity: 'error',
              to: model.to,
            });
          }

          if (modelNode.name !== templateName) {
            const deepestNodeName = getDeepestNode(modelNode).name;
            if (deepestNodeName === ERROR) {
              diagnostics.push({
                actions: [],
                from: model.from,
                message: `Missing ${templateName}`,
                severity: 'error',
                to: model.to,
              });
              break;
            } else {
              if (templateName === 'Variable' || templateName === 'Offset') {
                if (deepestNodeName !== 'String') {
                  diagnostics.push({
                    actions: [],
                    from: modelNode.from,
                    message: `Incorrect type - expected 'String' but got ${deepestNodeName}`,
                    severity: 'error',
                    to: modelNode.to,
                  });
                  break;
                }
              } else {
                // Value
                if (deepestNodeName !== 'Number' && deepestNodeName !== 'String' && deepestNodeName !== 'Boolean') {
                  diagnostics.push({
                    actions: [],
                    from: modelNode.from,
                    message: `Incorrect type - expected 'Number', 'String', or 'Boolean' but got ${deepestNodeName}`,
                    severity: 'error',
                    to: modelNode.to,
                  });
                  break;
                }
              }
            }
          }
        }
      }
    });

    return diagnostics;
  }
}
