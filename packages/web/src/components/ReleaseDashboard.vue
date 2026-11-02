<script setup lang="ts">
import type {
  BoardsResponse,
  MeResponse,
  ReportSelection,
  Sprint,
  SprintsResponse,
} from '@ocis-dashboard/core';
import { computed, ref, watch } from 'vue';
import { api } from '../api';
import { dataOr, useAsync } from '../composables/useAsync';
import { useLocalStorage } from '../composables/useLocalStorage';
import { useReport, type ReportRequest } from '../composables/useReport';
import { daysAgo, formatRange } from '../lib/format';
import { applyMarks, markFor, type FixedMarks } from '../lib/marks';
import {
  assignees,
  branchOptions,
  decodeBranchFilter,
  filterReports,
  type AssigneeFilter,
  type ProblemFilter,
} from '../lib/view';
import ErrorBanner from './ErrorBanner.vue';
import TicketFilters from './TicketFilters.vue';
import ReportHeadline from './ReportHeadline.vue';
import LoadStatus from './LoadStatus.vue';
import RepoPicker, { DEFAULT_REPOS, withRepo, type RepoEntry } from './RepoPicker.vue';
import SelectionControls, { type SelectionMode } from './SelectionControls.vue';
import SkeletonTable from './SkeletonTable.vue';
import TicketTable from './TicketTable.vue';

const props = defineProps<{ me: MeResponse }>();

const SPRINT_STATE_TEXT: Record<Sprint['state'], string> = {
  active: 'current sprint',
  future: 'upcoming sprint',
  closed: 'past sprint',
};

// What to load (persisted where it is a preference, not a one-off choice).
const mode = useLocalStorage<SelectionMode>('mode', 'sprint');
const repos = useLocalStorage<RepoEntry[]>('repos', DEFAULT_REPOS);
const storedBoardId = useLocalStorage<number | null>('boardId', null);
/** Tickets marked fixed by hand, by key. Kept across sprints and reloads. */
const fixedMarks = useLocalStorage<FixedMarks>('fixedMarks', {});
const chosenSprintId = ref<number | null>(null);
const dates = ref({ from: daysAgo(13), to: daysAgo(0) });

// How to filter what was loaded.
const problem = ref<ProblemFilter>('all');
const assignee = ref<AssigneeFilter>('all');
const search = ref('');
const branch = ref('');

// Boards and sprints.
const { state: boardsState, reload: reloadBoards } = useAsync<BoardsResponse>('boards', (signal) =>
  api.boards(signal),
);
const boardList = computed(() => dataOr(boardsState.value, { boards: [] }).boards);
const boardId = computed({
  get: () =>
    boardList.value.some((b) => b.id === storedBoardId.value)
      ? storedBoardId.value
      : (boardList.value[0]?.id ?? null),
  set: (id) => {
    storedBoardId.value = id;
    chosenSprintId.value = null;
  },
});

const { state: sprintsState, reload: reloadSprints } = useAsync<SprintsResponse>(
  () => (boardId.value === null ? null : `sprints:${boardId.value}`),
  (signal) => api.sprints(boardId.value!, signal),
);
const sprintList = computed(() => dataOr(sprintsState.value, { sprints: [] }).sprints);
const sprint = computed(
  () =>
    sprintList.value.find((s) => s.id === chosenSprintId.value) ??
    sprintList.value.find((s) => s.state === 'active') ??
    sprintList.value[0],
);
const sprintId = computed({
  get: () => sprint.value?.id ?? null,
  set: (id) => (chosenSprintId.value = id),
});
const sprintsLoading = computed(
  () => boardsState.value.status === 'loading' || sprintsState.value.status === 'loading',
);

// The report.
const enabledRepos = computed(() => repos.value.filter((r) => r.enabled).map((r) => r.name));
const request = computed<ReportRequest | null>(() => {
  let selection: ReportSelection | null = null;
  if (mode.value === 'sprint' && sprint.value) {
    selection = { kind: 'sprint', sprintId: sprint.value.id };
  }
  if (mode.value === 'dates' && dates.value.from) {
    selection = { kind: 'dates', from: dates.value.from, to: dates.value.to || dates.value.from };
  }
  return selection && enabledRepos.value.length > 0
    ? { selection, repos: enabledRepos.value }
    : null;
});
const { state: report, refresh } = useReport(() => request.value);

// A branch filter only makes sense for the data it was chosen on.
watch(
  () => JSON.stringify(request.value),
  () => (branch.value = ''),
);

const data = computed(() => report.value.data);
const allReports = computed(() => applyMarks(data.value?.reports ?? [], fixedMarks.value));

function markFixed(key: string) {
  const report = data.value?.reports.find((r) => r.ticket.key === key);
  if (report) fixedMarks.value = { ...fixedMarks.value, [key]: markFor(report) };
}

function unmark(key: string) {
  const rest = { ...fixedMarks.value };
  delete rest[key];
  fixedMarks.value = rest;
}
const beforeProblem = computed(() =>
  filterReports(allReports.value, {
    problem: 'all',
    assignee: assignee.value,
    myAccountId: props.me.atlassian.id,
    search: search.value,
    branch: decodeBranchFilter(branch.value),
  }),
);
const shown = computed(() =>
  filterReports(beforeProblem.value, { problem: problem.value, assignee: 'all', search: '' }),
);

const title = computed(() =>
  mode.value === 'sprint'
    ? (sprint.value?.name ?? 'Sprint')
    : `Updated ${formatRange(dates.value.from, dates.value.to || dates.value.from)}`,
);
const subtitle = computed(() =>
  mode.value === 'sprint' && sprint.value
    ? `${formatRange(sprint.value.startDate, sprint.value.endDate)}, ${SPRINT_STATE_TEXT[sprint.value.state]}`
    : undefined,
);

const setupError = computed(() => {
  if (boardsState.value.status === 'error')
    return { error: boardsState.value.error, retry: reloadBoards };
  if (sprintsState.value.status === 'error')
    return { error: sprintsState.value.error, retry: reloadSprints };
  return undefined;
});
const preparingSprints = computed(
  () => mode.value === 'sprint' && !sprint.value && sprintsLoading.value,
);
const emptyText = computed(() => {
  if (allReports.value.length > 0) return 'No ticket matches these filters.';
  return mode.value === 'sprint'
    ? 'This sprint has no tickets yet.'
    : 'No tickets were updated in this period.';
});

function addRepo(name: string) {
  repos.value = withRepo(repos.value, name);
}
</script>

<template>
  <main class="dashboard">
    <section class="controls" aria-label="What to show">
      <SelectionControls
        v-model:mode="mode"
        v-model:board-id="boardId"
        v-model:sprint-id="sprintId"
        v-model:dates="dates"
        :boards="boardList"
        :sprints="sprintList"
        :sprints-loading="sprintsLoading"
      />
      <RepoPicker v-model="repos" />
      <TicketFilters
        v-model:search="search"
        v-model:assignee="assignee"
        v-model:branch="branch"
        :people="assignees(allReports)"
        :branches="branchOptions(allReports)"
        :multi-repo="enabledRepos.length > 1"
      />
    </section>

    <ErrorBanner v-if="setupError" :error="setupError.error" :retry="setupError.retry" />
    <p v-if="enabledRepos.length === 0" class="empty">
      Switch on at least one repository above to see its pull requests.
    </p>
    <p
      v-if="mode === 'sprint' && sprintsState.status === 'ready' && sprintList.length === 0"
      class="empty"
    >
      This board has no sprints. Pick another board, or choose by dates.
    </p>

    <template v-if="!request && preparingSprints">
      <div class="load-status loading" role="status">
        <p>Loading boards and sprints from Jira</p>
      </div>
      <SkeletonTable />
    </template>

    <template v-if="request">
      <ReportHeadline
        v-model:problem="problem"
        :title="title"
        :subtitle="subtitle"
        :reports="data && beforeProblem"
      />
      <div class="table-toolbar">
        <LoadStatus :state="report" @refresh="refresh" />
      </div>
      <ErrorBanner v-if="report.status === 'error'" :error="report.error" :retry="refresh" />

      <template v-if="data">
        <TicketTable
          v-if="shown.length > 0"
          :reports="shown"
          :repos="data.repos"
          :stale="report.status === 'loading'"
          @add-repo="addRepo"
          @mark-fixed="markFixed"
          @unmark="unmark"
        />
        <p v-else class="empty">{{ emptyText }}</p>
      </template>
      <SkeletonTable v-else-if="report.status === 'loading'" />
    </template>
  </main>
</template>
