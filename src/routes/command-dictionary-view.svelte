<svelte:options immutable={true} />

<script lang="ts">
  import type { CommandDictionary } from '@nasa-jpl/aerie-ampcs';

  export let commandDictionary: CommandDictionary | null;
</script>


<div class="grid">
  {#if commandDictionary === null}
    No Dictionary Loaded
  {:else}

  {/if}
</div>
