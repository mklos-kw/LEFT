<script setup lang="ts">
import { ref } from 'vue';
import { copyJson } from '../lib/clipboard';

/** An icon button that copies `data` to the clipboard as pretty-printed JSON. */
const props = defineProps<{
  data: unknown;
  label: string;
}>();

const copied = ref(false);

async function copy() {
  await copyJson(props.data);
  copied.value = true;
  setTimeout(() => (copied.value = false), 1500);
}
</script>

<template>
  <button
    class="icon-button"
    type="button"
    :aria-label="label"
    :title="copied ? 'Copied' : label"
    @click="copy"
  >
    <svg
      viewBox="0 0 16 16"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      :stroke-width="copied ? 1.6 : 1.3"
      aria-hidden="true"
    >
      <template v-if="!copied">
        <rect x="4.5" y="3.5" width="8" height="10.5" rx="1.5" />
        <path d="M6.5 3.5V2.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1" />
      </template>
      <path v-else d="M3.5 8.5l3 3 6-6" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
    <span v-if="copied" class="visually-hidden">Copied</span>
  </button>
</template>
