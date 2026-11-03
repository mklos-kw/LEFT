<script setup lang="ts">
import type { Ticket } from '@ocis-dashboard/core';

/**
 * The Jira tickets while GitHub is still being checked: the same columns as the
 * ticket table, with placeholders where branches and problems will appear.
 */
defineProps<{ tickets: Ticket[] }>();
</script>

<template>
  <div class="table-scroll">
    <table class="ticket-table" aria-busy="true">
      <thead>
        <tr>
          <th scope="col" class="ticket-col">Ticket</th>
          <th scope="col" class="branches-col">Where the fix is</th>
          <th scope="col" class="problems-col">Problems</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="ticket in tickets" :key="ticket.key" class="ticket-row">
          <td class="ticket-cell">
            <a class="ticket-key identifier" :href="ticket.url" target="_blank" rel="noreferrer">{{
              ticket.key
            }}</a>
            <span class="ticket-summary">{{ ticket.summary }}</span>
            <span class="ticket-meta">
              <span class="status-chip" :data-category="ticket.statusCategory">{{
                ticket.status
              }}</span>
              <span class="assignee" :data-unassigned="!ticket.assignee">{{
                ticket.assignee?.name ?? 'Unassigned'
              }}</span>
              <span v-if="ticket.fixVersions.length > 0" class="fix-version">
                {{ ticket.fixVersions.join(', ') }}
              </span>
            </span>
          </td>
          <td class="branches-cell" aria-hidden="true">
            <span class="skeleton-lines">
              <span class="skeleton-bar" />
              <span class="skeleton-bar short" />
            </span>
          </td>
          <td class="problems-cell" aria-hidden="true">
            <span class="skeleton-bar short" />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
