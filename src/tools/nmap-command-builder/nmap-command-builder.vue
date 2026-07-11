<script setup lang="ts">
interface Preset {
  label: string;
  value: string;
  flags: string[];
}

const presets: Preset[] = [
  {
    label: 'Default Scan',
    value: 'default',
    flags: [],
  },
  {
    label: 'Quick Scan',
    value: 'quick',
    flags: ['-T4', '-F'],
  },
  {
    label: 'Intense Scan',
    value: 'intense',
    flags: ['-T4', '-A', '-v'],
  },
  {
    label: 'Full TCP Scan',
    value: 'full-tcp',
    flags: ['-sS', '-p-', '-T4'],
  },
  {
    label: 'UDP Scan',
    value: 'udp',
    flags: ['-sU', '-T4'],
  },
  {
    label: 'Ping Sweep',
    value: 'ping-sweep',
    flags: ['-sn'],
  },
  {
    label: 'No Ping (Stealth Host Discovery)',
    value: 'no-ping',
    flags: ['-Pn'],
  },
  {
    label: 'Top Ports (100)',
    value: 'top-100',
    flags: ['--top-ports', '100', '-T4'],
  },
  {
    label: 'Top Ports (1000)',
    value: 'top-1000',
    flags: ['--top-ports', '1000', '-T4'],
  },
  {
    label: 'Firewall Evasion',
    value: 'evasion',
    flags: ['-f', '-D', 'RND:10', '--data-length', '50'],
  },
  {
    label: 'IPv6 Scan',
    value: 'ipv6',
    flags: ['-6', '-sS'],
  },
  {
    label: 'Service & Version Deep Scan',
    value: 'deep-version',
    flags: ['-sV', '--version-intensity', '9'],
  },
  {
    label: 'Vulnerability Scan (NSE vuln)',
    value: 'vuln',
    flags: ['--script', 'vuln'],
  },
  {
    label: 'HTTP Enumeration',
    value: 'http-enum',
    flags: ['-p', '80,443', '--script', 'http-enum'],
  },
  {
    label: 'SMB Enumeration',
    value: 'smb-enum',
    flags: ['--script', 'smb-enum*'],
  },
  {
    label: 'DNS Brute Force',
    value: 'dns-brute',
    flags: ['--script', 'dns-brute'],
  },
  {
    label: 'FTP Audit',
    value: 'ftp-audit',
    flags: ['--script', 'ftp-*'],
  },
  {
    label: 'SSH Audit',
    value: 'ssh-audit',
    flags: ['--script', 'ssh-*'],
  },
  {
    label: 'Full Recon (OS + Version + Scripts)',
    value: 'full-recon',
    flags: ['-A', '-sC', '-sV', '-O', '-T4'],
  },
];

const target = ref('');
const preset = ref<string | null>();

// Options
const osDetection = ref(false);
const versionDetection = ref(false);
const scriptScan = ref(false);
const traceroute = ref(false);
const verbose = ref(false);
const aggressive = ref(false);

const customPorts = ref('');
const timing = ref<number | null>(4);
const scripts = ref('');
const outputFile = ref('');

const computedCommand = computed(() => {
  const cmd: string[] = ['nmap'];

  // Preset flags
  const selectedPreset = presets.find((p) => p.value === preset.value);
  if (selectedPreset) {
    cmd.push(...selectedPreset.flags);
  }

  // Toggles
  if (osDetection.value) {
    cmd.push('-O');
  }
  if (versionDetection.value) {
    cmd.push('-sV');
  }
  if (scriptScan.value) {
    cmd.push('-sC');
  }
  if (traceroute.value) {
    cmd.push('--traceroute');
  }
  if (verbose.value) {
    cmd.push('-v');
  }
  if (aggressive.value) {
    cmd.push('-A');
  }

  // Custom ports
  if (customPorts.value.trim()) {
    cmd.push(`-p ${customPorts.value.trim()}`);
  }

  // Timing
  if (timing.value !== null) {
    cmd.push(`-T${timing.value}`);
  }

  // NSE scripts
  if (scripts.value.trim()) {
    cmd.push(`--script="${scripts.value.trim()}"`);
  }

  // Output
  if (outputFile.value.trim()) {
    cmd.push(`-oN ${outputFile.value.trim()}`);
  }

  // Target
  if (target.value.trim()) {
    cmd.push(target.value.trim());
  } else {
    return '# ERROR: Target is missing';
  }

  return cmd.join(' ');
});
</script>

<template>
  <div>
    <NForm label-placement="left">
      <NFormItem label="Target:" mb-1>
        <NInput v-model:value="target" placeholder="example.com or 192.168.1.1" />
      </NFormItem>

      <n-tabs type="line" size="large" mb-2>
        <n-tab-pane name="presets" tab="Presets">
          <NFormItem label="Preset:">
            <NSelect
              v-model:value="preset"
              :options="presets.map((p) => ({ label: p.label, value: p.value }))"
              placeholder="Choose a preset"
            />
          </NFormItem>
        </n-tab-pane>
        <n-tab-pane name="custom" tab="Custom">
          <n-card title="Scan Options">
            <n-space justify="center">
              <NFormItem label="OS Detection (-O)">
                <NSwitch v-model:value="osDetection" />
              </NFormItem>

              <NFormItem label="Version Detection (-sV)">
                <NSwitch v-model:value="versionDetection" />
              </NFormItem>

              <NFormItem label="Default Scripts (-sC)">
                <NSwitch v-model:value="scriptScan" />
              </NFormItem>

              <NFormItem label="Traceroute (--traceroute)">
                <NSwitch v-model:value="traceroute" />
              </NFormItem>

              <NFormItem label="Verbose (-v)">
                <NSwitch v-model:value="verbose" />
              </NFormItem>

              <NFormItem label="Aggressive (-A)">
                <NSwitch v-model:value="aggressive" />
              </NFormItem>
            </n-space>
          </n-card>

          <n-card title="Advanced">
            <NFormItem label="Custom Ports (-p)">
              <NInput v-model:value="customPorts" placeholder="80,443 or 1-65535" />
            </NFormItem>

            <NFormItem label="Timing (-T)">
              <NInputNumber v-model:value="timing" :min="0" :max="5" />
            </NFormItem>

            <NFormItem label="NSE Scripts (--script)">
              <NInput v-model:value="scripts" placeholder="vuln, http-title, ..." />
            </NFormItem>

            <NFormItem label="Output File (-oN)">
              <NInput v-model:value="outputFile" placeholder="scan.txt" />
            </NFormItem>
          </n-card>
        </n-tab-pane>
      </n-tabs>

      <n-card title="Generated Command">
        <textarea-copyable :value="computedCommand" language="bash" />
      </n-card>
    </NForm>
  </div>
</template>
