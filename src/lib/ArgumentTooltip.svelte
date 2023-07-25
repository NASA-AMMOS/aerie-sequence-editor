<svelte:options immutable={true} />

<script lang="ts">
  import type { FswCommandArgument } from '@nasa-jpl/aerie-ampcs';

  export let arg: FswCommandArgument;
</script>

<div class="argument-tooltip">
  <div class="container">
    Argument Name: {arg.name}
    <br />
    Description: {arg.description}
    <br />
    Type: {arg.arg_type}
    <br />
  </div>
</div>

<style>
  .container {
    align-items: center;
    display: flex;
    padding: 5px;
  }
</style>
