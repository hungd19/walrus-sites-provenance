import * as core from '@actions/core';
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { WalrusClient } from '@mysten/walrus';

import { certifyBlobs } from './blob/certifyBlobs';
import { groupFilesBySize } from './blob/groupFilesBySize';
import { sleep } from './blob/helper/writeBlobHelper';
import { registerBlobs } from './blob/registerBlobs';
import { writeBlobs } from './blob/writeBlobs';
import { createSite } from './site/createSite';
import { updateSite } from './site/updateSite';
import { accountState } from './utils/accountState';
import { failWithMessage } from './utils/failWithMessage';
import { getSigner } from './utils/getSigner';
import { loadConfig } from './utils/loadConfig';
import { loadWalrusSystem } from './utils/loadWalrusSystem';

const main = async (): Promise<void> => {
  // Load configuration
  const config = loadConfig();
  const { signer, isGitSigner } = await getSigner(config);

  // Initialize Sui and Walrus clients
  const suiClient = new SuiClient({ url: getFullnodeUrl(config.network) });
  const walrusClient = new WalrusClient({
    network: config.network,
    suiClient,
  });

  const walrusSystem = await loadWalrusSystem(config.network, suiClient, walrusClient);

  // Display owner address
  core.info('\nStarting Publish Walrus Site...\n');
  const walBlance = await accountState(
    config.owner,
    config.network,
    suiClient,
    walrusSystem.walCoinType,
  );

  // STEP 1: Load files from the specified directory
  core.info(`\n📦 Grouping files by size...`);
  const groups = groupFilesBySize(config.path);

  if (groups.length === 0) {
    failWithMessage('🚫 No files found to upload.');
  }

  // STEP 2: Register Blob IDs
  core.info('\n📝 Registering Blobs...');
  const blobs = await registerBlobs({
    config,
    suiClient,
    walrusClient,
    walrusSystem,
    groups,
    walBlance,
    signer,
  });

  // Wait for 5 seconds to allow for blob registration
  await sleep(5000);

  // STEP 3: Write Blobs to Walrus
  core.info('\n📤 Writing blobs to nodes...');
  const blobsWithNodes = await writeBlobs({
    retryLimit: config.write_retry_limit || 5,
    signer,
    config,
    walrusSystem,
    suiClient,
    walrusClient,
    blobs,
  });

  // STEP 4: Certify Blobs
  core.info('\n🛡️ Certifying Blobs...');
  await certifyBlobs({
    config,
    suiClient,
    walrusClient,
    walrusSystem,
    blobs: blobsWithNodes,
    signer,
  });

  // config.site_obj_id = '0xd0fba3053ee47e3be546e28361c5613b5dce4df5318e0d1df54d1b5038e4428f';

  // STEP 5: Create Site with Resources
  let url;
  if (config.site_obj_id) {
    core.info('\n🛠️ Update Site with Resources...');
    url = await updateSite({
      config,
      suiClient,
      walrusClient,
      walrusSystem,
      blobs,
      siteObjectId: config.site_obj_id,
      signer,
      isGitSigner,
    });
  } else {
    core.info('\n🛠️ Creating Site with Resources...');
    url = await createSite({
      config,
      suiClient,
      walrusSystem,
      blobs: blobsWithNodes,
      signer,
      isGitSigner,
    });
  }

  const projectId = process.env.PROJECT_ID || `project_tmp_${+new Date()/1000}`;
  core.info(`🛠️ Updating ProjectID: ${projectId} with domain ${url}`);
  try {
    const nftServerUrl = 'https://market.suinova.var-meta.com/api/project-domains';
    const data = {
      projectId,
      url
    };
    const response = await fetch(nftServerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  } catch (error) {
    core.error(JSON.stringify(error));
  }
};

main();
