<script setup lang="ts">
import { computed } from 'vue';
import { ApiRequestError, loginUrl } from '../api';

/** A failure, with the one action most likely to fix it. */
const props = defineProps<{
  message?: string;
  error?: Error;
  /** Shown as "Try again" when signing in again would not help. */
  retry?: () => void;
}>();

const reconnect = computed(() => {
  const { error } = props;
  return error instanceof ApiRequestError && error.detail.error === 'not_connected'
    ? error.detail.provider
    : undefined;
});
</script>

<template>
  <div class="error-banner" role="alert">
    <p>{{ message ?? error?.message }}</p>
    <a v-if="reconnect" class="primary-button" :href="loginUrl(reconnect)">Sign in again</a>
    <button v-else-if="retry" class="secondary-button" @click="retry()">Try again</button>
  </div>
</template>
