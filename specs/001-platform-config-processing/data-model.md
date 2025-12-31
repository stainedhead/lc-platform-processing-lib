# Data Model: Platform Configuration Processing Library

**Feature**: 001-platform-config-processing
**Date**: 2025-12-28
**Layer**: Domain (`src/domain/`)

## Overview

This document defines the domain entities, value objects, and their relationships for platform configuration management. All models follow Domain-Driven Design principles with business rules encapsulated in entities.

## Value Objects

Value objects are immutable, have no identity, and are defined by their attributes. They ensure validity through construction.

### AppId

**Purpose**: Unique identifier for an application across the platform
**Location**: `src/domain/value-objects/AppId.ts`

**Attributes**:
- `value: string` - UUID format identifier

**Validation Rules**:
- MUST be valid UUID format
- MUST NOT be empty string

**Invariants**:
- Immutable after construction
- Two AppIds with same value are equal (value equality)

**Factory Methods**:
- `AppId.generate()`: Creates new unique AppId using UUID generator
- `AppId.fromString(value: string)`: Creates AppId from existing UUID string (validates format)

---

### VersionNumber

**Purpose**: Semantic version identifier for application versions
**Location**: `src/domain/value-objects/VersionNumber.ts`

**Attributes**:
- `major: number` - Major version (breaking changes)
- `minor: number` - Minor version (new features)
- `patch: number` - Patch version (bug fixes)
- `prerelease?: string` - Optional prerelease identifier (alpha, beta, rc.1)

**Validation Rules**:
- major, minor, patch MUST be non-negative integers
- prerelease MUST match format: `^[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*$` if present
- MUST follow semantic versioning 2.0.0 specification

**Invariants**:
- Immutable after construction
- Comparable (version ordering: 1.0.0 < 1.1.0 < 2.0.0)
- String representation: `{major}.{minor}.{patch}[-{prerelease}]`

**Factory Methods**:
- `VersionNumber.parse(version: string)`: Creates from string (e.g., "1.2.3", "2.0.0-beta.1")
- `VersionNumber.create(major, minor, patch, prerelease?)`: Creates from components

**Methods**:
- `toString(): string`: Returns semantic version string
- `compareTo(other: VersionNumber): number`: Returns -1, 0, or 1 for ordering
- `isGreaterThan(other: VersionNumber): boolean`
- `isCompatibleWith(other: VersionNumber): boolean`: Checks if major versions match

---

### DeploymentStatus

**Purpose**: Tracks current state of a deployment operation
**Location**: `src/domain/value-objects/DeploymentStatus.ts`

**Type**: Discriminated union
```typescript
type DeploymentStatus =
  | { state: 'pending'; startedAt?: never; completedAt?: never }
  | { state: 'in-progress'; startedAt: Date; completedAt?: never }
  | { state: 'completed'; startedAt: Date; completedAt: Date }
  | { state: 'failed'; startedAt: Date; completedAt: Date; error: string }
```

**Validation Rules**:
- State transitions MUST follow: pending → in-progress → (completed | failed)
- Cannot transition from completed or failed to any other state
- startedAt MUST be set when entering in-progress
- completedAt MUST be set when entering completed or failed
- completedAt MUST be after startedAt
- error MUST be non-empty string for failed state

**Factory Methods**:
- `DeploymentStatus.pending()`: Creates pending status
- `DeploymentStatus.start()`: Transitions to in-progress
- `DeploymentStatus.complete()`: Transitions to completed
- `DeploymentStatus.fail(error: string)`: Transitions to failed

---

### TeamMoniker

**Purpose**: Composite identifier combining team and application moniker (unique name within team)
**Location**: `src/domain/value-objects/TeamMoniker.ts`

**Attributes**:
- `team: string` - Team name (organization unit)
- `moniker: string` - Application moniker (unique within team)

**Validation Rules**:
- team MUST match pattern: `^[a-z0-9][a-z0-9-]*[a-z0-9]$` (lowercase alphanumeric with hyphens, 2+ chars)
- moniker MUST match pattern: `^[a-z0-9][a-z0-9-]*[a-z0-9]$` (lowercase alphanumeric with hyphens, 2+ chars)
- MUST NOT contain special characters that require URL encoding
- MUST NOT be empty

**Invariants**:
- Immutable after construction
- Two TeamMonikers with same team and moniker are equal
- String representation: `{team}/{moniker}`

**Factory Methods**:
- `TeamMoniker.create(team: string, moniker: string)`: Creates validated instance

---

### StoragePath

**Purpose**: Generates and validates storage paths for application and version configurations
**Location**: `src/domain/value-objects/StoragePath.ts`

**Attributes**:
- `account: string` - Cloud account identifier
- `team: string` - Team name
- `moniker: string` - Application moniker
- `version?: string` - Optional version number (for version-specific paths)

**Validation Rules**:
- account, team, moniker MUST be non-empty
- account, team, moniker MUST contain only safe path characters: `^[a-zA-Z0-9_-]+$`
- version MUST be valid semantic version string if provided

**Computed Properties**:
- `bucketName: string` - Returns `lcp-{account}-{team}-{moniker}/`
- `appConfigPath: string` - Returns `{bucketName}app.config`
- `versionPath: string` - Returns `{bucketName}versions/{version}/` (requires version)
- `versionConfigPath: string` - Returns `{versionPath}appversion.config` (requires version)
- `artifactPath: string` - Returns `{versionPath}artifact` (requires version)

**Factory Methods**:
- `StoragePath.forApplication(account, team, moniker)`: Creates path for application
- `StoragePath.forVersion(account, team, moniker, version)`: Creates path for version

---

### ResourceTags

**Purpose**: Standard and custom tags applied to deployed resources for management, cost tracking, and compliance
**Location**: `src/domain/value-objects/ResourceTags.ts`

**Attributes**:
- `standard: StandardTags` - Required standard tags
- `custom: Record<string, string>` - Optional custom tags from LCPlatformApp metadata

**Nested Types**:
```typescript
interface StandardTags {
  account: string;           // Cloud account identifier
  team: string;              // Team name
  moniker: string;           // Application moniker
  version?: string;          // Version number (for version-specific resources)
  environment?: string;      // Deployment environment (dev, staging, production)
  createdBy: string;         // User or system that created the resource
  createdAt: string;         // ISO 8601 timestamp
  managedBy: 'lc-platform'; // Platform identifier
}
```

**Validation Rules**:
- All standard tags MUST be non-empty strings (except optional version/environment)
- Custom tag keys MUST match pattern: `^[a-zA-Z0-9_-]+$`
- Custom tag values MUST be non-empty strings
- Total tags (standard + custom) MUST NOT exceed cloud provider limits (typically 50)

**Factory Methods**:
- `ResourceTags.forApplication(app: Application, platformApp: LCPlatformApp, createdBy: string)`: Creates tags for application deployment
- `ResourceTags.forVersion(version: Version, platformApp: LCPlatformApp, environment: string, createdBy: string)`: Creates tags for version deployment
- `ResourceTags.merge(tags1: ResourceTags, tags2: ResourceTags)`: Merges two tag sets (custom tags override)

**Methods**:
- `toCloudFormat(): Record<string, string>`: Converts to flat key-value map for cloud provider tagging APIs
- `validate(): Result<void, ValidationError>`: Ensures tags comply with cloud provider constraints

---

## Entities

Entities have unique identity and mutable state. They encapsulate business rules and maintain invariants.

### Application (Aggregate Root)

**Purpose**: Represents a deployable application registered in the platform
**Location**: `src/domain/entities/Application.ts`
**Aggregate Root**: Yes - controls access to related Version entities

**Attributes**:
- `id: AppId` - Unique identifier (identity)
- `account: string` - Cloud account identifier
- `teamMoniker: TeamMoniker` - Team and moniker composite
- `storagePath: StoragePath` - Storage location for configuration
- `metadata: ApplicationMetadata` - Additional descriptive data
- `createdAt: Date` - Timestamp of creation
- `updatedAt: Date` - Timestamp of last update

**Nested Types**:
```typescript
interface ApplicationMetadata {
  displayName?: string;
  description?: string;
  owner?: string;
  tags?: Record<string, string>;
}
```

**Business Rules**:
1. **Uniqueness**: No two applications can have same account + team + moniker combination
   - Enforced by: `exists()` check before `init()` operation
   - Error: ConfigurationError.AlreadyExists

2. **Validation**: All fields must be valid before persistence
   - TeamMoniker must be valid (pattern matching)
   - StoragePath must be valid (safe characters)
   - Metadata fields (if provided) must be non-empty strings

3. **Update tracking**: updatedAt must be set on every modification

**Factory Methods**:
- `Application.create(params: CreateApplicationParams)`: Creates new application with validation
- `Application.fromStorage(data: StoredApplicationData)`: Reconstructs from storage

**Methods**:
- `update(params: UpdateApplicationParams): Result<void, ValidationError>`: Updates metadata
- `toStorageFormat(): StoredApplicationData`: Serializes for persistence
- `equals(other: Application): boolean`: Compares by AppId

**Invariants**:
- id is immutable (set at creation)
- teamMoniker is immutable (set at creation)
- storagePath is immutable (set at creation)
- updatedAt >= createdAt always true

---

### Version (Aggregate Root)

**Purpose**: Represents a specific version of an application with dependencies and deployment artifacts
**Location**: `src/domain/entities/Version.ts`
**Aggregate Root**: Yes - controls deployment configuration for this version

**Attributes**:
- `id: string` - Unique version identifier (UUID)
- `applicationId: AppId` - Reference to parent Application (foreign key)
- `versionNumber: VersionNumber` - Semantic version
- `storagePath: StoragePath` - Version-specific storage location
- `dependencies: Dependency[]` - Required infrastructure dependencies
- `artifactReference?: ArtifactReference` - Reference to cached deployment artifact
- `policyReferences: PolicyReferences` - Generated IAM policies
- `metadata: VersionMetadata` - Additional version data
- `createdAt: Date`
- `updatedAt: Date`

**Nested Types**:
```typescript
interface Dependency {
  type: DependencyType; // from lc-platform-dev-accelerators
  name: string;
  configuration: Record<string, unknown>; // Dependency-specific config
}

interface ArtifactReference {
  path: string; // Storage path to artifact
  size: number; // Bytes
  checksum: string; // SHA-256 hash
  uploadedAt: Date;
}

interface PolicyReferences {
  appPolicyPath?: string; // Storage path to app policy JSON
  cicdPolicyPath?: string; // Storage path to CI/CD policy JSON
  generatedAt?: Date;
}

interface VersionMetadata {
  releaseNotes?: string;
  buildNumber?: string;
  commitSha?: string;
  tags?: Record<string, string>;
}
```

**Business Rules**:
1. **Version Uniqueness**: No two versions with same applicationId + versionNumber
   - Enforced by: `exists()` check before `init()` operation
   - Error: ConfigurationError.AlreadyExists

2. **Dependency Validation**: All dependencies must be valid and deployable
   - Each dependency type must be supported by platform
   - Configuration must match dependency type schema
   - Validated by: `validateDependencies()` operation

3. **Artifact Immutability**: Once artifact is cached, it cannot be changed for this version
   - Cache operation only allowed if artifactReference is null
   - To update artifact, must create new version

4. **Policy Generation**: Policies can only be generated after dependencies are validated
   - Requires: dependencies non-empty and validated
   - Generates: appPolicyPath and cicdPolicyPath

**Factory Methods**:
- `Version.create(params: CreateVersionParams)`: Creates new version
- `Version.fromStorage(data: StoredVersionData)`: Reconstructs from storage

**Methods**:
- `update(params: UpdateVersionParams): Result<void, ValidationError>`: Updates metadata/dependencies
- `cacheArtifact(artifact: ArtifactData): Result<ArtifactReference, StorageError>`: Stores artifact
- `validateDependencies(): Result<ValidationReport, ValidationError>`: Checks dependency configuration
- `generatePolicies(generator: IPolicyProvider): Result<PolicyReferences, PolicyError>`: Creates IAM policies
- `toStorageFormat(): StoredVersionData`: Serializes for persistence

**Invariants**:
- id, applicationId, versionNumber are immutable
- artifactReference can only transition from null to non-null (never modified once set)
- If policyReferences.generatedAt is set, both appPolicyPath and cicdPolicyPath must be non-null

---

### Deployment (Aggregate Root)

**Purpose**: Represents a runtime instance of a Version deployed to an Environment
**Location**: `src/domain/entities/Deployment.ts`
**Aggregate Root**: Yes - tracks deployment lifecycle

**Attributes**:
- `id: string` - Unique deployment identifier (UUID)
- `versionId: string` - Reference to deployed Version
- `environment: Environment` - Target environment (from lc-platform-dev-accelerators)
- `status: DeploymentStatus` - Current deployment state
- `dependenciesDeployed: boolean` - Whether dependencies are provisioned
- `applicationDeployed: boolean` - Whether application is deployed
- `appliedTags: ResourceTags` - Tags applied to all deployed resources
- `deploymentLog: DeploymentLogEntry[]` - Audit trail of deployment steps
- `createdAt: Date`
- `completedAt?: Date`

**Nested Types**:
```typescript
interface DeploymentLogEntry {
  timestamp: Date;
  step: 'dependencies' | 'application' | 'rollback';
  status: 'started' | 'completed' | 'failed';
  message: string;
  error?: string;
}
```

**Business Rules**:
1. **Deployment Order**: Dependencies must be deployed before application
   - Application deployment only allowed if dependenciesDeployed === true
   - Error: DeploymentError.DependenciesNotDeployed

2. **Status Transitions**: Must follow state machine
   - pending → in-progress → (completed | failed)
   - Cannot redeploy if status is completed (must create new Deployment)

3. **Audit Trail**: Every status change must be logged
   - DeploymentLogEntry created for each operation
   - Includes timestamp, step, status, message

4. **Resource Tagging**: All deployed resources must be tagged
   - appliedTags MUST be set when deployment is created
   - Tags MUST include all standard tags (account, team, moniker, version, environment, createdBy, createdAt, managedBy)
   - Tags MUST be applied to: application hosting resources, dependency services, IAM policies/roles
   - Tags are immutable once deployment is completed

**Factory Methods**:
- `Deployment.create(versionId, environment)`: Creates pending deployment
- `Deployment.fromStorage(data: StoredDeploymentData)`: Reconstructs from storage

**Methods**:
- `startDependencyDeployment(): void`: Transitions to in-progress, logs step
- `completeDependencyDeployment(): void`: Sets dependenciesDeployed = true, logs step
- `failDependencyDeployment(error: string): void`: Transitions to failed, logs error
- `startApplicationDeployment(): Result<void, DeploymentError>`: Checks dependencies deployed
- `completeApplicationDeployment(): void`: Sets applicationDeployed = true, transitions to completed
- `failApplicationDeployment(error: string): void`: Transitions to failed
- `toStorageFormat(): StoredDeploymentData`: Serializes for persistence

**Invariants**:
- If applicationDeployed === true, then dependenciesDeployed MUST be true
- If status.state === 'completed', both dependenciesDeployed and applicationDeployed MUST be true
- deploymentLog entries are append-only (never modified or deleted)
- completedAt is set when status transitions to completed or failed

---

## Entity Relationships

```
┌─────────────────────────────────────────────────────────┐
│ Application (Aggregate Root)                            │
│ ─────────────────────────────────────────────────────── │
│ - id: AppId                                             │
│ - account: string                                       │
│ - teamMoniker: TeamMoniker                              │
│ - storagePath: StoragePath                              │
│ - metadata: ApplicationMetadata                         │
│ - createdAt, updatedAt: Date                            │
└─────────────────┬───────────────────────────────────────┘
                  │ 1
                  │
                  │ 0..*
┌─────────────────▼───────────────────────────────────────┐
│ Version (Aggregate Root)                                │
│ ─────────────────────────────────────────────────────── │
│ - id: string                                            │
│ - applicationId: AppId (FK)                             │
│ - versionNumber: VersionNumber                          │
│ - storagePath: StoragePath                              │
│ - dependencies: Dependency[]                            │
│ - artifactReference?: ArtifactReference                 │
│ - policyReferences: PolicyReferences                    │
│ - metadata: VersionMetadata                             │
│ - createdAt, updatedAt: Date                            │
└─────────────────┬───────────────────────────────────────┘
                  │ 1
                  │
                  │ 0..*
┌─────────────────▼───────────────────────────────────────┐
│ Deployment (Aggregate Root)                             │
│ ─────────────────────────────────────────────────────── │
│ - id: string                                            │
│ - versionId: string (FK)                                │
│ - environment: Environment                              │
│ - status: DeploymentStatus                              │
│ - dependenciesDeployed: boolean                         │
│ - applicationDeployed: boolean                          │
│ - deploymentLog: DeploymentLogEntry[]                   │
│ - createdAt: Date                                       │
│ - completedAt?: Date                                    │
└─────────────────────────────────────────────────────────┘
```

**Relationship Notes**:
- Application → Version: One-to-many (an application can have multiple versions)
- Version → Deployment: One-to-many (a version can be deployed to multiple environments)
- Relationships are references only (AppId, version id) - not object containment
- Each aggregate is independently persisted and retrieved

---

## Persistence Format

All entities are persisted as JSON in cloud storage:

**Application** → `lcp-{account}-{team}-{moniker}/app.config`
```json
{
  "id": "uuid",
  "account": "acme",
  "team": "alpha",
  "moniker": "api-service",
  "metadata": {
    "displayName": "Alpha API Service",
    "description": "Core API for alpha team",
    "owner": "alpha-team@acme.com"
  },
  "createdAt": "2025-01-01T00:00:00Z",
  "updatedAt": "2025-01-01T00:00:00Z"
}
```

**Version** → `lcp-{account}-{team}-{moniker}/versions/{version}/appversion.config`
```json
{
  "id": "uuid",
  "applicationId": "app-uuid",
  "versionNumber": "1.2.3",
  "dependencies": [
    {
      "type": "database",
      "name": "postgres-main",
      "configuration": { "engine": "postgresql", "version": "14" }
    }
  ],
  "artifactReference": {
    "path": "lcp-acme-alpha-api-service/versions/1.2.3/artifact",
    "size": 52428800,
    "checksum": "sha256:abc123...",
    "uploadedAt": "2025-01-01T01:00:00Z"
  },
  "policyReferences": {
    "appPolicyPath": "lcp-acme-alpha-api-service/versions/1.2.3/app-policy.json",
    "cicdPolicyPath": "lcp-acme-alpha-api-service/versions/1.2.3/cicd-policy.json",
    "generatedAt": "2025-01-01T01:05:00Z"
  },
  "metadata": {
    "releaseNotes": "Performance improvements",
    "commitSha": "abc123def456"
  },
  "createdAt": "2025-01-01T00:30:00Z",
  "updatedAt": "2025-01-01T01:05:00Z"
}
```

---

## Domain Events

Domain events signal important state changes for cross-aggregate communication:

- `ApplicationCreated`: Emitted when new application is initialized
- `ApplicationUpdated`: Emitted when application metadata changes
- `ApplicationDeleted`: Emitted when application is removed
- `VersionCreated`: Emitted when new version is initialized
- `VersionUpdated`: Emitted when version configuration changes
- `ArtifactCached`: Emitted when deployment artifact is uploaded
- `PoliciesGenerated`: Emitted when IAM policies are created
- `DeploymentStarted`: Emitted when deployment transitions to in-progress
- `DeploymentCompleted`: Emitted when deployment succeeds
- `DeploymentFailed`: Emitted when deployment fails

Events are optional for initial implementation but provide foundation for future features (notifications, audit logs, event sourcing).
