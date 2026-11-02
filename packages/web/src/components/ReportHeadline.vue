<script setup lang="ts">
import { computed } from 'vue';
import { plural } from '../lib/format';
import type { MarkedReport } from '../lib/marks';
import { FLAG_ORDER, FLAGS, flagCounts, isWait, type ProblemFilter } from '../lib/view';

const props = defineProps<{
  title: string;
  subtitle?: string;
  /** Tickets after the other filters, before the problem filter; undefined until loaded. */
  reports?: MarkedReport[];
}>();
const problem = defineModel<ProblemFilter>('problem', { required: true });

const counts = computed(() => flagCounts(props.reports ?? []));
const attention = computed(() => (props.reports ?? []).filter((r) => r.flags.length > 0).length);
const marked = computed(
  () => (props.reports ?? []).filter((r) => r.mark?.state === 'active').length,
);
const sentence = computed(() => {
  const total = props.reports?.length ?? 0;
  if (total === 0) return 'No tickets.';
  const byHand = marked.value > 0 ? ` (${marked.value} marked fixed by you)` : '';
  if (attention.value === 0)
    return `All ${plural(total, 'ticket')} are linked and backported${byHand}.`;
  return `${attention.value} of ${plural(total, 'ticket')} need attention${byHand}.`;
});

const visibleFlags = computed(() =>
  FLAG_ORDER.filter((code) => (counts.value.get(code) ?? 0) > 0 || problem.value === code),
);

function choose(value: ProblemFilter) {
  problem.value = problem.value === value ? 'all' : value;
}
</script>

<template>
  <section class="headline" :aria-live="reports ? 'polite' : undefined">
    <div class="headline-title">
      <h1>{{ title }}</h1>
      <span v-if="subtitle" class="headline-subtitle">{{ subtitle }}</span>
    </div>
    <template v-if="reports">
      <p class="headline-sentence">{{ sentence }}</p>
      <div class="problem-pills" role="group" aria-label="Show tickets">
        <button class="problem-pill" :aria-pressed="problem === 'all'" @click="problem = 'all'">
          All tickets <span class="count">{{ reports.length }}</span>
        </button>
        <button
          class="problem-pill"
          :aria-pressed="problem === 'attention'"
          :disabled="attention === 0 && problem !== 'attention'"
          @click="choose('attention')"
        >
          Need attention <span class="count">{{ attention }}</span>
        </button>
        <button
          v-for="code in visibleFlags"
          :key="code"
          class="problem-pill"
          :data-tone="isWait(code) ? 'wait' : 'fix'"
          :aria-pressed="problem === code"
          @click="choose(code)"
        >
          {{ FLAGS[code].label }} <span class="count">{{ counts.get(code) ?? 0 }}</span>
        </button>
        <button
          v-if="marked > 0 || problem === 'marked'"
          class="problem-pill"
          :aria-pressed="problem === 'marked'"
          @click="choose('marked')"
        >
          Marked fixed <span class="count">{{ marked }}</span>
        </button>
      </div>
    </template>
  </section>
</template>
