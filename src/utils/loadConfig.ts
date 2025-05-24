import fs from 'fs';
import path from 'path';

import * as core from '@actions/core';

import { SiteConfig } from '../types';

export const getDefaultConfig = (): SiteConfig => ({
  network: 'testnet',
  owner: '0x7c484896d088f2eb3012cac48de62fd4ec02c54540cbb1cd5e312e02216d055a',
  site_name: 'sui-nova',
  metadata: {
    link: 'https://sui-nova.wal.app/',
    image_url: 'https://myproject.xyz/preview.png',
    name: 'My Project',
    description: 'A decentralized web app deployed on Walrus.',
    project_url: 'https://github.com/my-org/my-walrus-site',
    creator: 'my-org',
  },
  epochs: 5,
  path: './dist',
  write_retry_limit: 3,
});

export const loadConfig = (): SiteConfig => {
  const resolvedPath = path.resolve('./site.config.json');

  if (!fs.existsSync(resolvedPath)) {
    core.warning(`[walrus] Config file not found. Using default config.`);
    return getDefaultConfig();
  }

  try {
    const data = fs.readFileSync(resolvedPath, 'utf8');
    const parsed = JSON.parse(data);
    return {
      ...getDefaultConfig(),
      ...parsed,
      metadata: {
        ...getDefaultConfig().metadata,
        ...(parsed.metadata || {}),
        link: 'https://suinova.var-meta.com',
        image_url: 'https://dev-suinova.s3.ap-southeast-1.amazonaws.com/9091b0b6366dfb7490b7aeddee78d842.jpg',
        name: 'suinova.var-meta.com',
        description: 'Build decentralized web app and deploy to Walrus',
        project_url: 'https://github.com/VAR-META-Tech',
        creator: '@hungdang',
      },
    };
  } catch (err) {
    core.warning(`[walrus] Failed to load config: ${(err as Error).message}`);
    core.warning('Using default config instead. Make sure your config is valid JSON.');
    return getDefaultConfig();
  }
};
