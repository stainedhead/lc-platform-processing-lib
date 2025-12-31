# Public API Contracts

**Feature**: 001-platform-config-processing
**Date**: 2025-12-28
**Purpose**: Define stable public API for platform configuration processing library

## Overview

This library provides a programmatic API for managing platform configurations. It is consumed by:
- `lc-platform-dev-accelerators` package (direct consumer)
- `lc-platform-dev-cli` (via accelerators)
- Other processing applications and REST services

## Public Exports

All public exports from `src/index.ts`:

### Configurator Classes

#### LCPlatformAppConfigurator

**Purpose**: Manages application configuration lifecycle

**Constructor**:
```typescript
constructor(
  platform: LCPlatform,
  app: LCPlatformApp,
  storageProvider: IStorageProvider
)
```

**Methods**:
```typescript
// Initialize new application configuration
async init(params: InitApplicationParams): Promise<Result<Application, ConfigurationError>>

// Read existing application configuration
async read(identifier: ApplicationIdentifier): Promise<Result<Application, ConfigurationError>>

// Update application configuration metadata
async update(params: UpdateApplicationParams): Promise<Result<Application, ConfigurationError>>

// Delete application configuration
async delete(identifier: ApplicationIdentifier): Promise<Result<void, ConfigurationError>>

// Check if application configuration exists
async exists(identifier: ApplicationIdentifier): Promise<boolean>

// Validate application configuration
async validate(params: ValidateApplicationParams): Promise<Result<ValidationReport, ValidationError>>

// Check if in-memory configuration differs from stored
async needsUpdate(application: Application): Promise<boolean>
```

---

#### LCPlatformAppVersionConfigurator

**Purpose**: Manages version configuration, artifact caching, policy generation, and deployment

**Constructor**:
```typescript
constructor(
  platform: LCPlatform,
  app: LCPlatformApp,
  storageProvider: IStorageProvider,
  policyProvider: IPolicyProvider,
  deploymentProvider: IDeploymentProvider
)
```

**Methods**:
```typescript
// Initialize new version configuration
async init(params: InitVersionParams): Promise<Result<Version, ConfigurationError>>

// Read existing version configuration
async read(identifier: VersionIdentifier): Promise<Result<Version, ConfigurationError>>

// Update version configuration
async update(params: UpdateVersionParams): Promise<Result<Version, ConfigurationError>>

// Delete version configuration
async delete(identifier: VersionIdentifier): Promise<Result<void, ConfigurationError>>

// Check if version configuration exists
async exists(identifier: VersionIdentifier): Promise<boolean>

// Validate version configuration
async validate(params: ValidateVersionParams): Promise<Result<ValidationReport, ValidationError>>

// Check if in-memory configuration differs from stored
async needsUpdate(version: Version): Promise<boolean>

// Cache deployment artifact binary
async cache(params: CacheArtifactParams): Promise<Result<ArtifactReference, StorageError>>

// Validate version dependencies
async validateDependencies(identifier: VersionIdentifier): Promise<Result<DependencyValidationReport, ValidationError>>

// Generate IAM policy for application runtime
async generateAppPolicy(identifier: VersionIdentifier): Promise<Result<PolicyReference, PolicyError>>

// Generate IAM policy for CI/CD deployment
async generateCICDPolicy(identifier: VersionIdentifier): Promise<Result<PolicyReference, PolicyError>>

// Read generated application policy
async readAppPolicy(identifier: VersionIdentifier): Promise<Result<PolicyDocument, PolicyError>>

// Read generated CI/CD policy
async readCICDPolicy(identifier: VersionIdentifier): Promise<Result<PolicyDocument, PolicyError>>

// Deploy dependencies only
async deployDependencies(params: DeployDependenciesParams): Promise<Result<DeploymentResult, DeploymentError>>

// Deploy application only (requires dependencies already deployed)
async deployApp(params: DeployAppParams): Promise<Result<DeploymentResult, DeploymentError>>

// Deploy dependencies then application (orchestration)
async deployAppVersionAndDependencies(params: DeployParams): Promise<Result<DeploymentResult, DeploymentError>>
```

---

### Types and Interfaces

#### Exported Domain Types

```typescript
// Entities
export { Application } from './domain/entities/Application';
export { Version } from './domain/entities/Version';
export { Deployment } from './domain/entities/Deployment';

// Value Objects
export { AppId } from './domain/value-objects/AppId';
export { VersionNumber } from './domain/value-objects/VersionNumber';
export { DeploymentStatus } from './domain/value-objects/DeploymentStatus';
export { TeamMoniker } from './domain/value-objects/TeamMoniker';
export { StoragePath } from './domain/value-objects/StoragePath';

// Domain types
export type {
  ApplicationMetadata,
  Dependency,
  ArtifactReference,
  PolicyReferences,
  VersionMetadata,
  DeploymentLogEntry
} from './domain/types';
```

#### Exported Use Case Types

```typescript
// Result type for error handling
export type Result<T, E> =
  | { success: true; value: T }
  | { success: false; error: E };

// Error enums
export enum ConfigurationError {
  AlreadyExists = 'ALREADY_EXISTS',
  NotFound = 'NOT_FOUND',
  ValidationFailed = 'VALIDATION_FAILED',
  StorageError = 'STORAGE_ERROR'
}

export enum ValidationError {
  InvalidFormat = 'INVALID_FORMAT',
  InvalidDependency = 'INVALID_DEPENDENCY',
  MissingRequired = 'MISSING_REQUIRED'
}

export enum StorageError {
  UploadFailed = 'UPLOAD_FAILED',
  ReadFailed = 'READ_FAILED',
  WriteFailed = 'WRITE_FAILED'
}

export enum PolicyError {
  GenerationFailed = 'GENERATION_FAILED',
  NotFound = 'NOT_FOUND'
}

export enum DeploymentError {
  DependenciesNotDeployed = 'DEPENDENCIES_NOT_DEPLOYED',
  DeploymentFailed = 'DEPLOYMENT_FAILED',
  ArtifactNotCached = 'ARTIFACT_NOT_CACHED'
}

// DTOs
export type {
  InitApplicationParams,
  UpdateApplicationParams,
  ValidateApplicationParams,
  ApplicationIdentifier,
  InitVersionParams,
  UpdateVersionParams,
  ValidateVersionParams,
  VersionIdentifier,
  CacheArtifactParams,
  DeployDependenciesParams,
  DeployAppParams,
  DeployParams,
  ValidationReport,
  DependencyValidationReport,
  PolicyReference,
  PolicyDocument,
  DeploymentResult
} from './use-cases/types';
```

#### Port Interfaces (for adapter implementations)

```typescript
// Storage operations
export interface IStorageProvider {
  exists(path: string): Promise<boolean>;
  read<T>(path: string): Promise<T>;
  write<T>(path: string, data: T): Promise<void>;
  delete(path: string): Promise<void>;
  uploadStream(path: string, stream: ReadableStream, metadata: UploadMetadata): Promise<ArtifactReference>;
}

// Policy generation
export interface IPolicyProvider {
  generateAppPolicy(dependencies: Dependency[]): Promise<PolicyDocument>;
  generateCICDPolicy(dependencies: Dependency[]): Promise<PolicyDocument>;
  writePolicy(path: string, policy: PolicyDocument): Promise<void>;
  readPolicy(path: string): Promise<PolicyDocument>;
}

// Deployment operations
export interface IDeploymentProvider {
  deployDependencies(dependencies: Dependency[], environment: Environment): Promise<DeploymentResult>;
  deployApplication(artifactRef: ArtifactReference, policy: PolicyDocument, environment: Environment): Promise<DeploymentResult>;
}

export type { IStorageProvider, IPolicyProvider, IDeploymentProvider } from './use-cases/ports';
```

---

## Breaking Change Policy

**MAJOR version bump required for**:
- Removing or renaming exported classes (LCPlatformAppConfigurator, LCPlatformAppVersionConfigurator)
- Removing or renaming public methods
- Changing method signatures (parameters, return types)
- Changing error enum values
- Removing exported types

**MINOR version bump allowed for**:
- Adding new methods to configurators
- Adding new exported types
- Adding new error enum values
- Adding optional parameters to existing methods

**PATCH version bump allowed for**:
- Bug fixes that don't change public API
- Internal refactoring
- Documentation improvements
- Performance optimizations

---

## Contract Tests

All public API must be validated by contract tests in `tests/contract/api/`:

### configurator-exports.test.ts

Validates:
- LCPlatformAppConfigurator class is exported
- LCPlatformAppVersionConfigurator class is exported
- All methods exist with correct signatures
- Constructor parameters are correct types

### types-exports.test.ts

Validates:
- All domain types are exported (Application, Version, Deployment, value objects)
- Result type is exported
- Error enums are exported with expected values
- Port interfaces are exported

### Example Contract Test

```typescript
import {
  LCPlatformAppConfigurator,
  type Result,
  ConfigurationError
} from '@stainedhead/lc-platform-processing-lib';

describe('LCPlatformAppConfigurator API Contract', () => {
  test('class is exported', () => {
    expect(LCPlatformAppConfigurator).toBeDefined();
    expect(typeof LCPlatformAppConfigurator).toBe('function');
  });

  test('has required methods', () => {
    const methods = [
      'init',
      'read',
      'update',
      'delete',
      'exists',
      'validate',
      'needsUpdate'
    ];

    methods.forEach(method => {
      expect(LCPlatformAppConfigurator.prototype[method]).toBeDefined();
      expect(typeof LCPlatformAppConfigurator.prototype[method]).toBe('function');
    });
  });

  test('methods return Promise<Result>', async () => {
    // Mock implementation test
    const mockStorage = createMockStorage();
    const mockPlatform = createMockPlatform();
    const mockApp = createMockApp();

    const configurator = new LCPlatformAppConfigurator(mockPlatform, mockApp, mockStorage);

    const result = await configurator.init({
      account: 'test',
      team: 'alpha',
      moniker: 'test-app'
    });

    expect(result).toHaveProperty('success');
    if (result.success) {
      expect(result).toHaveProperty('value');
    } else {
      expect(result).toHaveProperty('error');
    }
  });
});
```

---

## Integration with lc-platform-dev-accelerators

This library is imported by `lc-platform-dev-accelerators`:

```typescript
// In lc-platform-dev-accelerators/src/index.ts
export {
  LCPlatformAppConfigurator,
  LCPlatformAppVersionConfigurator,
  type Application,
  type Version,
  type Result,
  ConfigurationError,
  // ... other exports
} from '@stainedhead/lc-platform-processing-lib';
```

**Breaking changes** to this library's public API require coordination with `lc-platform-dev-accelerators` and `lc-platform-dev-cli` repositories.

---

## Version Compatibility

Current version: **v0.2.0** (after this feature implementation)

**Minimum compatible versions**:
- `@stainedhead/lc-platform-dev-accelerators`: TBD (will be set when integration occurs)
- TypeScript: 5.0+
- Bun runtime: 1.0+
