<script setup lang="ts">
import { SORT_LABELS, type AssigneeFilter, type BranchOption, type SortKey } from '../lib/view';

defineProps<{
  people: { id: string; name: string }[];
  branches: BranchOption[];
  /** More than one repo selected: name the repo next to each branch. */
  multiRepo: boolean;
}>();
const search = defineModel<string>('search', { required: true });
const assignee = defineModel<AssigneeFilter>('assignee', { required: true });
/** Encoded `BranchFilter`; empty for any branch. */
const branch = defineModel<string>('branch', { required: true });
const sort = defineModel<SortKey>('sort', { required: true });
</script>

<template>
  <div class="control-group filters">
    <input
      v-model="search"
      type="search"
      aria-label="Find a ticket"
      placeholder="Find by key or summary"
    />
    <select v-model="assignee" aria-label="Assignee">
      <option value="all">Anyone</option>
      <option value="me">Assigned to me</option>
      <option value="unassigned">Unassigned</option>
      <optgroup v-if="people.length > 0" label="Assignee">
        <option v-for="person in people" :key="person.id" :value="person.id">
          {{ person.name }}
        </option>
      </optgroup>
    </select>
    <select v-model="branch" aria-label="Branch" :disabled="branches.length === 0">
      <option value="">Any branch</option>
      <optgroup
        v-for="option in branches"
        :key="`${option.repo}|${option.branch}`"
        :label="multiRepo ? `${option.branch} (${option.repo})` : option.branch"
      >
        <option :value="`${option.repo}|${option.branch}|any`">
          Needs {{ option.branch }} ({{ option.total }})
        </option>
        <option v-if="option.missing > 0" :value="`${option.repo}|${option.branch}|missing`">
          Missing on {{ option.branch }} ({{ option.missing }})
        </option>
        <option v-if="option.open > 0" :value="`${option.repo}|${option.branch}|open`">
          Open on {{ option.branch }} ({{ option.open }})
        </option>
      </optgroup>
    </select>
    <select v-model="sort" aria-label="Sort by" title="Dates sort newest first">
      <option v-for="(label, key) in SORT_LABELS" :key="key" :value="key">Sort: {{ label }}</option>
    </select>
  </div>
</template>
