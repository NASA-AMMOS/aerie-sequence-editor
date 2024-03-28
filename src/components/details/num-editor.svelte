<svelte:options immutable={true} />

<script lang="ts">
  import type { FswCommandArgument } from '@nasa-jpl/aerie-ampcs';

  export let argDef: FswCommandArgument;

  $: min = argDef.arg_type === 'unsigned' ? 0 : undefined;
</script>

<div>
  <input type="number" min={min}  />
</div>
