<script lang="ts">
export interface RepoEntry {
  name: string;
  /** Included in the report; switched-off repos stay in the list for later. */
  enabled: boolean;
}

export const DEFAULT_REPOS: RepoEntry[] = [{ name: 'owncloud/ocis', enabled: true }];

/** Adds `name` to the list, or switches it on if it is already there. */
export function withRepo(repos: RepoEntry[], name: string): RepoEntry[] {
  return repos.some((r) => r.name === name)
    ? repos.map((r) => (r.name === name ? { ...r, enabled: true } : r))
    : [...repos, { name, enabled: true }];
}
</script>

<script setup lang="ts">
import { isRepoName, normalizeRepo } from '@ocis-dashboard/core';
import { computed, ref } from 'vue';

const repos = defineModel<RepoEntry[]>({ required: true });
const adding = ref(false);
const draft = ref('');

const candidate = computed(() => normalizeRepo(draft.value));
const duplicate = computed(() => repos.value.some((repo) => repo.name === candidate.value));
const valid = computed(() => isRepoName(candidate.value) && !duplicate.value);

function add() {
  if (!valid.value) return;
  repos.value = [...repos.value, { name: candidate.value, enabled: true }];
  draft.value = '';
  adding.value = false;
}

function toggle(name: string) {
  repos.value = repos.value.map((r) => (r.name === name ? { ...r, enabled: !r.enabled } : r));
}

function remove(name: string) {
  repos.value = repos.value.filter((r) => r.name !== name);
}

/** Focuses the input when it appears. */
const vFocus = { mounted: (el: HTMLElement) => el.focus() };
</script>

<template>
  <div class="control-group" role="group" aria-label="Repositories">
    <span v-for="repo in repos" :key="repo.name" class="repo-toggle" :data-enabled="repo.enabled">
      <button
        class="repo-name identifier"
        :aria-pressed="repo.enabled"
        :title="repo.enabled ? 'Included; click to leave out' : 'Left out; click to include'"
        @click="toggle(repo.name)"
      >
        {{ repo.name }}
      </button>
      <button
        v-if="repos.length > 1"
        class="repo-remove"
        :aria-label="`Remove ${repo.name}`"
        @click="remove(repo.name)"
      >
        ×
      </button>
    </span>

    <form v-if="adding" class="add-repo" @submit.prevent="add">
      <input
        v-model="draft"
        v-focus
        aria-label="Repository to add"
        placeholder="owner/repo"
        class="identifier"
        @keydown.esc="adding = false"
      />
      <button type="submit" class="secondary-button" :disabled="!valid">Add</button>
      <span v-if="duplicate" class="hint">Already in the list</span>
    </form>
    <button v-else class="quiet-button" @click="adding = true">Add repository</button>
  </div>
</template>
