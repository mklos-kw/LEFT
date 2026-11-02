<script setup lang="ts">
import { computed } from 'vue';
import type { ReportState } from '../composables/useReport';
import { formatTime } from '../lib/format';
import { describeProgress } from '../lib/progress';

/** Says what the dashboard is doing right now: which step, how far, and how fresh the data is. */
const props = defineProps<{ state: ReportState }>();
defineEmits<{ refresh: [] }>();

const progress = computed(() => describeProgress(props.state.progress));
</script>

<template>
  <div v-if="state.status === 'loading'" class="load-status loading" role="status">
    <div
      class="progress"
      role="progressbar"
      aria-label="Loading report"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-valuenow="Math.round(progress.fraction * 100)"
    >
      <div class="progress-fill" :style="{ transform: `scaleX(${progress.fraction})` }" />
    </div>
    <p>
      {{ progress.label }}
      <span v-if="progress.count" class="progress-count">({{ progress.count }})</span>
      <span v-if="state.data" class="hint"> The table shows the previous result.</span>
    </p>
  </div>
  <div v-else-if="state.data" class="load-status" role="status">
    <p class="hint">
      {{ state.status === 'error' ? 'Refresh failed. Showing data from' : 'Updated at' }}
      {{ formatTime(state.data.generatedAt) }}
    </p>
    <button
      class="quiet-button"
      title="Fetch fresh data from Jira and GitHub"
      @click="$emit('refresh')"
    >
      Refresh
    </button>
  </div>
</template>
