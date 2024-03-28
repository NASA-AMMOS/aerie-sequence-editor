<svelte:options immutable={true} />

<script lang="ts">
  export let initVal: string;
  export let setInEditor: (val: string) => void;

  let value = unquoteUnescape(initVal);

  $: {
    setInEditor(quoteEscape(value));
  }

  function unquoteUnescape(s: string) {
    if (s.startsWith('\"') && s.endsWith('\"')) {
      return s.slice(1, -1).replaceAll('\\"', '"');
    }
    return s;
  }

  function quoteEscape(s: string) {
    return `"${s.replaceAll('"', '\\"')}"`;
  }

</script>

<div>
  <input bind:value={value} />
</div>
