# LC Platform Processing Library - Product Details

## Table of Contents

1. [Public API Reference](#public-api-reference)
2. [Domain Model](#domain-model)
3. [Use Cases](#use-cases)
4. [Error Handling](#error-handling)
5. [Type Definitions](#type-definitions)
6. [Adapters](#adapters)
7. [Examples](#examples)

---

## Public API Reference

### Core Configurators

The library exposes two main configurator classes that provide high-level APIs:

#### ApplicationConfigurator (LCPlatformAppConfigurator)

Manages application lifecycle operations.

**Import:**
```typescript
import { LCPlatformAppConfigurator } from '@stainedhead/lc-platform-processing-lib';
```

**Constructor:**
```typescript
constructor(storage: IStorageProvider)
```

**Methods:**

##### `init(params: InitApplicationParams): Promise<Result<Application, ConfigurationError>>`

Creates a new application.

**Parameters:**
- `account` (string): AWS/Azure/GCP account identifier
- `team` (string): Team name (lowercase alphanumeric + hyphens)
- `moniker` (string): Application identifier (lowercase alphanumeric + hyphens)
- `metadata` (ApplicationMetadata): Optional metadata (description, owner, tags)

**Returns:**
- Success: `Application` entity
- Error: `ConfigurationError.AlreadyExists | ValidationFailed`

**Example:**
```typescript
const result = await appConfig.init({
  account: '123456789012',
  team: 'platform',
  moniker: 'my-app',
  metadata: {
    description: 'My application',
    owner: 'platform-team'
  }
});
```

##### `read(params: ApplicationIdentifier): Promise<Result<Application, ConfigurationError>>`

Retrieves existing application.

**Returns:**
- Success: `Application` entity
- Error: `ConfigurationError.NotFound | InvalidFormat`

##### `update(params: UpdateApplicationParams): Promise<Result<Application, ConfigurationError>>`

Updates application metadata.

**Returns:**
- Success: Updated `Application` entity
- Error: `ConfigurationError.NotFound | ValidationFailed`

##### `delete(params: ApplicationIdentifier): Promise<Result<void, ConfigurationError>>`

Deletes application permanently.

**Returns:**
- Success: `void`
- Error: `ConfigurationError.NotFound`

##### `exists(params: ApplicationIdentifier): Promise<boolean>`

Checks if application exists (lightweight operation).

**Returns:** `true` if exists, `false` otherwise

##### `needsUpdate(params: ApplicationIdentifier, localUpdatedAt: Date): Promise<Result<boolean, ConfigurationError>>`

Compares local timestamp with stored application to detect staleness.

**Returns:**
- Success: `true` if local copy is stale, `false` if up-to-date
- Error: `ConfigurationError.NotFound`

##### `validate(params: ApplicationIdentifier): Promise<Result<ValidationReport, ValidationError>>`

Validates application configuration.

**Returns:**
- Success: `ValidationReport` with `valid` boolean and `failures` array
- Error: `ValidationError.InvalidFormat`

---

#### VersionConfigurator (LCPlatformAppVersionConfigurator)

Manages version lifecycle, artifact caching, and policy generation.

**Import:**
```typescript
import { LCPlatformAppVersionConfigurator } from '@stainedhead/lc-platform-processing-lib';
```

**Constructor:**
```typescript
constructor(
  storage: IStorageProvider,
  policy: IPolicyProvider,
  deployment: IDeploymentProvider
)
```

**Methods:**

##### `init(params: InitVersionParams): Promise<Result<Version, ConfigurationError>>`

Creates a new version with dependencies.

**Parameters:**
- `account`, `team`, `moniker` (string): Application identifier
- `versionNumber` (string): Semantic version (e.g., "1.0.0", "2.1.0-beta")
- `dependencies` (DependencyConfiguration[]): Declared dependencies
- `metadata` (VersionMetadata): Optional metadata

**Dependency Types:**
- `database` - PostgreSQL, MySQL, etc.
- `queue` - RabbitMQ, SQS, etc.
- `storage` - S3, Blob Storage, etc.
- `cache` - Redis, Memcached, etc.
- `secret` - Secrets Manager, Key Vault, etc.

**Example:**
```typescript
const result = await versionConfig.init({
  account: '123456789012',
  team: 'platform',
  moniker: 'my-app',
  versionNumber: '1.0.0',
  dependencies: [
    { type: 'database', name: 'postgres', version: '14' },
    { type: 'queue', name: 'rabbitmq', version: '3.11' },
    { type: 'secret', name: 'app-secrets', version: 'latest' }
  ],
  metadata: {
    description: 'Initial release',
    releaseNotes: 'First production version'
  }
});
```

##### `read(params: VersionIdentifier): Promise<Result<Version, ConfigurationError>>`

Retrieves version with dependencies and artifact reference.

**Returns:**
- Success: `Version` entity
- Error: `ConfigurationError.NotFound | InvalidFormat`

##### `update(params: UpdateVersionParams): Promise<Result<Version, ConfigurationError>>`

Updates version dependencies and metadata (version number cannot change).

##### `cache(params: CacheArtifactParams): Promise<Result<ArtifactReference, ConfigurationError | StorageError>>`

Uploads and caches application artifact.

**Parameters:**
- `identifier` (VersionIdentifier): Version to associate artifact with
- `stream` (ReadableStream | NodeJS.ReadableStream): Artifact data stream
- `metadata.contentType` (string): MIME type (e.g., "application/zip")
- `metadata.size` (number): Artifact size in bytes

**Returns:**
- Success: `ArtifactReference` with path, checksum, size, uploadedAt
- Error: `StorageError.UploadFailed | ConfigurationError.NotFound`

**Example:**
```typescript
import { createReadStream } from 'fs';

const stream = createReadStream('./dist/my-app.zip');
const result = await versionConfig.cache({
  identifier: {
    account: '123456789012',
    team: 'platform',
    moniker: 'my-app',
    version: '1.0.0'
  },
  stream,
  metadata: {
    contentType: 'application/zip',
    size: 1024000
  }
});

console.log('Artifact path:', result.value.path);
console.log('Checksum:', result.value.checksum);
```

##### `generateAppPolicy(params: VersionIdentifier): Promise<Result<PolicyDocument, ConfigurationError>>`

Generates least-privilege IAM policy for application runtime based on declared dependencies.

**Returns:**
- Success: `PolicyDocument` with IAM statements
- Error: `ConfigurationError.NotFound | ValidationFailed`

**Policy Structure:**
```typescript
interface PolicyDocument {
  version: string;           // "2012-10-17"
  statements: PolicyStatement[];
}

interface PolicyStatement {
  effect: 'Allow' | 'Deny';
  actions: string[];         // IAM actions (e.g., "s3:GetObject")
  resources: string[];       // Resource ARNs
  conditions?: Record<string, unknown>;
}
```

##### `validateDependencies(params: VersionIdentifier): Promise<Result<ValidationReport, ValidationError>>`

Validates all dependencies are valid and accessible.

---

#### Deployment Use Cases

##### DeployDependencies

Deploys all dependencies for a version with automatic rollback on failure.

**Import:**
```typescript
import { DeployDependencies } from '@stainedhead/lc-platform-processing-lib';
```

**Constructor:**
```typescript
constructor(
  storage: IStorageProvider,
  deployment: IDeploymentProvider
)
```

**Method:**
```typescript
execute(params: DeployDependenciesParams): Promise<Result<DeployDependenciesResult, ConfigurationError>>
```

**Parameters:**
- `account`, `team`, `moniker`, `version` (string): Version identifier
- `environment` (string): Target environment (e.g., "production", "staging")
- `tags` (Record<string, string>): Custom tags to apply

**Returns:**
- Success: `DeployDependenciesResult` with array of `DeploymentResult`
- Error: `ConfigurationError.NotFound | ValidationFailed`

**Behavior:**
- Deploys dependencies in declared order
- Applies standard tags (lc:account, lc:team, etc.) + custom tags
- On failure: Automatically rolls back all deployed dependencies
- Rollback failures logged but don't prevent error return

**Example:**
```typescript
const deployDeps = new DeployDependencies(storage, deployment);
const result = await deployDeps.execute({
  account: '123456789012',
  team: 'platform',
  moniker: 'my-app',
  version: '1.0.0',
  environment: 'production',
  tags: {
    'custom:cost-center': 'engineering',
    'custom:project': 'platform-modernization'
  }
});

if (result.success) {
  console.log(`Deployed ${result.value.deployments.length} dependencies`);
  result.value.deployments.forEach(d => {
    console.log(`  - ${d.deploymentId}: ${d.status}`);
  });
}
```

##### DeployApplication

Deploys application with generated IAM policy and resource tags.

**Import:**
```typescript
import { DeployApplication } from '@stainedhead/lc-platform-processing-lib';
```

**Constructor:**
```typescript
constructor(
  storage: IStorageProvider,
  policy: IPolicyProvider,
  deployment: IDeploymentProvider
)
```

**Method:**
```typescript
execute(params: DeployApplicationParams): Promise<Result<DeploymentResult, ConfigurationError>>
```

**Returns:**
- Success: `DeploymentResult` with deployment details
- Error: `ConfigurationError.NotFound | ValidationFailed`

**DeploymentResult Structure:**
```typescript
interface DeploymentResult {
  deploymentId: string;              // Unique deployment identifier
  status: 'completed' | 'failed';    // Final status
  startedAt: Date;                   // Deployment start time
  completedAt: Date;                 // Deployment completion time
  duration: number;                  // Milliseconds
  appliedTags: Record<string, string>; // All applied tags
}
```

---

## Domain Model

### Entities

#### Application

Represents a deployable application in the platform.

**Properties:**
- `id` (AppId): Unique application identifier (UUID)
- `team` (TeamMoniker): Owning team
- `moniker` (string): Application name (unique within team)
- `metadata` (ApplicationMetadata): Descriptive metadata
- `createdAt` (Date): Creation timestamp
- `updatedAt` (Date): Last modification timestamp

**Methods:**
- `update(metadata)`: Update application metadata
- `toStorageFormat()`: Serialize for storage
- `fromStorage(data)`: Deserialize from storage

#### Version

Represents a specific version of an application with configuration and dependencies.

**Properties:**
- `id` (string): Version identifier
- `appId` (AppId): Parent application ID
- `versionNumber` (VersionNumber): Semantic version
- `dependencies` (DependencyConfiguration[]): Declared dependencies
- `artifactReference?` (ArtifactReference): Cached artifact details
- `metadata` (VersionMetadata): Version metadata
- `createdAt` (Date): Creation timestamp
- `updatedAt` (Date): Last modification timestamp

**Methods:**
- `update({ dependencies?, metadata? })`: Update version configuration
- `cacheArtifact(reference)`: Associate artifact with version
- `isCompatibleWith(other: VersionNumber)`: Check semver compatibility
- `toStorageFormat()`: Serialize for storage
- `fromStorage(data)`: Deserialize from storage

#### Deployment

Represents a deployment instance of a version to an environment.

**Properties:**
- `id` (string): Deployment identifier
- `versionId` (string): Associated version ID
- `environment` (string): Target environment
- `status` (DeploymentStatus): Current state
- `tags` (ResourceTags): Applied resource tags
- `deployedResources` (DeployedResource[]): Provisioned resources
- `createdAt` (Date): Creation timestamp
- `startedAt?` (Date): Deployment start time
- `completedAt?` (Date): Deployment completion time
- `failureReason?` (string): Failure message if failed

**Methods:**
- `updateStatus(newStatus, failureReason?)`: Transition state (enforces state machine)
- `addDeployedResource(resource)`: Track provisioned resource
- `getDuration()`: Calculate deployment duration in milliseconds

**State Machine:**
```
pending → in-progress → completed (terminal)
                      → failed (terminal)
```

Terminal states (completed, failed) cannot transition to other states.

### Value Objects

#### AppId

Unique application identifier using UUID v4.

**Methods:**
- `static generate()`: Generate new UUID
- `static create(value: string)`: Create from existing UUID
- `toString()`: Get string value

#### TeamMoniker

Team identifier with validation.

**Rules:**
- Lowercase alphanumeric characters only
- Hyphens allowed (not at start/end)
- 3-64 characters length

**Methods:**
- `static create(value: string)`: Create with validation

#### VersionNumber

Semantic version parser and validator.

**Format:** `major.minor.patch[-prerelease][+buildmetadata]`

**Properties:**
- `major`, `minor`, `patch` (number)
- `prerelease?` (string)
- `buildMetadata?` (string)

**Methods:**
- `static parse(version: string)`: Parse semver string
- `isCompatibleWith(other: VersionNumber)`: Check caret compatibility
  - For 0.x.x: Both major and minor must match (unstable API)
  - For 1.x.x+: Only major must match (stable API)
- `toString()`: Format as semver string

#### DeploymentStatus

Deployment state with state machine enforcement.

**Values:** `'pending' | 'in-progress' | 'completed' | 'failed'`

**Methods:**
- `static create(status)`: Create with validation
- `isPending()`, `isInProgress()`, `isCompleted()`, `isFailed()`: State checks
- `isTerminal()`: Returns true for completed/failed

#### ResourceTags

Standard and custom resource tags with collision detection.

**Standard Tags (auto-generated):**
- `lc:account` - Account identifier
- `lc:team` - Team name
- `lc:application` - Application moniker
- `lc:version` - Version number
- `lc:environment` - Deployment environment
- `lc:managed-by` - Always "lc-platform"

**Methods:**
- `static create(params)`: Create with standard tags
- `withCustomTags(tags)`: Merge custom tags (validates no lc: prefix collision)
- `toRecord()`: Export as key-value object

#### StoragePath

Cloud-agnostic storage path generator.

**Format:** `lcp-{account}-{team}-{moniker}/[versions/{version}/]app.config`

**Methods:**
- `static forApplication(params)`: Generate app config path
- `static forVersion(params)`: Generate version config path

---

## Use Cases

### Application Management Use Cases

All use cases follow the pattern:
```typescript
class UseCase {
  async execute(params): Promise<Result<T, ConfigurationError>>
}
```

#### InitApplication (FR-003)

Creates new application with unique identifier.

**Validation:**
- Team moniker format (lowercase alphanumeric + hyphens)
- Application moniker uniqueness within team
- Metadata structure

**Side Effects:**
- Generates unique AppId (UUID v4)
- Stores application configuration
- Sets createdAt/updatedAt timestamps

#### ReadApplication (FR-008)

Retrieves application configuration from storage.

**Errors:**
- `NotFound`: Application doesn't exist
- `InvalidFormat`: Corrupted storage data

#### UpdateApplication (FR-005)

Updates application metadata (preserves ID and moniker).

**Validation:**
- Application exists
- Metadata structure valid

**Side Effects:**
- Updates updatedAt timestamp
- Persists to storage

#### DeleteApplication (FR-007)

Permanently removes application.

**Validation:**
- Application exists

**Side Effects:**
- Deletes from storage
- **WARNING**: No cascade delete of versions (must delete versions first)

#### ValidateApplication (FR-009, FR-010, FR-011)

Validates application configuration.

**Checks:**
- Required fields present
- Moniker format valid
- Metadata structure correct

**Returns:**
```typescript
interface ValidationReport {
  valid: boolean;
  failures: ValidationFailure[];
}

interface ValidationFailure {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}
```

### Version Management Use Cases

#### InitVersion (FR-012)

Creates new version with dependencies.

**Validation:**
- Version number is valid semver
- Version doesn't already exist
- Dependency configurations valid

**Side Effects:**
- Generates version ID
- Stores version configuration
- Sets createdAt/updatedAt timestamps

#### ReadVersion (FR-016)

Retrieves version with dependencies and artifact reference.

#### UpdateVersion (FR-014)

Updates dependencies and metadata (version number immutable).

**Common Pattern - Update Dependencies:**
```typescript
// Add new dependency
const result = await versionConfig.update({
  account: '123456789012',
  team: 'platform',
  moniker: 'my-app',
  version: '1.0.0',
  dependencies: [
    ...existingDependencies,
    { type: 'cache', name: 'redis', version: '7.0' }
  ]
});
```

#### DeleteVersion (FR-015)

Removes version configuration.

**Validation:**
- Version exists

#### CacheArtifact (FR-026)

Uploads artifact and associates with version.

**Process:**
1. Validate version exists
2. Generate storage path
3. Upload artifact stream
4. Calculate checksum (SHA-256)
5. Update version with artifact reference

**Artifact Reference:**
```typescript
interface ArtifactReference {
  path: string;          // Storage path
  size: number;          // Bytes
  checksum: string;      // "sha256:..."
  uploadedAt: Date;      // Upload timestamp
}
```

### Deployment Use Cases

#### Deploy Dependencies (FR-027, FR-027a, FR-027b)

Provisions all dependencies with rollback.

**Process:**
1. Read version to get dependencies
2. Generate resource tags (standard + custom)
3. For each dependency:
   - Deploy dependency
   - Track deployment result
   - On failure: Rollback ALL deployed dependencies
4. Return all deployment results

**Rollback Behavior (FR-027a, FR-027b):**
- Automatic on any dependency failure
- Calls `IDeploymentProvider.rollbackDeployment()` for each deployed dependency
- Rollback failures logged via `console.error` but don't prevent error return
- Final result is always failure if any dependency fails

#### Deploy Application (FR-028, FR-032)

Deploys application with IAM policy and tags.

**Process:**
1. Read version
2. Generate IAM policy from dependencies (FR-028)
3. Create standard resource tags (FR-032)
4. Merge custom tags (validate no collisions)
5. Deploy application with policy and tags
6. Return deployment result

---

## Error Handling

### Result Type Pattern

All fallible operations return `Result<T, E>`:

```typescript
type Result<T, E> =
  | { success: true; value: T }
  | { success: false; error: E };
```

**Usage Pattern:**
```typescript
const result = await appConfig.init(params);

if (!result.success) {
  // Handle error
  switch (result.error) {
    case ConfigurationError.AlreadyExists:
      console.error('Application already exists');
      break;
    case ConfigurationError.ValidationFailed:
      console.error('Validation failed');
      break;
    default:
      console.error('Unknown error:', result.error);
  }
  return;
}

// Success - use result.value
const application = result.value;
console.log('Created:', application.id);
```

### Error Types

#### ConfigurationError

Domain-level configuration errors.

```typescript
enum ConfigurationError {
  AlreadyExists = 'CONFIG_ALREADY_EXISTS',
  NotFound = 'CONFIG_NOT_FOUND',
  ValidationFailed = 'CONFIG_VALIDATION_FAILED',
  InvalidFormat = 'CONFIG_INVALID_FORMAT',
}
```

#### ValidationError

Value object validation errors.

```typescript
enum ValidationError {
  InvalidValue = 'VALIDATION_INVALID_VALUE',
  MissingRequired = 'VALIDATION_MISSING_REQUIRED',
  InvalidFormat = 'VALIDATION_INVALID_FORMAT',
}
```

#### StorageError

Storage operation errors.

```typescript
enum StorageError {
  NotFound = 'STORAGE_NOT_FOUND',
  ReadFailed = 'STORAGE_READ_FAILED',
  WriteFailed = 'STORAGE_WRITE_FAILED',
  DeleteFailed = 'STORAGE_DELETE_FAILED',
  UploadFailed = 'STORAGE_UPLOAD_FAILED',
}
```

#### DeploymentError

Deployment operation errors.

```typescript
enum DeploymentError {
  ArtifactNotCached = 'DEPLOYMENT_ARTIFACT_NOT_CACHED',
  DependenciesNotDeployed = 'DEPLOYMENT_DEPENDENCIES_NOT_DEPLOYED',
  DeploymentFailed = 'DEPLOYMENT_FAILED',
  RollbackFailed = 'DEPLOYMENT_ROLLBACK_FAILED',
  InvalidEnvironment = 'DEPLOYMENT_INVALID_ENVIRONMENT',
  PolicyNotGenerated = 'DEPLOYMENT_POLICY_NOT_GENERATED',
}
```

---

## Type Definitions

### Complete Type Reference

```typescript
// Application Types
interface ApplicationMetadata {
  displayName?: string;
  description?: string;
  owner?: string;
  tags?: Record<string, string>;
}

interface ApplicationIdentifier {
  account: string;
  team: string;
  moniker: string;
}

interface InitApplicationParams extends ApplicationIdentifier {
  metadata: ApplicationMetadata;
}

interface UpdateApplicationParams extends ApplicationIdentifier {
  metadata: Partial<ApplicationMetadata>;
}

// Version Types
interface VersionMetadata {
  description?: string;
  releaseNotes?: string;
  tags?: Record<string, string>;
}

interface VersionIdentifier {
  account: string;
  team: string;
  moniker: string;
  version: string;
}

interface DependencyConfiguration {
  type: 'database' | 'queue' | 'storage' | 'cache' | 'secret' | 'function' | 'api';
  name: string;
  version: string;
  config?: Record<string, unknown>;
}

interface InitVersionParams {
  account: string;
  team: string;
  moniker: string;
  versionNumber: string;
  dependencies: DependencyConfiguration[];
  metadata?: VersionMetadata;
}

interface UpdateVersionParams {
  account: string;
  team: string;
  moniker: string;
  version: string;
  dependencies?: DependencyConfiguration[];
  metadata?: Partial<VersionMetadata>;
}

interface CacheArtifactParams {
  identifier: VersionIdentifier;
  stream: ReadableStream | NodeJS.ReadableStream;
  metadata: {
    contentType: string;
    size: number;
  };
}

// Deployment Types
interface DeployApplicationParams {
  account: string;
  team: string;
  moniker: string;
  version: string;
  environment: string;
  tags: Record<string, string>;
}

interface DeployDependenciesParams {
  account: string;
  team: string;
  moniker: string;
  version: string;
  environment: string;
  tags: Record<string, string>;
}

interface DeployDependenciesResult {
  deployments: DeploymentResult[];
}

// Validation Types
interface ValidationReport {
  valid: boolean;
  failures: ValidationFailure[];
}

interface ValidationFailure {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

// Standard Tags
interface StandardTags {
  account: string;
  team: string;
  moniker: string;
  version?: string;
  environment?: string;
  createdBy: string;
  createdAt: string;
  managedBy: 'lc-platform';
}
```

---

## Adapters

### Port Interfaces

The library defines port interfaces that can be implemented with custom logic:

#### IStorageProvider

Storage abstraction for configuration persistence.

```typescript
interface IStorageProvider {
  exists(path: string): Promise<boolean>;
  read<T>(path: string): Promise<Result<T, StorageError>>;
  write<T>(path: string, data: T): Promise<Result<void, StorageError>>;
  delete(path: string): Promise<Result<void, StorageError>>;
  uploadArtifact(
    path: string,
    stream: ReadableStream | NodeJS.ReadableStream,
    metadata: { size: number; contentType: string }
  ): Promise<Result<ArtifactReference, StorageError>>;
  deleteArtifact(path: string): Promise<Result<void, StorageError>>;
}
```

#### IPolicyProvider

IAM policy generation from dependencies.

```typescript
interface IPolicyProvider {
  generateAppPolicy(
    dependencies: DependencyConfiguration[]
  ): Promise<Result<PolicyDocument, Error>>;

  generateCICDPolicy(
    dependencies: DependencyConfiguration[]
  ): Promise<Result<PolicyDocument, Error>>;

  serializePolicy(policy: PolicyDocument): string;
}
```

#### IDeploymentProvider

Deployment operations abstraction.

```typescript
interface IDeploymentProvider {
  deployApplication(params: {
    artifactPath: string;
    policyDocument: PolicyDocument;
    environment: string;
    tags: Record<string, string>;
  }): Promise<Result<DeploymentResult, DeploymentError>>;

  deployDependency(params: {
    dependency: DependencyConfiguration;
    environment: string;
    tags: Record<string, string>;
  }): Promise<Result<DeploymentResult, DeploymentError>>;

  rollbackDeployment(
    deploymentId: string
  ): Promise<Result<void, DeploymentError>>;
}
```

### Reference Implementations

#### AcceleratorStorageAdapter

In-memory storage for testing/prototyping.

**Features:**
- Map-based storage (non-persistent)
- Simulated artifact uploads
- Suitable for unit tests and development

#### AcceleratorPolicyAdapter

Basic IAM policy generator.

**Features:**
- Generates policies from dependency types
- Supports common dependency types (database, queue, storage, etc.)
- Returns cloud-agnostic policy structure

#### AcceleratorDeploymentAdapter

Mock deployment operations.

**Features:**
- Simulates deployment with state tracking
- Generates deployment IDs
- Tracks deployment duration
- No actual infrastructure provisioning

---

## Examples

### Complete Application Lifecycle

```typescript
import {
  LCPlatformAppConfigurator,
  LCPlatformAppVersionConfigurator,
  DeployDependencies,
  DeployApplication,
  AcceleratorStorageAdapter,
  AcceleratorPolicyAdapter,
  AcceleratorDeploymentAdapter,
} from '@stainedhead/lc-platform-processing-lib';
import { createReadStream } from 'fs';

// Initialize adapters
const storage = new AcceleratorStorageAdapter();
const policy = new AcceleratorPolicyAdapter();
const deployment = new AcceleratorDeploymentAdapter();

// Create configurators
const appConfig = new LCPlatformAppConfigurator(storage);
const versionConfig = new LCPlatformAppVersionConfigurator(storage, policy, deployment);

// 1. Create application
const appResult = await appConfig.init({
  account: '123456789012',
  team: 'platform',
  moniker: 'my-app',
  metadata: {
    description: 'My application',
    owner: 'platform-team'
  }
});

if (!appResult.success) {
  console.error('Failed to create app:', appResult.error);
  process.exit(1);
}

console.log('✓ Application created:', appResult.value.id);

// 2. Create version
const versionResult = await versionConfig.init({
  account: '123456789012',
  team: 'platform',
  moniker: 'my-app',
  versionNumber: '1.0.0',
  dependencies: [
    { type: 'database', name: 'postgres', version: '14' },
    { type: 'queue', name: 'rabbitmq', version: '3.11' },
    { type: 'cache', name: 'redis', version: '7.0' }
  ],
  metadata: {
    description: 'Initial release',
    releaseNotes: 'First production version with PostgreSQL, RabbitMQ, and Redis'
  }
});

if (!versionResult.success) {
  console.error('Failed to create version:', versionResult.error);
  process.exit(1);
}

console.log('✓ Version created:', versionResult.value.versionNumber);

// 3. Cache artifact
const artifactStream = createReadStream('./dist/my-app.zip');
const cacheResult = await versionConfig.cache({
  identifier: {
    account: '123456789012',
    team: 'platform',
    moniker: 'my-app',
    version: '1.0.0'
  },
  stream: artifactStream,
  metadata: {
    contentType: 'application/zip',
    size: 1024000
  }
});

if (!cacheResult.success) {
  console.error('Failed to cache artifact:', cacheResult.error);
  process.exit(1);
}

console.log('✓ Artifact cached:', cacheResult.value.checksum);

// 4. Generate IAM policy
const policyResult = await versionConfig.generateAppPolicy({
  account: '123456789012',
  team: 'platform',
  moniker: 'my-app',
  version: '1.0.0'
});

if (!policyResult.success) {
  console.error('Failed to generate policy:', policyResult.error);
  process.exit(1);
}

console.log('✓ IAM policy generated with', policyResult.value.statements.length, 'statements');

// 5. Deploy dependencies
const deployDeps = new DeployDependencies(storage, deployment);
const depsResult = await deployDeps.execute({
  account: '123456789012',
  team: 'platform',
  moniker: 'my-app',
  version: '1.0.0',
  environment: 'production',
  tags: {
    'custom:cost-center': 'engineering',
    'custom:project': 'platform-v2'
  }
});

if (!depsResult.success) {
  console.error('Failed to deploy dependencies:', depsResult.error);
  process.exit(1);
}

console.log('✓ Dependencies deployed:', depsResult.value.deployments.length);

// 6. Deploy application
const deployApp = new DeployApplication(storage, policy, deployment);
const appDeployResult = await deployApp.execute({
  account: '123456789012',
  team: 'platform',
  moniker: 'my-app',
  version: '1.0.0',
  environment: 'production',
  tags: {
    'custom:owner': 'john-doe'
  }
});

if (!appDeployResult.success) {
  console.error('Failed to deploy application:', appDeployResult.error);
  process.exit(1);
}

console.log('✓ Application deployed:');
console.log('  Deployment ID:', appDeployResult.value.deploymentId);
console.log('  Status:', appDeployResult.value.status);
console.log('  Duration:', appDeployResult.value.duration, 'ms');
console.log('  Tags:', Object.keys(appDeployResult.value.appliedTags).length);
```

### Error Handling Pattern

```typescript
async function deployWithErrorHandling() {
  const result = await versionConfig.init({
    account: '123456789012',
    team: 'platform',
    moniker: 'my-app',
    versionNumber: '1.0.0',
    dependencies: []
  });

  if (!result.success) {
    // Type-safe error handling with discriminated union
    switch (result.error) {
      case ConfigurationError.AlreadyExists:
        console.log('Version already exists - reading existing version');
        return await versionConfig.read({
          account: '123456789012',
          team: 'platform',
          moniker: 'my-app',
          version: '1.0.0'
        });

      case ConfigurationError.ValidationFailed:
        console.error('Validation failed - check version number format');
        throw new Error('Invalid version configuration');

      case ConfigurationError.NotFound:
        console.error('Application not found - create application first');
        throw new Error('Application does not exist');

      default:
        console.error('Unexpected error:', result.error);
        throw new Error('Deployment failed');
    }
  }

  return result;
}
```

### Multi-Environment Deployment

```typescript
async function deployToAllEnvironments() {
  const environments = ['dev', 'staging', 'production'];

  for (const env of environments) {
    console.log(`Deploying to ${env}...`);

    // Deploy dependencies
    const depsResult = await deployDeps.execute({
      account: '123456789012',
      team: 'platform',
      moniker: 'my-app',
      version: '1.0.0',
      environment: env,
      tags: {
        'custom:environment-type': env === 'production' ? 'prod' : 'non-prod'
      }
    });

    if (!depsResult.success) {
      console.error(`Failed to deploy dependencies to ${env}`);
      continue;
    }

    // Deploy application
    const appResult = await deployApp.execute({
      account: '123456789012',
      team: 'platform',
      moniker: 'my-app',
      version: '1.0.0',
      environment: env,
      tags: {
        'custom:deployed-by': 'ci-cd-pipeline'
      }
    });

    if (!appResult.success) {
      console.error(`Failed to deploy application to ${env}`);
      continue;
    }

    console.log(`✓ Deployed to ${env}:`, appResult.value.deploymentId);
  }
}
```

---

For more examples and implementation details, see:
- [README.md](../README.md) - Quick start and basic examples
- [technical-details.md](./technical-details.md) - Architecture and design patterns
- [Source Code](../src/index.ts) - Public API exports with JSDoc

**Version**: 0.2.0
**Last Updated**: 2025-12-28
