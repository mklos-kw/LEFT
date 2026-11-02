<template>
  <!-- Placeholder rows while the first report for a selection loads. -->
  <div class="skeleton" aria-hidden="true">
    <div v-for="i in 6" :key="i" class="skeleton-row">
      <span class="skeleton-bar key" />
      <span class="skeleton-bar summary" :style="{ width: `${40 + ((i * 17) % 35)}%` }" />
      <span class="skeleton-lines">
        <span class="skeleton-bar" />
        <span class="skeleton-bar short" />
      </span>
    </div>
  </div>
</template>
