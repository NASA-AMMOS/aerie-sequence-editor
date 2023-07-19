<svelte:options immutable={true} />

<script lang="ts">
  import type { FswCommand, HwCommand } from '@nasa-jpl/aerie-ampcs';

  export let command: FswCommand | HwCommand;
</script>

<div class="command-tooltip">
  <div class="container">
    {command.stem}
  </div>
  <hr />
  <div class="container">
    {command.description}
  </div>
</div>

<style>
  .container {
    align-items: center;
    display: flex;
    padding: 5px;
  }
</style>
