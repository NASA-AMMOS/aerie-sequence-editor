<svelte:options immutable={true} />

<script lang="ts">
  import type { FswCommandArgument } from '@nasa-jpl/aerie-ampcs';

  export let arg: FswCommandArgument;
</script>

<div class="argument-tooltip">
  <div class="container">
    Name: {arg.name}
    <br />
    Type: {arg.arg_type}
    <br />
    Description: {arg.description}

    {#if arg.arg_type === 'enum'}
      <br />
      Enum Name: {arg.enum_name}
    {/if}

    {#if arg.arg_type === 'boolean' || arg.arg_type === 'enum' || arg.arg_type === 'float' || arg.arg_type === 'integer' || arg.arg_type === 'numeric' || arg.arg_type === 'time' || arg.arg_type === 'unsigned' || arg.arg_type === 'var_string'}
      <br />
      Default Value: {arg.default_value ?? 'None'}
    {/if}

    {#if arg.arg_type === 'float' || arg.arg_type === 'integer' || arg.arg_type === 'numeric' || arg.arg_type === 'unsigned'}
      <br />
      Range: {arg.range ? `[${arg.range.min}, ${arg.range.max}]` : 'None'}
    {/if}

    {#if arg.arg_type === 'float' || arg.arg_type === 'integer' || arg.arg_type === 'numeric' || arg.arg_type === 'time' || arg.arg_type === 'unsigned'}
      <br />
      Units: {arg.units === 'none' ? 'None' : arg.units}
    {/if}

    {#if arg.arg_type === 'boolean' || arg.arg_type === 'enum' || arg.arg_type === 'float' || arg.arg_type === 'integer' || arg.arg_type === 'numeric' || arg.arg_type === 'time' || arg.arg_type === 'unsigned'}
      <br />
      Bit Length: {arg.bit_length ?? 'None'}
    {/if}

    {#if arg.arg_type === 'repeat' || arg.arg_type === 'var_string'}
      <br />
      Prefix Bit Length: {arg.prefix_bit_length ?? 'None'}
    {/if}
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
