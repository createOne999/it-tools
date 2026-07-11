<script setup lang="ts">
import JSON5 from 'json5';

const scenario = ref('smoke');

type ScenarioPreset = {
  vus: number;
  duration?: string;
  rampUp?: string;
  rampDown?: string;
  peak?: number;
};
const presets = {
  smoke: { vus: 1, duration: '30s' } as ScenarioPreset,
  load: { vus: 50, duration: '5m' } as ScenarioPreset,
  stress: { vus: 10, rampUp: '2m', peak: 200, rampDown: '2m', duration: '1m' } as ScenarioPreset,
  spike: { vus: 200, duration: '30s' } as ScenarioPreset,
  soak: { vus: 20, duration: '1h' } as ScenarioPreset,
};

type ThresholdPreset = { metric: string; rule: string };
type CheckPreset = { name: string; expr: string };
type StepPreset = {
  method: string;
  url: string;
  payload: string;
  headers?: string;
  sleep: number;
};
const thresholdPresets = {
  smoke: [{ metric: 'http_req_duration', rule: 'p(95)<800' }] as ThresholdPreset[],
  load: [
    { metric: 'http_req_duration', rule: 'p(95)<500' },
    { metric: 'http_req_failed', rule: 'rate<0.01' },
  ] as ThresholdPreset[],
  stress: [
    { metric: 'http_req_duration', rule: 'p(99)<1500' },
    { metric: 'http_req_failed', rule: 'rate<0.05' },
  ] as ThresholdPreset[],
  spike: [{ metric: 'http_req_duration', rule: 'p(95)<1000' }] as ThresholdPreset[],
  soak: [
    { metric: 'http_req_duration', rule: 'p(95)<800' },
    { metric: 'http_req_failed', rule: 'rate<0.01' },
  ] as ThresholdPreset[],
};

const checkPresets = {
  smoke: [{ name: 'status is 200', expr: 'r.status === 200' }] as CheckPreset[],
  load: [
    { name: 'status is 200', expr: 'r.status === 200' },
    { name: 'body is not empty', expr: 'r.body && r.body.length > 0' },
  ] as CheckPreset[],
  stress: [
    { name: 'status is 200', expr: 'r.status === 200' },
    { name: 'response < 1500ms', expr: 'r.timings.duration < 1500' },
  ] as CheckPreset[],
  spike: [{ name: 'status is 200', expr: 'r.status === 200' }] as CheckPreset[],
  soak: [
    { name: 'status is 200', expr: 'r.status === 200' },
    { name: 'response < 800ms', expr: 'r.timings.duration < 800' },
  ] as CheckPreset[],
};

const stepPresets = {
  smoke: [{ method: 'GET', url: 'https://test.example.com', payload: '', headers: '', sleep: 1 }] as StepPreset[],
  load: [
    { method: 'GET', url: 'https://test.example.com/api/users', payload: '', headers: '', sleep: 1 },
    {
      method: 'POST',
      url: 'https://test.example.com/api/login',
      payload: '{"user":"test"}',
      headers: { 'Content-Type': 'application/json' },
      sleep: 1,
    },
  ] as StepPreset[],
  stress: [
    { method: 'GET', url: 'https://test.example.com/api/health', payload: '', headers: '', sleep: 0 },
  ] as StepPreset[],
  spike: [] as StepPreset[],
  soak: [] as StepPreset[],
};

const vus = ref(1);
const duration = ref('30s');
const rampUp = ref('30s');
const rampDown = ref('30s');

const thresholds = ref<ThresholdPreset[]>([]);
const checks = ref<CheckPreset[]>([]);
const steps = ref<StepPreset[]>([]);

function applyPreset() {
  const p = presets[scenario.value as keyof typeof presets];
  vus.value = p.vus;
  duration.value = p.duration ?? duration.value;
  rampUp.value = p.rampUp ?? rampUp.value;
  rampDown.value = p.rampDown ?? rampDown.value;

  thresholds.value = JSON.parse(
    JSON.stringify(thresholdPresets[scenario.value as keyof typeof thresholdPresets] || []),
  );
  checks.value = JSON.parse(JSON.stringify(checkPresets[scenario.value as keyof typeof checkPresets] || []));
  steps.value = JSON.parse(JSON.stringify(stepPresets[scenario.value as keyof typeof stepPresets] || []));
}

const thresholdBlock = computed(() => {
  if (!thresholds.value.length) {
    return '';
  }

  const entries = thresholds.value
    .filter((t) => t.metric && t.rule)
    .map((t) => `    "${t.metric}": ["${t.rule}"]`)
    .join(',\n');

  return `  thresholds: {\n${entries}\n  },`;
});

const checksBlock = computed(() => {
  if (!checks.value.length) {
    return '';
  }

  const lines = checks.value
    .filter((c) => c.name && c.expr)
    .map((c) => `      "${c.name}": r => ${c.expr}`)
    .join(',\n');

  return `
    check(res, {
${lines}
    })`;
});

const stepsBlock = computed(() => {
  if (!steps.value.length) {
    return '';
  }

  return steps.value
    .map((s, i) => {
      try {
        const headersObj = JSON5.parse(s.headers || '{}');
        const headers = headersObj && Object.keys(headersObj).length ? `, { headers: ${s.headers} }` : '';

        const payload = s.payload ? `, ${JSON.stringify(s.payload)}` : '';

        return `
  // Step ${i + 1}: ${s.method} ${s.url}
  {
    const res = http.${s.method.toLowerCase()}("${s.url}"${payload}${headers})
${checksBlock.value}
    sleep(${s.sleep})
  }`;
      } catch (ex: any) {
        return '// error: ' + ex;
      }
    })
    .join('\n');
});

const script = computed(() => {
  const s = scenario.value;

  const optionsBlock =
    s === 'stress'
      ? `
export const options = {
  stages: [
    { duration: '${rampUp.value}', target: ${presets.stress.peak} },
    { duration: '${duration.value}', target: ${presets.stress.peak} },
    { duration: '${rampDown.value}', target: 0 }
  ],
${thresholdBlock.value}
}`
      : `
export const options = {
  vus: ${vus.value},
  duration: '${duration.value}',
${thresholdBlock.value}
}`;

  return `
import http from 'k6/http'
import { sleep, check } from 'k6'

${optionsBlock}

export default function () {
${stepsBlock.value}
}
`.trim();
});
</script>

<template>
  <div>
    <NForm label-placement="left" mb-2 label-width="140">
      <NFormItem label="Scenario Preset:">
        <NSelect
          v-model:value="scenario"
          :options="[
            { label: 'Smoke Test', value: 'smoke' },
            { label: 'Load Test', value: 'load' },
            { label: 'Stress Test', value: 'stress' },
            { label: 'Spike Test', value: 'spike' },
            { label: 'Soak Test', value: 'soak' },
          ]"
        />
        <NButton @click="applyPreset" ml-1> Apply Preset </NButton>
      </NFormItem>

      <n-space mb-1>
        <NFormItem label="Virtual Users (VUs):">
          <NInputNumber v-model:value="vus" :min="1" />
        </NFormItem>

        <NFormItem label="Duration:">
          <NInput v-model:value="duration" />
        </NFormItem>
      </n-space>

      <n-space mb-1 v-if="scenario === 'stress'">
        <NFormItem label="Ramp Up Duration:">
          <NInput v-model:value="rampUp" />
        </NFormItem>

        <NFormItem label="Ramp Down Duration:">
          <NInput v-model:value="rampDown" />
        </NFormItem>
      </n-space>

      <NFormItem label="Thresholds (Name/Expression):">
        <NDynamicInput v-model:value="thresholds" :on-create="() => ({ metric: '', rule: '' })">
          <template #default="{ value, index }">
            <NSpace>
              <NInput v-model:value="value.metric" placeholder="Metric" style="width: 240px" />
              <NInput v-model:value="value.rule" placeholder="Rule" style="width: 200px" />
              <NButton type="error" ghost @click="thresholds.splice(index, 1)" mr-2> Remove </NButton>
            </NSpace>
          </template>

          <template #action>
            <NButton type="primary" ghost @click="thresholds.push({ metric: '', rule: '' })"> Add Threshold </NButton>
          </template>
        </NDynamicInput>
      </NFormItem>

      <NFormItem label="Checks (Name/Expression):">
        <NDynamicInput v-model:value="checks" :on-create="() => ({ name: '', expr: '' })">
          <template #default="{ value, index }">
            <NSpace>
              <NInput v-model:value="value.name" placeholder="Check name" style="width: 240px" />
              <NInput v-model:value="value.expr" placeholder="Expression" style="width: 260px" />
              <NButton type="error" ghost @click="checks.splice(index, 1)" mr-2> Remove </NButton>
            </NSpace>
          </template>

          <template #action>
            <NButton type="primary" ghost @click="checks.push({ name: '', expr: '' })"> Add Check </NButton>
          </template>
        </NDynamicInput>
      </NFormItem>

      <NFormItem label="Request Steps:">
        <NDynamicInput
          v-model:value="steps"
          :on-create="() => ({ method: 'GET', url: '', payload: '', headers: {}, sleep: 1 })"
        >
          <template #default="{ value, index }">
            <NCard size="small" style="width: 100%; margin-bottom: 8px" mr-1>
              <div flex mb-1>
                <NSelect
                  v-model:value="value.method"
                  :options="[
                    { label: 'GET', value: 'GET' },
                    { label: 'POST', value: 'POST' },
                    { label: 'PUT', value: 'PUT' },
                    { label: 'PATCH', value: 'PATCH' },
                    { label: 'DELETE', value: 'DELETE' },
                  ]"
                  style="width: 120px"
                  mr-1
                />
                <NInput v-model:value="value.url" placeholder="Request URL" style="flex: 1" />
              </div>

              <c-input-text
                multiline
                v-model:value="value.payload"
                label="Payload:"
                placeholder="Payload (JSON or text)"
                mb-1
              />

              <c-input-text
                multiline
                v-model:value="value.headers"
                placeholder="Headers (JSON)"
                label="Headers:"
                mb-1
              />

              <NFormItem label="Sleep after this step (seconds):" label-width="auto" mb-1>
                <NInputNumber v-model:value="value.sleep" :min="0" />
              </NFormItem>

              <n-space justify="center">
                <NButton type="error" ghost @click="steps.splice(index, 1)"> Remove Step </NButton>
              </n-space>
            </NCard>
          </template>

          <template #action>
            <NButton
              type="primary"
              ghost
              @click="steps.push({ method: 'GET', url: '', payload: '', headers: '', sleep: 1 })"
            >
              Add Step
            </NButton>
          </template>
        </NDynamicInput>
      </NFormItem>
    </NForm>

    <n-card title="Generated K6 Script">
      <textarea-copyable :value="script" language="javascript" />
    </n-card>
  </div>
</template>
