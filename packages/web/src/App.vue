<script setup lang="ts">
import type { MeResponse } from '@ocis-dashboard/core';
import { computed } from 'vue';
import { api } from './api';
import ReleaseDashboard from './components/ReleaseDashboard.vue';
import ErrorBanner from './components/ErrorBanner.vue';
import SignIn from './components/SignIn.vue';
import TopBar from './components/TopBar.vue';
import { dataOr, useAsync } from './composables/useAsync';

const AUTH_ERRORS: Record<string, string> = {
  access_denied: 'Sign-in was cancelled.',
  invalid_state: 'The sign-in link expired. Try signing in again.',
  atlassian_login_failed: 'Atlassian sign-in failed. Check the server log for details.',
  github_login_failed: 'GitHub sign-in failed. Check the server log for details.',
};

const { state: meState, reload: reloadMe } = useAsync<MeResponse>('me', (signal) => api.me(signal));
const user = computed(() => dataOr(meState.value, undefined));
const connected = computed(
  () => !!user.value && user.value.atlassian.connected && user.value.github.connected,
);

// Anyone can put text in a link, so only known codes are shown; anything else gets a generic text.
const authError = new URLSearchParams(window.location.search).get('authError');
const authErrorText = authError ? (AUTH_ERRORS[authError] ?? 'Sign-in failed. Try again.') : null;
// Show it once: a reload or a bookmark shouldn't bring the message back.
if (authError) {
  const url = new URL(window.location.href);
  url.searchParams.delete('authError');
  window.history.replaceState(window.history.state, '', url);
}

async function signOut() {
  await api.logout();
  reloadMe();
}
</script>

<template>
  <div class="app">
    <TopBar :me="user" @sign-out="signOut" />
    <ErrorBanner v-if="authErrorText" :message="authErrorText" />
    <ErrorBanner
      v-if="meState.status === 'error'"
      message="The dashboard server is not reachable. Is it running?"
      :retry="reloadMe"
    />
    <SignIn v-if="user && !connected" :me="user" />
    <ReleaseDashboard v-if="user && connected" :me="user" />
  </div>
</template>
