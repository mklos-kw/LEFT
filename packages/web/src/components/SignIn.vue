<script setup lang="ts">
import type { MeResponse } from '@ocis-dashboard/core';
import { loginUrl, type Provider } from '../api';

const props = defineProps<{ me: MeResponse }>();

const steps: { provider: Provider; title: string; purpose: string }[] = [
  {
    provider: 'atlassian',
    title: 'Sign in with Atlassian',
    purpose: "Reads the sprint's tickets, fix versions and Jira links.",
  },
  {
    provider: 'github',
    title: 'Sign in with GitHub',
    purpose: 'Finds the pull requests and backports for each ticket.',
  },
];
</script>

<template>
  <main class="sign-in">
    <h1>See whether every fix in a sprint is linked and backported.</h1>
    <p class="lead">
      The dashboard reads Jira and GitHub with your own accounts. It only shows what you can already
      see there, and it stores nothing.
    </p>
    <ol class="steps">
      <li
        v-for="step in steps"
        :key="step.provider"
        class="step"
        :class="{ done: props.me[step.provider].connected }"
      >
        <div>
          <h2>{{ step.title }}</h2>
          <p>{{ step.purpose }}</p>
        </div>
        <span v-if="props.me[step.provider].connected" class="step-done">
          Signed in as {{ props.me[step.provider].name }}
        </span>
        <a v-else class="primary-button" :href="loginUrl(step.provider)">{{ step.title }}</a>
      </li>
    </ol>
  </main>
</template>
