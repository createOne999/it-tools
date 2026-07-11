<script setup lang="ts">
import { useCopy } from '@/composable/copy';
import { applyPatch, compare } from 'fast-json-patch';

const jsonPathsInput = ref('');
const pathRows = ref<{ op: string; path: string; value: string }[]>([]);
const paths = computed(() => pathRows.value.map((r) => r.path).join('\n'));
const { copy: copyPaths } = useCopy({ source: paths, text: 'JSON Paths copied to clipboard!' });

const pathColumns = [
  { title: 'Operation', key: 'op' },
  { title: 'Path', key: 'path' },
  { title: 'Value', key: 'value' },
];

function generatePaths() {
  try {
    const obj = JSON.parse(jsonPathsInput.value);
    const acc: any[] = [];
    walk('', obj, acc);
    pathRows.value = acc;
  } catch {
    pathRows.value = [];
  }
}

const isLeaf = (v: any) => v === null || typeof v !== 'object';
const preview = (v: any) => (typeof v === 'string' ? v : JSON.stringify(v));
const escapePtr = (s: string) => s.replace(/~/g, '~0').replace(/\//g, '~1');

function walk(base: string, value: any, acc: any[]) {
  if (Array.isArray(value)) {
    value.forEach((v, i) => {
      const p = `${base}/${i}`;
      if (isLeaf(v)) {
        acc.push({ op: 'replace', path: p, value: preview(v) });
      } else {
        walk(p, v, acc);
      }
    });
  } else if (value !== null && typeof value === 'object') {
    Object.entries(value).forEach(([k, v]) => {
      const p = `${base}/${escapePtr(k)}`;
      if (isLeaf(v)) {
        acc.push({ op: 'replace', path: p, value: preview(v) });
      } else {
        walk(p, v, acc);
      }
    });
  }
}

/* -------------------------------------------------------
   TAB 2: GENERATE PATCH (using fast-json-patch)
------------------------------------------------------- */
const beforeJson = ref('');
const afterJson = ref('');
const generatedPatch = ref('');

function generatePatch() {
  try {
    const before = JSON.parse(beforeJson.value);
    const after = JSON.parse(afterJson.value);

    const patch = compare(before, after);
    generatedPatch.value = JSON.stringify(patch, null, 2);
  } catch {
    generatedPatch.value = 'Invalid JSON';
  }
}

/* -------------------------------------------------------
   TAB 3: APPLY PATCH (using fast-json-patch)
------------------------------------------------------- */
const applyJson = ref('');
const applyPatchInput = ref('');
const applyResult = ref('');

function applyPatchToJson() {
  try {
    const obj = JSON.parse(applyJson.value);
    const patch = JSON.parse(applyPatchInput.value);

    const result = applyPatch(obj, patch).newDocument;
    applyResult.value = JSON.stringify(result, null, 2);
  } catch {
    applyResult.value = 'Invalid JSON or patch';
  }
}
</script>

<template>
  <div>
    <n-tabs type="line" animated>
      <!-- TAB 1: PATHS -->
      <n-tab-pane name="paths" tab="Paths">
        <c-input-text
          v-model:value="jsonPathsInput"
          label="Input JSON"
          multiline
          rows="10"
          placeholder="Paste JSON..."
          mb-1
        />
        <div mb-2 flex justify-center>
          <c-button @click="generatePaths()"> Generate paths </c-button>
        </div>

        <n-data-table :columns="pathColumns" :data="pathRows" size="small" :bordered="false" mb-1 />

        <div flex justify-center>
          <c-button @click="copyPaths()"> Copy JSON paths </c-button>
        </div>
      </n-tab-pane>

      <!-- TAB 2: GENERATE PATCH -->
      <n-tab-pane name="generate" tab="Generate Patch">
        <c-input-text
          v-model:value="beforeJson"
          label="Before JSON"
          multiline
          rows="10"
          placeholder="Before JSON..."
          mb-1
        />
        <c-input-text
          v-model:value="afterJson"
          label="After JSON"
          multiline
          rows="10"
          placeholder="After JSON..."
          mb-1
        />

        <div mb-2 flex justify-center>
          <c-button @click="generatePatch()"> Generate patch </c-button>
        </div>

        <n-card v-if="generatedPatch" title="Generate JSON Patch">
          <CodeBlockCopyable :value="generatedPatch" language="json" />
        </n-card>
      </n-tab-pane>

      <!-- TAB 3: APPLY PATCH -->
      <n-tab-pane name="apply" tab="Apply Patch">
        <n-space vertical :size="16">
          <c-input-text
            v-model:value="applyJson"
            label="JSON to patch"
            multiline
            rows="10"
            placeholder="JSON to patch..."
            mb-1
          />
          <c-input-text
            v-model:value="applyPatchInput"
            label="JSON Patch array"
            multiline
            rows="10"
            placeholder="JSON Patch array..."
            mb-1
          />

          <div mb-2 flex justify-center>
            <c-button @click="applyPatchToJson()"> Apply patch </c-button>
          </div>

          <n-card v-if="applyResult" title="Patched JSON">
            <CodeBlockCopyable :value="applyResult" language="json" />
          </n-card>
        </n-space>
      </n-tab-pane>
    </n-tabs>
  </div>
</template>
