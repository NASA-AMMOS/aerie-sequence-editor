import { CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import {
  LRLanguage,
  LanguageSupport,
  delimitedIndent,
  foldInside,
  foldNodeProp,
  indentNodeProp,
} from '@codemirror/language';
import { styleTags, tags as t } from '@lezer/highlight';
import { parser } from './sequence.grammar';
import { customFoldInside } from './utilities/custom-folder';

export const SeqLanguage = LRLanguage.define({
  parser: parser.configure({
    props: [
      indentNodeProp.add({
        Application: delimitedIndent({ closing: ')', align: false }),
      }),
      foldNodeProp.add({
        Application: foldInside,
        GroundBlock: customFoldInside,
        Command: customFoldInside,
      }),
      styleTags({
        Boolean: t.bool,
        String: t.string,
        LineComment: t.comment,
        Model: t.namespace,
        MetaEntry: t.namespace,
        Global: t.namespace,
        Stem: t.keyword,
        TimeRelative: t.className,
        TimeComplete: t.className,
        TimeAbsolute: t.className,
        TimeEpoch: t.className,
        ImmediateCommands: t.namespace,
        HardwareCommands: t.namespace,
        LoadAndGoDirective: t.namespace,
        LocalDeclaration: t.namespace,
        ParameterDeclaration: t.namespace,
        IdDeclaration: t.namespace,
      }),
    ],
  }),
  languageData: {
    commentTokens: { line: '#' },
  },
});

export function seq(autocomplete?: (context: CompletionContext) => CompletionResult | null) {
  if (autocomplete) {
    const autocompleteExtension = SeqLanguage.data.of({ autocomplete });
    return new LanguageSupport(SeqLanguage, [autocompleteExtension]);
  } else {
    return new LanguageSupport(SeqLanguage);
  }
}
