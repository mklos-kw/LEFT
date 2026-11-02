<script setup lang="ts">
import type { GitHubIssueRef, MatchSource, TicketReport } from '@ocis-dashboard/core';
import { computed } from 'vue';
import { FLAGS } from '../lib/view';

/** Explains the row: what to fix, what each PR is and why it belongs to the ticket. */
const props = defineProps<{ report: TicketReport }>();

/** Linked and unlinked issues in one list, each issue once. */
const issues = computed(() => {
  const byUrl = new Map<string, { issue: GitHubIssueRef; linked: boolean }>();
  for (const issue of props.report.unlinkedIssues) byUrl.set(issue.url, { issue, linked: false });
  for (const issue of props.report.issues) byUrl.set(issue.url, { issue, linked: true });
  return [...byUrl.values()];
});

const SOURCE_TEXT: Record<MatchSource, string> = {
  title: 'key in the title',
  branch: 'key in the branch name',
  'jira-link': 'linked from Jira',
  'backport-of': 'says it backports a PR of this ticket',
};
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
