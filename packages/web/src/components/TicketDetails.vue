<script setup lang="ts">
import type { FlagAction, GitHubIssueRef, TicketReport } from '@ocis-dashboard/core';
import { computed, ref } from 'vue';
import { FLAGS, SOURCE_TEXT } from '../lib/view';

/** Explains the row: what to fix, what each PR is and why it belongs to the ticket. */
const props = defineProps<{ report: TicketReport }>();

/** The URL just copied, so its button can say so for a moment. */
const copied = ref<string>();

async function copy(action: FlagAction) {
  await navigator.clipboard.writeText(action.url);
  copied.value = action.url;
  setTimeout(() => {
    if (copied.value === action.url) copied.value = undefined;
  }, 2000);
}

/** Linked and unlinked issues in one list, each issue once. */
const issues = computed(() => {
  const byUrl = new Map<string, { issue: GitHubIssueRef; linked: boolean }>();
  for (const issue of props.report.unlinkedIssues) byUrl.set(issue.url, { issue, linked: false });
  for (const issue of props.report.issues) byUrl.set(issue.url, { issue, linked: true });
  return [...byUrl.values()];
});
</script>

<template>
  <div class="details">
    <section>
      <h3>What to do</h3>
      <p v-if="report.flags.length === 0" class="hint">
        Nothing. Every PR is linked both ways and the fix is on every branch its fix versions need.
      </p>
      <ul v-else class="fix-list">
        <li
          v-for="(flag, i) in report.flags"
          :key="i"
          :data-tone="flag.severity === 'error' ? 'fix' : 'wait'"
        >
          <strong>{{ flag.message }}.</strong> {{ FLAGS[flag.code].hint }}
          <span v-if="flag.actions" class="flag-actions">
            <template v-for="action in flag.actions" :key="action.label">
              <button v-if="action.copy" class="inline-button" @click="copy(action)">
                {{ copied === action.url ? 'Copied' : action.label }}
              </button>
              <a v-else :href="action.url" target="_blank" rel="noreferrer">{{ action.label }}</a>
            </template>
          </span>
        </li>
      </ul>
    </section>

    <section>
      <h3>Pull requests ({{ report.prs.length }})</h3>
      <p v-if="report.prs.length === 0" class="hint">None found in the selected repositories.</p>
      <ul v-else class="pr-list">
        <li v-for="{ pr, sources } in report.prs" :key="pr.url">
          <span class="pr-state" :data-state="pr.state">{{ pr.state }}</span>
          <a class="identifier" :href="pr.url" target="_blank" rel="noreferrer">
            {{ pr.repo }}#{{ pr.number }}
          </a>
          {{ pr.title }}
          <p class="hint">
            Into <span class="identifier">{{ pr.baseRef }}</span>
            <template v-if="pr.author"> by {{ pr.author }}</template
            >. Found by {{ sources.map((s) => SOURCE_TEXT[s]).join(', ') }}.
          </p>
        </li>
      </ul>

      <template v-if="report.mentions.length > 0">
        <h4>Only mentioned in</h4>
        <ul class="pr-list">
          <li v-for="pr in report.mentions" :key="pr.url">
            <a class="identifier" :href="pr.url" target="_blank" rel="noreferrer">
              {{ pr.repo }}#{{ pr.number }}
            </a>
            {{ pr.title }}
            <p class="hint">
              The key appears only in the description, so it does not count as this ticket's PR.
            </p>
          </li>
        </ul>
      </template>
    </section>

    <section v-if="issues.length > 0">
      <h3>GitHub issues</h3>
      <ul class="pr-list">
        <li v-for="{ issue, linked } in issues" :key="issue.url">
          <a class="identifier" :href="issue.url" target="_blank" rel="noreferrer">
            {{ issue.repo }}#{{ issue.number }}
          </a>
          {{ issue.title }}
          <p class="hint">
            {{
              linked
                ? 'Linked to a PR of this ticket.'
                : 'Mentions the key, but no PR of this ticket is linked to it.'
            }}
          </p>
        </li>
      </ul>
    </section>
  </div>
</template>
