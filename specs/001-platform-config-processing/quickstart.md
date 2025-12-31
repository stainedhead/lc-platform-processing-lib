# Quick Start: Platform Configuration Processing Library

**Feature**: 001-platform-config-processing
**Audience**: Developers integrating this library into applications or services
**Date**: 2025-12-28

## Overview

This library provides programmatic API for centralized platform configuration management. It enables:
1. Registering applications with platform metadata
2. Managing application versions with dependencies and deployment artifacts
3. Generating IAM policies for secure access
4. Deploying applications and dependencies to target environments

**Architecture**:
```
lc-platform-processing-lib (this library)
  ↓ (imported by)
lc-platform-dev-accelerators
  ↓ (imported by)
lc-platform-dev-cli, REST services, batch jobs, etc.
```

## Installation

```bash
bun add @stainedhead/lc-platform-processing-lib
# or
npm install @stainedhead/lc-platform-processing-lib
```

**Peer Dependencies**:
```bash
bun add @stainedhead/lc-platform-dev-accelerators
```

---

## Basic Usage

### Setup

```typescript
import {
  LCPlatformAppConfigurator,
  LCPlatformAppVersionConfigurator,
  type Result,
  ConfigurationError,
  ValidationError,
  DeploymentError
} from '@stainedhead/lc-platform-processing-lib';

import { LCPlatform } from '@stainedhead/lc-platform-dev-accelerators';

// Initialize platform (provided by lc-platform-dev-accelerators)
const platform = LCPlatform.fromConfig({
  provider: 'aws', // or 'azure', 'gcp'
  region: 'us-east-1',
  credentials: {
    // ... provider-specific credentials
  }
});

// Get or create application reference
const app = platform.getApp('my-app-id'); // Or create new

// Create storage adapter (implementation from library adapters)
import { AcceleratorStorageAdapter } from '@stainedhead/lc-platform-processing-lib/adapters';
const storage = new AcceleratorStorageAdapter(platform);

// Create policy adapter
import { AcceleratorPolicyAdapter } from '@stainedhead/lc-platform-processing-lib/adapters';
const policy = new AcceleratorPolicyAdapter(platform);

// Create deployment adapter
import { AcceleratorDeploymentAdapter } from '@stainedhead/lc-platform-processing-lib/adapters';
const deployment = new AcceleratorDeploymentAdapter(platform);

// Initialize configurators
const appConfigurator = new LCPlatformAppConfigurator(platform, app, storage);

const versionConfigurator = new LCPlatformAppVersionConfigurator(
  platform,
  app,
  storage,
  policy,
  deployment
);
```

---

## Scenario 1: Register New Application

```typescript
// Initialize application configuration
const result = await appConfigurator.init({
  account: 'acme',
  team: 'alpha',
  moniker: 'api-service',
  metadata: {
    displayName: 'Alpha API Service',
    description: 'Core API for alpha team',
    owner: 'alpha-team@acme.com',
    tags: {
      env: 'production',
      tier: 'critical'
    }
  }
});

if (!result.success) {
  if (result.error === ConfigurationError.AlreadyExists) {
    console.error('Application already exists');
  } else {
    console.error('Failed to create application:', result.error);
  }
  return;
}

const application = result.value;
console.log('Application created:', application.id);
console.log('Storage path:', application.storagePath.bucketName);
```

### Read Existing Application

```typescript
const readResult = await appConfigurator.read({
  account: 'acme',
  team: 'alpha',
  moniker: 'api-service'
});

if (readResult.success) {
  console.log('Application:', readResult.value);
} else {
  console.error('Application not found');
}
```

---

## Scenario 2: Create Version with Dependencies

```typescript
// Initialize version configuration
const versionResult = await versionConfigurator.init({
  versionNumber: '1.0.0',
  dependencies: [
    {
      type: 'database',
      name: 'postgres-main',
      configuration: {
        engine: 'postgresql',
        version: '14',
        instanceClass: 'db.t3.medium'
      }
    },
    {
      type: 'queue',
      name: 'job-queue',
      configuration: {
        type: 'sqs',
        visibilityTimeout: 300
      }
    }
  ],
  metadata: {
    releaseNotes: 'Initial production release',
    buildNumber: '42',
    commitSha: 'abc123def456',
    tags: {
      release: 'stable'
    }
  }
});

if (!versionResult.success) {
  console.error('Failed to create version:', versionResult.error);
  return;
}

const version = versionResult.value;
console.log('Version created:', version.versionNumber);
```

### Validate Dependencies

```typescript
const validateResult = await versionConfigurator.validateDependencies({
  account: 'acme',
  team: 'alpha',
  moniker: 'api-service',
  version: '1.0.0'
});

if (!validateResult.success) {
  console.error('Dependency validation failed:', validateResult.error);
  return;
}

const report = validateResult.value;
if (!report.valid) {
  console.error('Invalid dependencies:', report.failures);
  return;
}

console.log('All dependencies valid');
```

---

## Scenario 3: Cache Deployment Artifact

```typescript
import * as fs from 'fs';

// Read artifact file
const artifactStream = fs.createReadStream('./build/api-service-1.0.0.tar.gz');
const artifactSize = fs.statSync('./build/api-service-1.0.0.tar.gz').size;

// Cache artifact
const cacheResult = await versionConfigurator.cache({
  identifier: {
    account: 'acme',
    team: 'alpha',
    moniker: 'api-service',
    version: '1.0.0'
  },
  stream: artifactStream,
  metadata: {
    size: artifactSize,
    contentType: 'application/gzip'
  }
});

if (!cacheResult.success) {
  console.error('Failed to cache artifact:', cacheResult.error);
  return;
}

const artifactRef = cacheResult.value;
console.log('Artifact cached:', artifactRef.path);
console.log('Checksum:', artifactRef.checksum);
console.log('Size:', (artifactRef.size / 1024 / 1024).toFixed(2), 'MB');
```

---

## Scenario 4: Generate IAM Policies

```typescript
// Generate application runtime policy
const appPolicyResult = await versionConfigurator.generateAppPolicy({
  account: 'acme',
  team: 'alpha',
  moniker: 'api-service',
  version: '1.0.0'
});

if (!appPolicyResult.success) {
  console.error('Failed to generate app policy:', appPolicyResult.error);
  return;
}

console.log('App policy generated:', appPolicyResult.value.path);

// Generate CI/CD deployment policy
const cicdPolicyResult = await versionConfigurator.generateCICDPolicy({
  account: 'acme',
  team: 'alpha',
  moniker: 'api-service',
  version: '1.0.0'
});

if (!cicdPolicyResult.success) {
  console.error('Failed to generate CI/CD policy:', cicdPolicyResult.error);
  return;
}

console.log('CI/CD policy generated:', cicdPolicyResult.value.path);
```

---

## Scenario 5: Deploy Version to Environment

```typescript
// Deploy version (dependencies + application)
const deployResult = await versionConfigurator.deployAppVersionAndDependencies({
  identifier: {
    account: 'acme',
    team: 'alpha',
    moniker: 'api-service',
    version: '1.0.0'
  },
  environment: 'staging'
});

if (!deployResult.success) {
  if (deployResult.error === DeploymentError.ArtifactNotCached) {
    console.error('Artifact must be cached before deployment');
  } else if (deployResult.error === DeploymentError.DependenciesNotDeployed) {
    console.error('Dependencies deployment failed');
  } else {
    console.error('Deployment failed:', deployResult.error);
  }
  return;
}

const deployment = deployResult.value;
console.log('Deployment completed:', deployment.id);
console.log('Status:', deployment.status);
console.log('Dependencies deployed:', deployment.dependenciesDeployed);
console.log('Application deployed:', deployment.applicationDeployed);
console.log('Duration:', deployment.duration);
```

---

## Common Workflows

### Workflow 1: New Application Onboarding

```typescript
async function onboardNewApplication(
  appConfigurator: LCPlatformAppConfigurator,
  versionConfigurator: LCPlatformAppVersionConfigurator
) {
  // 1. Initialize application
  const appResult = await appConfigurator.init({
    account: 'acme',
    team: 'beta',
    moniker: 'web-service',
    metadata: {
      displayName: 'Beta Web Service',
      owner: 'beta-team@acme.com'
    }
  });

  if (!appResult.success) {
    throw new Error(`Failed to create app: ${appResult.error}`);
  }

  // 2. Create first version
  const versionResult = await versionConfigurator.init({
    versionNumber: '0.1.0',
    dependencies: [/* ... */],
    metadata: {
      releaseNotes: 'Initial development version'
    }
  });

  if (!versionResult.success) {
    throw new Error(`Failed to create version: ${versionResult.error}`);
  }

  // 3. Validate dependencies
  const validateResult = await versionConfigurator.validateDependencies({
    account: 'acme',
    team: 'beta',
    moniker: 'web-service',
    version: '0.1.0'
  });

  if (!validateResult.success || !validateResult.value.valid) {
    throw new Error('Dependency validation failed');
  }

  console.log('Application onboarded successfully');
  return appResult.value;
}
```

### Workflow 2: Release New Version

```typescript
async function releaseNewVersion(
  versionConfigurator: LCPlatformAppVersionConfigurator,
  artifactPath: string
) {
  const identifier = {
    account: 'acme',
    team: 'beta',
    moniker: 'web-service',
    version: '1.0.0'
  };

  // 1. Create version
  const versionResult = await versionConfigurator.init({
    versionNumber: '1.0.0',
    dependencies: [/* updated dependencies */],
    metadata: {
      releaseNotes: 'Production release v1.0'
    }
  });

  if (!versionResult.success) {
    throw new Error(`Version init failed: ${versionResult.error}`);
  }

  // 2. Validate dependencies
  const validateResult = await versionConfigurator.validateDependencies(identifier);
  if (!validateResult.success || !validateResult.value.valid) {
    throw new Error('Dependencies invalid');
  }

  // 3. Cache artifact
  const artifactStream = fs.createReadStream(artifactPath);
  const cacheResult = await versionConfigurator.cache({
    identifier,
    stream: artifactStream,
    metadata: {
      size: fs.statSync(artifactPath).size,
      contentType: 'application/gzip'
    }
  });

  if (!cacheResult.success) {
    throw new Error(`Artifact cache failed: ${cacheResult.error}`);
  }

  // 4. Generate policies
  await versionConfigurator.generateAppPolicy(identifier);
  await versionConfigurator.generateCICDPolicy(identifier);

  // 5. Deploy to staging
  const deployResult = await versionConfigurator.deployAppVersionAndDependencies({
    identifier,
    environment: 'staging'
  });

  if (!deployResult.success) {
    throw new Error(`Deployment failed: ${deployResult.error}`);
  }

  console.log('Version 1.0.0 released to staging');
  return deployResult.value;
}
```

---

## Error Handling Patterns

### Result Type Pattern

```typescript
const result = await appConfigurator.init(params);

if (result.success) {
  // Success case - result.value is typed correctly
  const application = result.value;
  console.log('Created:', application.id);
} else {
  // Error case - result.error is typed correctly
  switch (result.error) {
    case ConfigurationError.AlreadyExists:
      console.error('Application already exists');
      break;
    case ConfigurationError.ValidationFailed:
      console.error('Validation failed');
      break;
    case ConfigurationError.StorageError:
      console.error('Storage operation failed');
      break;
    default:
      console.error('Unknown error:', result.error);
  }
}
```

### Chained Operations

```typescript
async function initializeAndDeploy() {
  // Chain operations with error handling
  const appResult = await appConfigurator.init(appParams);
  if (!appResult.success) return appResult; // Propagate error

  const versionResult = await versionConfigurator.init(versionParams);
  if (!versionResult.success) return versionResult;

  const cacheResult = await versionConfigurator.cache(cacheParams);
  if (!cacheResult.success) return cacheResult;

  return await versionConfigurator.deployAppVersionAndDependencies(deployParams);
}
```

---

## Best Practices

1. **Always validate dependencies** before deployment:
   ```typescript
   const validateResult = await versionConfigurator.validateDependencies(id);
   if (!validateResult.success || !validateResult.value.valid) {
     // Handle invalid dependencies
   }
   ```

2. **Use semantic versioning** for version numbers:
   ```typescript
   versionNumber: '1.2.3'      // Good
   versionNumber: '2.0.0-beta.1' // Good
   versionNumber: 'v1'         // Bad
   versionNumber: 'latest'     // Bad
   ```

3. **Check existence before operations**:
   ```typescript
   const exists = await appConfigurator.exists(identifier);
   if (!exists) {
     // Handle not found case
   }
   ```

4. **Deploy to lower environments first**:
   ```typescript
   // dev → staging → production
   await deploy({ ...params, environment: 'dev' });
   await deploy({ ...params, environment: 'staging' });
   await deploy({ ...params, environment: 'production' });
   ```

5. **Use Result type for type-safe error handling**:
   ```typescript
   // TypeScript ensures you handle both success and error cases
   const result = await operation();
   if (result.success) {
     // result.value is available
   } else {
     // result.error is available
   }
   ```

---

## Integration Examples

### Use in CLI Application

```typescript
// In lc-platform-dev-cli/src/commands/app-init.ts
import { LCPlatformAppConfigurator } from '@stainedhead/lc-platform-processing-lib';

async function appInitCommand(args) {
  const configurator = createAppConfigurator(); // Factory function

  const result = await configurator.init({
    account: args.account,
    team: args.team,
    moniker: args.moniker,
    metadata: {
      displayName: args.displayName,
      description: args.description
    }
  });

  if (result.success) {
    console.log(JSON.stringify(result.value, null, 2));
    process.exit(0);
  } else {
    console.error(`Error: ${result.error}`);
    process.exit(1);
  }
}
```

### Use in REST API

```typescript
// In REST service endpoint
import { LCPlatformAppVersionConfigurator } from '@stainedhead/lc-platform-processing-lib';

app.post('/api/versions/:version/deploy', async (req, res) => {
  const configurator = req.services.versionConfigurator;

  const result = await configurator.deployAppVersionAndDependencies({
    identifier: {
      account: req.user.account,
      team: req.params.team,
      moniker: req.params.moniker,
      version: req.params.version
    },
    environment: req.body.environment
  });

  if (result.success) {
    res.json({ deployment: result.value });
  } else {
    res.status(400).json({ error: result.error });
  }
});
```

---

## Next Steps

- **API Reference**: See [contracts/public-api.md](./contracts/public-api.md) for complete API documentation
- **Architecture**: Read AGENTS.md for Clean Architecture structure and principles
- **Contributing**: Follow constitution.md guidelines for development workflow
- **Testing**: See research.md for layer-specific test strategies

## Troubleshooting

**Problem**: "Application already exists" error
- **Solution**: Use `exists()` to check before `init()`, or handle AlreadyExists error

**Problem**: "Version not found" error during deployment
- **Solution**: Ensure version was created with `init()` first

**Problem**: "Artifact not cached" error
- **Solution**: Call `cache()` before attempting deployment

**Problem**: Deployment fails with "Dependencies not deployed"
- **Solution**: Use `deployAppVersionAndDependencies()` instead of `deployApp()` alone

**Problem**: Type errors with Result type
- **Solution**: Always check `result.success` before accessing `result.value` or `result.error`
