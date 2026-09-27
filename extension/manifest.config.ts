import { defineManifest } from '@crxjs/vite-plugin'

export default defineManifest({
  manifest_version: 3,

  name: 'Anywear Replica',

  description:
    'Live virtual try-on browser extension',

  version: '1.0.0',

  action: {
    default_title:
      'Anywear Replica',
  },

  permissions: [],

  host_permissions: [
    'http://*/*',
    'https://*/*',
  ],

  background: {
    service_worker:
      'src/background.ts',
  },

  content_scripts: [
    {
      matches: [
        'http://*/*',
        'https://*/*',
      ],

      js: [
        'src/content/main.tsx',
      ],

      run_at:
        'document_idle',
    },
  ],
})