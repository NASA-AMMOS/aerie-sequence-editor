<svelte:options immutable={true} />

<script lang="ts">
  import type { CommandDictionary, Enum, FswCommandArgument, FswCommandArgumentEnum } from '@nasa-jpl/aerie-ampcs';

  export let argDef: FswCommandArgument;
  export let commandDictionary: CommandDictionary;

  $: argDefEnum = argDef as FswCommandArgumentEnum;

</script>

<div>
  <select>
    {#each commandDictionary.enumMap[argDefEnum.enum_name].values as ev }
      <option>
        {ev.symbol}
      </option>
    {/each}
  </select>
</div>
