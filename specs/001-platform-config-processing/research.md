# Research: Platform Configuration Processing Library

**Feature**: 001-platform-config-processing
**Date**: 2025-12-28
**Purpose**: Resolve technical unknowns and research best practices for implementation

## Research Topics

### 1. Integration with lc-platform-dev-accelerators

**Question**: How to properly integrate with LCPlatform, LCPlatformApp, and utility classes from lc-platform-dev-accelerators?

**Decision**: Use dependency injection with port-adapter pattern
- **LCPlatform and LCPlatformApp**: Accept as constructor parameters to configurator classes
- **Utilities (configPersistence, dependencyValidator, idGenerator, nameGenerator, policySerializer)**: Import directly and wrap in adapter layer when they interact with external systems
- **Storage abstraction**: Create IStorageProvider port interface that wraps lc-platform-dev-accelerators storage capabilities
- **Pattern**: Configurators (use-cases) depend on port interfaces; adapters implement ports using lc-platform-dev-accelerators primitives

**Rationale**:
- Maintains Clean Architecture layer boundaries (use-cases don't depend directly on external libraries)
- Enables testability (can provide test doubles for ports in unit tests)
- Allows future flexibility (can swap implementations without changing use-cases)
- Aligns with constitution principle III (Cloud-Agnostic Design) - accelerators provide the cloud abstraction, we provide business logic

**Alternatives considered**:
- Direct usage of accelerators in use-cases: Rejected - violates Clean Architecture (external dependency in inner layer)
- Global singleton pattern: Rejected - makes testing difficult, tight coupling
- Service locator pattern: Rejected - implicit dependencies, harder to reason about

**Implementation notes**:
- Define ports in `src/use-cases/ports.ts`: IStorageProvider, IPolicyProvider, IDeploymentProvider
- Implement adapters in `src/adapters/`: AcceleratorStorageAdapter, AcceleratorPolicyAdapter, AcceleratorDeploymentAdapter
- Wire up dependencies in `src/infrastructure/cli/composition-root.ts` using constructor injection

---

### 2. Result Type Pattern for Error Handling

**Question**: How to handle fallible operations (Init can fail if already exists, Update can fail if not found, Cache can fail on upload, Deploy can fail) in type-safe manner?

**Decision**: Implement Result<T, E> discriminated union type
- **Type definition**:
  ```typescript
  type Result<T, E> =
    | { success: true; value: T }
    | { success: false; error: E }
  ```
- **Error types**: Create domain-specific error enums (ConfigurationError, ValidationError, StorageError, DeploymentError)
- **Usage**: All fallible use case operations return Result<T, E>
- **Pattern matching**: Use discriminated union with `success` field for type-safe error handling

**Rationale**:
- TypeScript-idiomatic approach (no need for external fp libraries like fp-ts)
- Compile-time guarantee that errors are handled (no forgotten try-catch)
- Explicit error types in function signatures (self-documenting)
- Aligns with constitution principle VI (TypeScript Type Safety)

**Alternatives considered**:
- Throwing exceptions: Rejected - not visible in type signatures, easy to forget handling, not functional style
- fp-ts Either monad: Rejected - adds dependency, steeper learning curve for contributors, overkill for simple error handling
- Null/undefined returns: Rejected - loses error information, unclear why operation failed

**Implementation notes**:
- Define Result type in `src/domain/types.ts` (or `src/use-cases/types.ts` if more appropriate)
- Define error enums per layer: domain errors in `src/domain/types.ts`, use-case errors in `src/use-cases/types.ts`
- Example usage:
  ```typescript
  async function initApplication(params: InitParams): Promise<Result<Application, ConfigurationError>> {
    const exists = await storageProvider.exists(path);
    if (exists) {
      return { success: false, error: ConfigurationError.AlreadyExists };
    }
    // ... create application
    return { success: true, value: application };
  }
  ```

---

### 3. Storage Path Generation Strategy

**Question**: How to implement `generateAppConfigBucketName` function from spec (returns `lcp-{account}-{team}-{moniker}/`) in Clean Architecture?

**Decision**: Implement as StoragePath value object in domain layer
- **Location**: `src/domain/value-objects/StoragePath.ts`
- **Responsibilities**:
  - Validate account, team, moniker (no special chars, not empty)
  - Generate bucket name: `lcp-${account}-${team}-${moniker}/`
  - Generate version path: `lcp-${account}-${team}-${moniker}/versions/${version}/`
  - Immutable value object with factory methods
- **Usage**: Application and Version entities contain StoragePath value object

**Rationale**:
- Storage path is a domain concept (not infrastructure detail) - it's part of the business rule that configurations are stored in specific paths
- Value object ensures path validity and consistency
- Centralizes path generation logic (single source of truth)
- Testable in isolation (pure function, no dependencies)

**Alternatives considered**:
- Utility function in infrastructure: Rejected - path generation is domain logic, not infrastructure concern
- String concatenation in use-cases: Rejected - duplicated logic, error-prone, no validation
- Adapter-level path generation: Rejected - domain rule (path format) leaks to adapter layer

**Implementation notes**:
```typescript
// src/domain/value-objects/StoragePath.ts
export class StoragePath {
  private constructor(
    private readonly account: string,
    private readonly team: string,
    private readonly moniker: string,
    private readonly version?: string
  ) {}

  static forApplication(account: string, team: string, moniker: string): Result<StoragePath, ValidationError> {
    // Validate params (no special chars, not empty)
    return { success: true, value: new StoragePath(account, team, moniker) };
  }

  static forVersion(account: string, team: string, moniker: string, version: string): Result<StoragePath, ValidationError> {
    return { success: true, value: new StoragePath(account, team, moniker, version) };
  }

  get bucketName(): string {
    return `lcp-${this.account}-${this.team}-${this.moniker}/`;
  }

  get versionPath(): string {
    if (!this.version) throw new Error('Version not set');
    return `${this.bucketName}versions/${this.version}/`;
  }
}
```

---

### 4. Configurator Class Design (Use Case vs Public API)

**Question**: Should LCPlatformAppConfigurator and LCPlatformAppVersionConfigurator be in use-cases layer or exported as public API?

**Decision**: Configurators are use-case orchestrators AND public API
- **Location**:
  - Use case logic: `src/use-cases/applications/ApplicationConfigurator.ts` and `src/use-cases/versions/VersionConfigurator.ts`
  - Public exports: Re-export from `src/index.ts` as `LCPlatformAppConfigurator` and `LCPlatformAppVersionConfigurator` (aliases)
- **Responsibilities**:
  - Orchestrate individual use cases (Init, Update, Delete, Read, Validate, etc.)
  - Accept dependencies via constructor (LCPlatform, LCPlatformApp, storage/policy/deployment providers)
  - Expose methods matching specification (Init(), Update(), Delete(), Read(), Exists(), NeedsUpdate(), Validate(), etc.)
- **Naming**: Internal names (ApplicationConfigurator, VersionConfigurator), aliased to spec names when exported

**Rationale**:
- Configurators orchestrate multiple use cases (e.g., DeployAppVersionAndDependencies calls DeployDependencies then DeployApp)
- They're part of use-cases layer (application business rules) but also the primary public API
- Exporting from src/index.ts maintains encapsulation (consumers don't reach into use-cases/ directly)
- Alias naming allows internal clarity while matching specification naming externally

**Alternatives considered**:
- Separate public API wrapper classes: Rejected - unnecessary indirection, duplicates configurator logic
- Individual use case exports: Rejected - too granular for library consumers, prefer high-level configurator interface
- Configurators as infrastructure: Rejected - they contain business logic, not infrastructure concerns

**Implementation notes**:
```typescript
// src/use-cases/applications/ApplicationConfigurator.ts
export class ApplicationConfigurator {
  constructor(
    private readonly platform: LCPlatform,
    private readonly app: LCPlatformApp,
    private readonly storage: IStorageProvider
  ) {}

  async init(params: InitParams): Promise<Result<Application, ConfigurationError>> {
    // Orchestrates InitApplication use case
  }

  async update(params: UpdateParams): Promise<Result<Application, ConfigurationError>> {
    // Orchestrates UpdateApplication use case
  }
  // ... other methods
}

// src/index.ts
export { ApplicationConfigurator as LCPlatformAppConfigurator } from './use-cases/applications/ApplicationConfigurator';
export { VersionConfigurator as LCPlatformAppVersionConfigurator } from './use-cases/versions/VersionConfigurator';
```

---

### 5. Factory Pattern for Configurator Construction

**Question**: How should consuming applications (CLI, REST APIs, batch jobs) construct configurators with proper dependencies?

**Decision**: Factory pattern with dependency injection
- **Library responsibility**: Provide configurator classes, adapters, and types
- **Consumer responsibility**: Create factory functions that wire up dependencies
- **Pattern**: Consumers import configurators and adapters, construct them with dependencies
- **No composition root in library**: Library doesn't dictate how dependencies are created (that's application-specific)
- **Adapter implementations**: Library provides reference implementations (AcceleratorStorageAdapter, etc.) that consumers can use or replace

**Rationale**:
- Library remains focused on configuration logic, not application wiring
- Consumers (CLI, REST API) have full control over dependency injection approach
- Allows different consumers to use different patterns (factories, DI containers, manual construction)
- Testability: Consumers can provide test doubles by constructing configurators with mock adapters
- Follows Single Responsibility Principle - library does configuration, applications do composition

**Alternatives considered**:
- Library provides composition root: Rejected - couples library to specific DI approach, limits consumer flexibility
- Library provides global singletons: Rejected - makes testing difficult, tight coupling
- Library provides DI container: Rejected - adds complexity, unnecessary dependency

**Implementation notes**:
```typescript
// In consumer application (e.g., lc-platform-dev-cli)
// Factory function in application code, not in library
export function createApplicationConfigurator(config: Config): LCPlatformAppConfigurator {
  const platform = LCPlatform.fromConfig(config);
  const app = platform.getApp(config.appId);
  const storage = new AcceleratorStorageAdapter(platform);
  return new LCPlatformAppConfigurator(platform, app, storage);
}

export function createVersionConfigurator(config: Config): LCPlatformAppVersionConfigurator {
  const platform = LCPlatform.fromConfig(config);
  const app = platform.getApp(config.appId);
  const storage = new AcceleratorStorageAdapter(platform);
  const policy = new AcceleratorPolicyAdapter(platform);
  const deployment = new AcceleratorDeploymentAdapter(platform);
  return new LCPlatformAppVersionConfigurator(platform, app, storage, policy, deployment);
}

// In library: Just export the classes and adapters
// src/index.ts
export { LCPlatformAppConfigurator } from './use-cases/applications/ApplicationConfigurator';
export { LCPlatformAppVersionConfigurator } from './use-cases/versions/VersionConfigurator';
export { AcceleratorStorageAdapter } from './adapters/storage/AcceleratorStorageAdapter';
export { AcceleratorPolicyAdapter } from './adapters/policy/AcceleratorPolicyAdapter';
export { AcceleratorDeploymentAdapter } from './adapters/deployment/AcceleratorDeploymentAdapter';
```

---

### 6. Test Strategy for Clean Architecture Layers

**Question**: What specific testing approach for each layer to maintain architecture boundaries?

**Decision**: Layer-specific test strategies with strict isolation
- **Domain layer tests** (`tests/domain/`):
  - **Pure unit tests**: Zero external dependencies, no mocks, no I/O
  - **Test subjects**: Entity business rules, value object validation, domain services
  - **Example**: Application entity prevents duplicate team+moniker, VersionNumber validates semantic versioning format
  - **Run frequency**: Every change (fast, no I/O)

- **Use case layer tests** (`tests/use-cases/`):
  - **Unit tests with test doubles**: Mock port interfaces (IStorageProvider, IPolicyProvider, IDeploymentProvider)
  - **Test subjects**: Use case workflows, orchestration logic, error handling
  - **Example**: InitApplication use case checks storage.exists(), returns AlreadyExists error if true
  - **Run frequency**: Every change (fast with mocks)

- **Adapter layer tests** (`tests/adapters/`):
  - **Integration tests**: Test adapters against real or realistic implementations
  - **Test subjects**: Port contract compliance, correct translation to lc-platform-dev-accelerators APIs
  - **Example**: AcceleratorStorageAdapter correctly calls LCPlatform storage methods, handles errors
  - **Run frequency**: Before commit (may involve external system or test doubles)

- **Contract layer tests** (`tests/contract/`):
  - **Contract tests**: Verify public API stability (exported classes, methods, types)
  - **Test subjects**: Configurator class exports, method signatures, type exports, breaking change detection
  - **Example**: LCPlatformAppConfigurator class is exported with expected methods (init, read, update, delete, etc.); Result type is exported; error enums match expected values
  - **Run frequency**: Before commit (critical for breaking change detection - consumers depend on stable API)

- **Integration layer tests** (`tests/integration/`):
  - **End-to-end workflow tests**: Multi-component interactions with realistic setup
  - **Test subjects**: User stories P1-P5, cross-layer workflows
  - **Example**: P1 workflow creates application, reads it back, updates it, verifies changes
  - **Run frequency**: Before merge (slow but comprehensive)

**Rationale**:
- Layer isolation ensures tests fail for the right reasons (domain test failure = business logic bug, adapter test failure = integration bug)
- Fast feedback loop (domain/use-case tests run in milliseconds)
- Contract tests catch breaking changes early
- Integration tests validate end-to-end correctness
- Aligns with constitution principle IV (Test-First Development)

**Alternatives considered**:
- All tests as integration tests: Rejected - slow feedback, unclear failure cause, violates layer boundaries
- No adapter tests: Rejected - integration bugs discovered too late
- Mock everything: Rejected - doesn't test real integrations, false confidence

**Implementation notes**:
- Use Bun's built-in test runner: `bun test tests/domain`, `bun test tests/use-cases`, etc.
- Test doubles: Simple object literals implementing port interfaces (no heavy mocking framework needed)
- Contract tests: Verify class exports, method signatures, type exports - ensure public API doesn't break unintentionally
- Integration tests: May need test fixtures or test database (decide per test case)

---

### 7. Resource Tagging and Metadata Management

**Question**: How to apply LCPlatformApp metadata as tags to deployed cloud resources (application hosting, dependencies, IAM policies)?

**Decision**: ResourceTags value object with metadata extraction from LCPlatformApp
- **Location**: `src/domain/value-objects/ResourceTags.ts`
- **Responsibilities**:
  - Extract standard tags from deployment context (account, team, moniker, version, environment, createdBy, createdAt, managedBy)
  - Extract custom tags from LCPlatformApp metadata properties
  - Merge standard + custom tags with collision detection
  - Provide immutable tag collection for deployment operations
  - Validate tag keys/values for cloud provider compatibility
- **Usage**: Deployment entity contains ResourceTags, passed to IDeploymentProvider for resource tagging
- **Standard tags**: `{ account, team, moniker, version?, environment?, createdBy, createdAt, managedBy: 'lc-platform' }`
- **Custom tags**: Sourced from `LCPlatformApp.metadata.tags` or similar properties

**Rationale**:
- Tagging is a domain concern (business rule: all deployed resources MUST be tagged for governance)
- ResourceTags value object enforces tagging invariants (required fields, format validation)
- Centralizes tag composition logic (single source of truth for tag structure)
- Enables resource management and cost tracking via consistent tagging
- Testable in isolation (pure function, no cloud dependencies)

**Alternatives considered**:
- Tagging in infrastructure layer: Rejected - business rule (must tag all resources) belongs in domain
- Adapter-level tagging: Rejected - duplicates tag logic across adapters, inconsistent tagging
- Pass raw LCPlatformApp to deployment providers: Rejected - leaks external dependency into adapters, violates encapsulation

**Implementation notes**:
```typescript
// src/domain/value-objects/ResourceTags.ts
export class ResourceTags {
  private constructor(
    private readonly standard: StandardTags,
    private readonly custom: Record<string, string>
  ) {}

  static fromDeploymentContext(
    app: LCPlatformApp,
    version: VersionNumber,
    environment: string,
    createdBy: string
  ): Result<ResourceTags, ValidationError> {
    // Extract standard tags
    const standard: StandardTags = {
      account: app.account,
      team: app.team,
      moniker: app.moniker,
      version: version.toString(),
      environment,
      createdBy,
      createdAt: new Date().toISOString(),
      managedBy: 'lc-platform'
    };

    // Extract custom tags from LCPlatformApp metadata
    const custom = app.metadata?.tags || {};

    // Validate no collision between standard and custom tags
    const collision = Object.keys(custom).find(key => key in standard);
    if (collision) {
      return { success: false, error: ValidationError.TagCollision };
    }

    return { success: true, value: new ResourceTags(standard, custom) };
  }

  get all(): Record<string, string> {
    return { ...this.standard, ...this.custom };
  }

  get standardTags(): StandardTags {
    return { ...this.standard };
  }

  get customTags(): Record<string, string> {
    return { ...this.custom };
  }
}

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

**Deployment Provider Integration**:
- IDeploymentProvider port interface accepts ResourceTags parameter
- Adapter implementations (AcceleratorDeploymentAdapter) translate ResourceTags to cloud-specific tag format
- Example:
  ```typescript
  interface IDeploymentProvider {
    async deployApplication(
      artifact: ArtifactReference,
      policy: PolicyDocument,
      tags: ResourceTags  // NEW: Tags to apply
    ): Promise<Result<DeploymentResult, DeploymentError>>;

    async deployDependency(
      dependency: DependencyConfiguration,
      tags: ResourceTags  // NEW: Tags to apply
    ): Promise<Result<DeploymentResult, DeploymentError>>;
  }
  ```

**Cloud Provider Mapping** (in adapters, not domain):
- AWS: Tags applied via `Tags` parameter in CloudFormation/CDK stacks
- Azure: Tags applied via `tags` parameter in ARM templates/Bicep
- GCP: Labels applied via `labels` parameter in Deployment Manager

**Tag Validation Rules**:
- Keys: Alphanumeric + hyphens/underscores only, max 128 characters
- Values: Alphanumeric + hyphens/underscores/spaces, max 256 characters
- Case-sensitive (preserve user's casing)
- No duplicate keys (standard tags take precedence over custom in case of collision)

---

## Summary

**Key Decisions**:
1. Port-adapter pattern for lc-platform-dev-accelerators integration
2. Result<T, E> type for error handling
3. StoragePath value object for path generation
4. Configurators as use-case orchestrators exported as public API
5. Factory pattern for configurator construction (consumers create factories, library provides classes)
6. Layer-specific test strategies (pure unit → test doubles → public API contract → integration)
7. ResourceTags value object for metadata extraction and cloud resource tagging

**No Further Research Required**: All technical unknowns resolved. Ready to proceed to Phase 2 (tasks.md generation via /speckit.tasks).
