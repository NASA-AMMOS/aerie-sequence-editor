<svelte:options immutable={true} />

<script lang="ts">
  import type { CommandDictionary } from '@nasa-jpl/aerie-ampcs';
  import type { SyntaxNode } from '@lezer/common';
  import type { EditorState } from '@codemirror/state';

  import EnumEditor from './enum-editor.svelte';
  import NumEditor from './num-editor.svelte';
  import StringEditor from './string-editor.svelte';
  import type { EditorView } from 'codemirror';

  export let editorSequenceView: EditorView | null;
  export let commandDictionary: CommandDictionary | null;
  export let node: SyntaxNode | null;

  $: commandDef = getCommandDef(commandDictionary, editorSequenceView?.state, node);
  $: argInfo = getArgumentInfo(node?.getChild('Args') ?? null);


  // console.table({editorSequenceView});

  function getArgumentInfo(args: SyntaxNode | null) {
    const argArray: {node: SyntaxNode, text: string}[] = [];
    let node = args?.firstChild;
    while (!!node) {
      argArray.push({node, text: editorSequenceView?.state.sliceDoc(node.from, node.to) ?? ''});
      node = node.nextSibling;
    }
    return argArray;
  }

  // function updateEditor() {
  //   let transaction = view.state.update({changes: {from: 0, insert: "0"}})
  //   console.log(transaction.state.doc.toString()) // "0123"
  //   // At this point the view still shows the old state.
  //   view.dispatch(transaction)
  //     // const cursor: TreeCursor = syntaxTree(view.state).cursor();
  // }

  function getCommandDef(commandDictionary: CommandDictionary | null, state: EditorState | undefined, node: SyntaxNode | null) {

    if (!commandDictionary || !state || !node) {
      return null;
    }

    let commandNode: SyntaxNode | null = node;
    while (commandNode && commandNode.name !== 'Command') {
      commandNode = commandNode.parent;
    }

    const stemNode = commandNode?.getChild('Stem');

    if (stemNode) {
      const stemName = state.sliceDoc(stemNode.from, stemNode.to);
      const cmd = commandDictionary.fswCommandMap[stemName];
      return cmd;
    }

    return null;
  }

  function setInEditor(token: SyntaxNode, val: string) {
    if (editorSequenceView) {
      // let transaction = editorSequenceView.state.update({changes: {from: 0, insert: val}});
      let transaction = editorSequenceView.state.update({changes: {from: token.node.from, to: token.node.to, insert: val}});
      editorSequenceView.dispatch(transaction);
    }
  }

</script>


<div class="grid">
  {#if commandDictionary === null}
    No Dictionary Loaded
  {:else}
    <div>Selected Command</div>
    {#if !!commandDef}
      <div>{commandDef.stem}</div>
      <hr />
      {#each commandDef.arguments as argDef, index }
        <div title={argDef.description}>
          {argDef.name} - {argDef.arg_type}
        </div>
        {#if argDef.arg_type === 'enum'}
          <EnumEditor {commandDictionary} {argDef} />
        {:else if argDef.arg_type === 'unsigned' || argDef.arg_type === 'float' || argDef.arg_type === 'integer' || argDef.arg_type === 'numeric'}
          <NumEditor {argDef} />
        {:else if argDef.arg_type === 'var_string' || argDef.arg_type === 'fixed_string'}
          <StringEditor
            initVal={argInfo[index]?.text ?? ''}
            setInEditor={(val) => {
              if (argInfo[index]?.node) {

                setInEditor(argInfo[index]?.node, val);
              }
            }}
          />
        {:else}
          <div>TODO</div>
        {/if}
      {/each}
    {/if}
  {/if}
</div>
