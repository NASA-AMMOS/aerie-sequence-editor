import type {
  Args,
  BooleanArgument,
  HexArgument,
  NumberArgument,
  SeqJson,
  StringArgument,
  SymbolArgument,
  RepeatArgument,
  Model,
  Time,
  Metadata,
  VariableDeclaration,
} from '@nasa-jpl/seq-json-schema/types';
import { isArray } from 'lodash-es';
import { logError } from './logger';

/**
 * Transform a sequence JSON time to it's sequence string form.
 */
export function seqJsonTimeToSequence(time: Time): string {
  if (time.type === 'ABSOLUTE') {
    return `abs(${time?.tag ?? ''})`;
  } else if (time.type === 'COMMAND_COMPLETE') {
    return 'cpl';
  } else if (time.type === 'COMMAND_RELATIVE') {
    return `rel(${time?.tag ?? ''})`;
  } else if (time.type === 'EPOCH_RELATIVE') {
    return `epc(${time?.tag ?? ''})`;
  }
  return '';
}

/**
 * Transform a base argument (non-repeat) into a string.
 */
export function seqJsonBaseArgToSequence(
  arg: StringArgument | NumberArgument | BooleanArgument | SymbolArgument | HexArgument,
): string {
  if (arg.type === 'string') {
    // Make sure strings are surrounded in quotes.
    return `"${arg.value}"`;
  } else {
    // All other "base" types just return the raw value.
    return `${arg.value}`;
  }
}

/** transform sequence JSON model to string */

function seqJsonModelSequence(models: Model[]): string {
  return models
    .map((model: Model) => {
      const offset = `"${model.offset}"`;
      const variable = `"${model.variable}"`;
      const value = typeof model.value === 'string' ? `"${model.value}"` : model.value;
      return `model(${variable}, ${value}, ${offset})`;
    })
    .join(' ');
}

export function seqJsonToMetadata(metadata: Metadata): string {
  const entries = Object.entries(metadata);
  const properties = entries.map(([property, value]) => `"${property}":"${value}"`);
  return `\n\nmetadata(\n${properties.join(',\n')})`;
}

export function seqJsonToLocal(local: [VariableDeclaration, ...VariableDeclaration[]]): string {
  return local
    .map(element => {
      return `\n\nlocal(${element.type}, ${element.name})`;
    })
    .join('/n');
}

/**
 * Transforms sequence JSON arguments to a string.
 */
export function seqJsonArgsToSequence(args: Args): string {
  let argsStr = '';

  if (args.length) {
    argsStr += '(';

    for (let i = 0; i < args.length; ++i) {
      const arg = args[i];

      if (arg.type === 'repeat') {
        if (isArray(arg.value) && arg.value.length) {
          argsStr += '[';

          for (let j = 0; j < arg.value.length; ++j) {
            const repeatArgSet = arg.value[j];

            if (isArray(repeatArgSet) && repeatArgSet.length) {
              argsStr += '[';

              for (let k = 0; k < repeatArgSet.length; ++k) {
                const repeatArg = repeatArgSet[k];
                argsStr += seqJsonBaseArgToSequence(repeatArg);

                if (k !== repeatArgSet.length - 1) {
                  argsStr += ', ';
                }
              }

              argsStr += ']';
            } else {
              logError('Repeat arg set value is not an array');
            }

            if (j !== arg.value.length - 1) {
              argsStr += ', ';
            }
          }

          argsStr += ']';
        } else {
          logError('Repeat arg value is not an array');
        }
      } else {
        argsStr += seqJsonBaseArgToSequence(arg);
      }

      if (i !== args.length - 1) {
        argsStr += ', ';
      }
    }

    argsStr += ')';
  }

  return argsStr;
}

/**
 * Transforms a sequence JSON to a sequence string.
 */
export function seqJsonToSequence(seqJson: SeqJson | null): string {
  const sequence: string[] = [];

  if (seqJson) {
    sequence.push(`id("${seqJson.id}")`);

    if (seqJson.metadata) {
      sequence.push(seqJsonToMetadata(seqJson.metadata));
    }

    if (seqJson.locals) {
      sequence.push(seqJsonToLocal(seqJson.locals));
    }

    if (seqJson.steps) {
      sequence.push('\n\n');

      for (const step of seqJson.steps) {
        if (step.type === 'command') {
          const time = seqJsonTimeToSequence(step.time);
          const args = seqJsonArgsToSequence(step.args);
          sequence.push(`${time} ${step.stem}${args}\n`);
        } else if (step.type === 'ground_block') {
          const time = seqJsonTimeToSequence(step.time);
          const description = step.description ? step.description : '';
          const args = step.args ? seqJsonArgsToSequence(step.args) : '';
          const models = step.models ? seqJsonModelSequence(step.models) : '';
          sequence.push(
            `${time} groundBlock("${step.name}"${args}) \n\t  description("${description}") \n\t ${models}\n`,
          );
        }
      }
    }
  }

  return sequence.join('');
}

/**
 * Return a parsed sequence JSON from a file.
 */
export async function parseSeqJsonFromFile(files: FileList | null | undefined): Promise<SeqJson | null> {
  if (files) {
    const file = files.item(0);

    if (file) {
      try {
        const fileText = await file.text();
        const commandDictionary = JSON.parse(fileText);
        return commandDictionary;
      } catch (e) {
        const errorMessage = (e as Error).message;
        logError(errorMessage);
        return null;
      }
    } else {
      logError('No file provided');
      return null;
    }
  } else {
    logError('No file provided');
    return null;
  }
}

/**
 * This function takes an array of Args interfaces and converts it into an object.
 * The interfaces array contains objects matching the ARGS interface.
 * Depending on the type property of each object, a corresponding object with the
 * name and value properties is created and added to the output.
 * Additionally, the function includes a validation function that prevents remote
 * property injection attacks.
 * @param interfaces
 */
function convertInterfacesToArgs(interfaces: Args, _localNames?: String[], _parameterNames?: String[]): object {
  const args = {};

  // Use to prevent a Remote property injection attack
  const validate = (input: string): boolean => {
    const pattern = /^[a-zA-Z0-9_-]+$/;
    const isValid = pattern.test(input);
    return isValid;
  };

  const convertedArgs = interfaces.map(
    (arg: StringArgument | NumberArgument | BooleanArgument | SymbolArgument | HexArgument | RepeatArgument, index) => {
      const argName = arg.name !== undefined ? arg.name : `arg${index}`;

      if (arg.type === 'repeat') {
        if (validate(argName)) {
          return {
            [argName]: arg.value.map(
              (repeatArgBundle: (StringArgument | NumberArgument | BooleanArgument | SymbolArgument | HexArgument)[]) =>
                repeatArgBundle.reduce((obj, item, index) => {
                  const argName = item.name !== undefined ? item.name : `repeat${index}`;
                  if (validate(argName)) {
                    obj[argName] = item.value;
                  }
                  return obj;
                }, {}),
            ),
          };
        }
        return { repeat_error: 'Remote property injection detected...' };
        // } else if (arg.type === 'symbol') {
        //   if (validate(argName)) {
        //     /**
        //      * We don't have access to the actual type of the variable, as it's not included in
        //      * the sequential JSON. However, we don't need the type at this point in the code. Instead,
        //      * we create a variable object with a default type of "INT". Later on in the code, the
        //      * variable will be used to generate "local.<name>" or "parameter.<name>" syntax in the toEDSLString() method.
        //      */
        //     let variable = Variable.new({ name: arg.value, type: VariableType.INT });
        //     if (localNames && localNames.includes(arg.value)) {
        //       variable.setKind('locals');
        //     } else if (parameterNames && parameterNames.includes(arg.value)) {
        //       variable.setKind('parameters');
        //     } else {
        //       const errorMsg = `Variable '${arg.value}' is not defined as a local or parameter\n`;
        //       variable = Variable.new({ name: `${arg.value} //ERROR: ${errorMsg}`, type: VariableType.INT });
        //       variable.setKind('unknown');
        //     }
        //     return { [argName]: variable };
        //   }
        //   return { symbol_error: 'Remote property injection detected...' };
        //   // @ts-ignore : 'HexArgument' found in JSON Spec
        // } else if (arg.type === 'hex') {
        //   if (validate(argName)) {
        //     // @ts-ignore : 'HexArgument' found in JSON Spec
        //     return { [argName]: { hex: arg.value } };
        //   }
        //   return { hex_error: 'Remote property injection detected...' };
        // }
      } else {
        if (validate(argName)) {
          return { [argName]: arg.value };
        }
        return { error: 'Remote property injection detected...' };
      }
    },
  );

  for (const key in convertedArgs) {
    Object.assign(args, convertedArgs[key]);
  }

  return args;
}

/**
 * Converts an object of arguments to an array string representation,
 * preserving the position-based structure of the arguments.
 *
 * @template A - Type parameter representing the type of the arguments.
 * @param {A} args - The arguments to convert.
 * @returns {string} - The string representation of the arguments.
 */
function argumentsToPositionString(args: object): string {
  let output = '';

  function printObject(obj: { [argName: string]: any }) {
    Object.keys(obj).forEach((key, index) => {
      const value = obj[key];

      if (Array.isArray(value)) {
        if (index > 0) output += ',';
        output += `[`;
        printArray(value);
        output += `]`;
      } else if (typeof value === 'object') {
        // if (value instanceof Variable) {
        //   if (index > 0) output += ',';
        //   output += `${value.toReferenceString()}`;
        // } else {
        if (index > 0) output += ',';
        output += `[`;
        printValue(value);
        output += `]`;
        // }
      } else {
        if (index > 0) output += ',';
        output += `${typeof value === 'string' ? `"${value}"` : value}`;
      }
    });
  }

  function printArray(array: any[]) {
    array.forEach((item, index) => {
      if (index > 0) output += ',';
      output += `[`;
      printValue(item);
      output += `]`;
    });
  }

  function printValue(value: any) {
    if (Array.isArray(value)) {
      printArray(value);
    } else if (typeof value === 'object') {
      printObject(value);
    } else {
      output += `${typeof value === 'string' ? `"${value}"` : value}`;
    }
  }

  if (Array.isArray(args)) {
    printArray(args);
  } else if (typeof args === 'object') {
    printObject(args);
  } else {
    output += `${typeof args === 'string' ? `"${args}"` : args}`;
  }

  return output;
}
