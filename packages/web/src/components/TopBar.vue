<script setup lang="ts">
import type { MeResponse } from '@ocis-dashboard/core';
import { computed } from 'vue';
import { useTheme } from '../composables/useTheme';

const props = defineProps<{ me?: MeResponse }>();
defineEmits<{ signOut: [] }>();

const theme = useTheme();

const signedIn = computed(
  () => !!props.me && !props.me.demo && (props.me.atlassian.connected || props.me.github.connected),
);
</script>

<template>
  <header class="top-bar">
    <span class="wordmark" title="Look, Every Fix Tracked"
      >LEFT <span class="wordmark-light">No ticket behind</span></span
    >
    <div class="top-bar-end">
      <select v-model="theme" aria-label="Theme" title="Colour theme">
        <option value="system">System theme</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
      <span v-if="me?.demo" class="demo-badge" title="DEMO_MODE is on: sample data, no sign-in">
        Sample data
      </span>
      <template v-if="signedIn && me">
        <span
          v-if="me.atlassian.connected"
          class="account"
          :title="`Atlassian account ${me.atlassian.id}`"
        >
          {{ me.atlassian.name }}
        </span>
        <span v-if="me.github.connected" class="account identifier" title="GitHub account">
          @{{ me.github.id }}
        </span>
        <button class="quiet-button" @click="$emit('signOut')">Sign out</button>
      </template>
    </div>
  </header>
</template>
