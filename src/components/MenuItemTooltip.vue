<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { nextTick, onMounted, ref } from 'vue';
import type { Tool } from '@/tools/tools.types';

defineProps<{
  tool: Tool
}>();

const textRef = ref<HTMLElement>();
const showTooltip = ref(false);

async function checkTruncation() {
  await nextTick();
  if (textRef.value) {
    const text = textRef.value.textContent || '';
    const computedStyle = window.getComputedStyle(textRef.value);

    // Create canvas context for precise text measurement
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    context.font = `${computedStyle.fontWeight} ${computedStyle.fontSize} ${computedStyle.fontFamily}`;

    const textWidth = context.measureText(text).width;

    // Calculate precise container width by accounting for padding
    const containerWidth = textRef.value.clientWidth
      - Number.parseFloat(computedStyle.paddingLeft)
      - Number.parseFloat(computedStyle.paddingRight);

    showTooltip.value = textWidth > containerWidth;
  }
}

onMounted(() => {
  checkTruncation();
});
</script>

<template>
  <n-tooltip
    placement="right"
    :delay="500"
    :show-arrow="true"
    :disabled="!showTooltip"
  >
    <template #trigger>
      <RouterLink :to="tool.path" class="menu-link">
        <span
          ref="textRef"
          class="menu-text"
          @mouseenter="checkTruncation"
        >
          {{ tool.name }}
        </span>
      </RouterLink>
    </template>
    {{ tool.name }}
  </n-tooltip>
</template>

<style scoped>
.menu-link {
  display: block;
  width: 100%;
  text-decoration: none;
  color: inherit;
}

.menu-text {
  display: block;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
