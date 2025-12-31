# LC Platform Processing Library - Technical Details

## Table of Contents

1. [Clean Architecture Implementation](#clean-architecture-implementation)
2. [Domain-Driven Design Patterns](#domain-driven-design-patterns)
3. [Type System and Error Handling](#type-system-and-error-handling)
4. [State Machines](#state-machines)
5. [Testing Strategy](#testing-strategy)
6. [Design Decisions](#design-decisions)
7. [Code Organization](#code-organization)
8. [Performance Considerations](#performance-considerations)

---

## Clean Architecture Implementation

### Architecture Overview

The library strictly follows **Clean Architecture** principles with four distinct layers:

```
┌─────────────────────────────────────────┐
│        Infrastructure Layer             │  ← External concerns (CLI, config)
├─────────────────────────────────────────┤
│          Adapters Layer                 │  ← Interface implementations
├─────────────────────────────────────────┤
│         Use Cases Layer                 │  ← Application workflows
├─────────────────────────────────────────┤
│          Domain Layer                   │  ← Pure business logic
└─────────────────────────────────────────┘
```

### Layer Dependency Rule

**Critical Constraint**: Dependencies point inward only.

- **Domain** → **NOTHING** (pure business logic, zero external dependencies)
- **Use Cases** → **Domain** only
- **Adapters** → **Domain** + **Use Cases** only
- **Infrastructure** → All layers (composition root)

### Domain Layer (src/domain/)

**Purpose**: Encapsulate business rules independent of external frameworks, databases, or UI.

**Contents**:
- **Entities**: Aggregates with identity and lifecycle (`Application`, `Version`, `Deployment`)
- **Value Objects**: Immutable objects defined by their attributes (`AppId`, `VersionNumber`, `DeploymentStatus`)
- **Domain Types**: Pure TypeScript types with no external dependencies

**Example - Entity Implementation**:

```typescript
// src/domain/entities/Application.ts
export class Application {
  private constructor(
    private readonly id: AppId,
    private metadata: ApplicationMetadata,
    private readonly createdAt: Date,
    private updatedAt: Date
  ) {}

  // Factory method (enforces invariants)
  static create(metadata: ApplicationMetadata): Application {
    return new Application(
      AppId.create(),
      metadata,
      new Date(),
      new Date()
    );
  }

  // Business rule: Update modifies timestamp
  update(metadata: ApplicationMetadata): void {
    this.metadata = metadata;
    this.updatedAt = new Date();
  }

  // Getters expose read-only state
  getId(): AppId { return this.id; }
  getMetadata(): ApplicationMetadata { return this.metadata; }
}
```

**Key Characteristics**:
- Private constructors force use of factory methods
- Business rules enforced at entity level (e.g., timestamp updates)
- No external dependencies (no imports from use-cases, adapters, or infrastructure)
- Immutability for value objects, controlled mutability for entities

**Example - Value Object Implementation**:

```typescript
// src/domain/value-objects/VersionNumber.ts
export class VersionNumber {
  private constructor(
    private readonly major: number,
    private readonly minor: number,
    private readonly patch: number,
    private readonly raw: string
  ) {}

  static create(version: string): Result<VersionNumber, DomainError> {
    const parsed = this.parse(version);
    if (!parsed.success) {
      return parsed;
    }

    const { major, minor, patch } = parsed.value;
    return {
      success: true,
      value: new VersionNumber(major, minor, patch, version)
    };
  }

  // Business rule: 0.x.x versions are incompatible with each other
  isCompatibleWith(other: VersionNumber): boolean {
    if (this.major === 0 || other.major === 0) {
      return this.raw === other.raw; // Exact match required
    }
    return this.major === other.major; // Major version match
  }
}
```

### Use Cases Layer (src/use-cases/)

**Purpose**: Orchestrate domain operations to implement application workflows.

**Contents**:
- **Use Case Classes**: One per business operation (`InitApplication`, `DeployApplication`)
- **Port Interfaces**: Abstractions for external dependencies (`IStorageProvider`, `IPolicyProvider`)
- **DTOs**: Data Transfer Objects for input/output (`ApplicationIdentifier`, `DeploymentResult`)

**Example - Use Case Implementation**:

```typescript
// src/use-cases/applications/InitApplication.ts
export class InitApplication {
  constructor(private readonly storage: IStorageProvider) {}

  async execute(input: ApplicationIdentifier): Promise<Result<Application, ConfigurationError>> {
    // 1. Create domain entity (business rules enforced)
    const application = Application.create(input.metadata);

    // 2. Generate storage path (domain logic)
    const path = StoragePath.forApplication(
      input.account,
      input.team,
      input.moniker
    );

    // 3. Persist via port (infrastructure concern)
    const saveResult = await this.storage.write(
      path.toString(),
      application.toJSON()
    );

    if (!saveResult.success) {
      return { success: false, error: ConfigurationError.WriteFailed };
    }

    return { success: true, value: application };
  }
}
```

**Key Characteristics**:
- Single Responsibility Principle: One use case per business operation
- Dependency Inversion: Depends on port interfaces, not concrete implementations
- Pure orchestration: No business rules (delegated to domain layer)
- Error type mapping: Infrastructure errors → Domain/Configuration errors

### Adapters Layer (src/adapters/)

**Purpose**: Implement port interfaces to connect use cases to external systems.

**Contents**:
- **Storage Adapters**: Implement `IStorageProvider` (AcceleratorStorageAdapter)
- **Policy Adapters**: Implement `IPolicyProvider` (AcceleratorPolicyAdapter)
- **Deployment Adapters**: Implement `IDeploymentProvider` (AcceleratorDeploymentAdapter)

**Example - Adapter Implementation**:

```typescript
// src/adapters/storage/AcceleratorStorageAdapter.ts
export class AcceleratorStorageAdapter implements IStorageProvider {
  private inMemoryStorage = new Map<string, unknown>();

  async write<T>(path: string, data: T): Promise<Result<void, StorageError>> {
    this.inMemoryStorage.set(path, data);
    return { success: true, value: undefined };
  }

  async read<T>(path: string): Promise<Result<T, StorageError>> {
    const data = this.inMemoryStorage.get(path) as T;
    if (!data) {
      return { success: false, error: StorageError.NotFound };
    }
    return { success: true, value: data };
  }
}
```

**Key Characteristics**:
- Implements port interfaces from use-cases layer
- Can depend on external libraries (AWS SDK, Azure SDK, etc.)
- Reference implementations for testing and prototyping
- Production implementations would connect to real infrastructure

### Infrastructure Layer (src/infrastructure/)

**Purpose**: Entry points and composition root for the application.

**Contents**:
- **CLI Commands**: User-facing commands (`init`, `deploy`)
- **Configuration**: Environment-specific settings
- **Dependency Injection**: Wire up concrete implementations

**Example - Composition Root**:

```typescript
// src/infrastructure/cli/commands/init.ts
export async function initCommand(args: InitArgs) {
  // Composition root: Assemble dependencies
  const storage = new AcceleratorStorageAdapter();
  const policy = new AcceleratorPolicyAdapter();
  const deployment = new AcceleratorDeploymentAdapter();

  // Create configurators (high-level API)
  const appConfig = new LCPlatformAppConfigurator(storage);
  const versionConfig = new LCPlatformAppVersionConfigurator(
    storage,
    policy,
    deployment
  );

  // Execute business operation
  const result = await appConfig.init(args);

  // Present results to user
  if (!result.success) {
    console.error(`Error: ${result.error}`);
    process.exit(1);
  }

  console.log(`Application created: ${result.value.getId()}`);
}
```

---

## Domain-Driven Design Patterns

### Aggregates

**Pattern**: Group related entities and value objects into consistency boundaries.

**Implementation**:
- **Application Aggregate**: Root entity with AppId, metadata, timestamps
- **Version Aggregate**: Root entity with dependencies, artifact paths, policy
- **Deployment Aggregate**: Root entity with status state machine, resource tags

**Example**:

```typescript
// Application is the aggregate root
export class Application {
  // Private state (encapsulation)
  private constructor(
    private readonly id: AppId,           // Value object
    private metadata: ApplicationMetadata, // DTO
    private readonly createdAt: Date,
    private updatedAt: Date
  ) {}

  // Business operations modify aggregate state
  update(metadata: ApplicationMetadata): void {
    this.metadata = metadata;
    this.updatedAt = new Date(); // Invariant: update timestamp
  }

  // Serialize for persistence
  toJSON(): ApplicationData {
    return {
      id: this.id.toString(),
      metadata: this.metadata,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }
}
```

### Value Objects

**Pattern**: Immutable objects defined by their attributes, not identity.

**Characteristics**:
- Immutable (no setters)
- Equality by value, not reference
- Self-validating (factory methods enforce invariants)
- No identity (two instances with same values are equivalent)

**Examples**:

1. **AppId** - UUID-based unique identifier
2. **TeamMoniker** - Validated team name (lowercase alphanumeric + hyphens)
3. **VersionNumber** - Semantic version with compatibility rules
4. **DeploymentStatus** - State machine with terminal state enforcement
5. **StoragePath** - Cloud-agnostic path generation
6. **ResourceTags** - Tag extraction and collision detection

**Example - TeamMoniker**:

```typescript
export class TeamMoniker {
  private constructor(private readonly value: string) {}

  static create(value: string): Result<TeamMoniker, DomainError> {
    // Validation (business rule)
    if (!/^[a-z0-9-]+$/.test(value)) {
      return {
        success: false,
        error: DomainError.InvalidFormat
      };
    }

    return {
      success: true,
      value: new TeamMoniker(value)
    };
  }

  toString(): string {
    return this.value;
  }

  // Equality by value
  equals(other: TeamMoniker): boolean {
    return this.value === other.value;
  }
}
```

### Repositories (Port Pattern)

**Pattern**: Abstract persistence concerns behind interfaces.

**Implementation**: Port interfaces in use-cases layer define contracts.

```typescript
// src/use-cases/ports.ts
export interface IStorageProvider {
  write<T>(path: string, data: T): Promise<Result<void, StorageError>>;
  read<T>(path: string): Promise<Result<T, StorageError>>;
  delete(path: string): Promise<Result<void, StorageError>>;
  exists(path: string): Promise<Result<boolean, StorageError>>;
}
```

**Benefits**:
- Domain and use cases independent of storage implementation
- Easy to swap implementations (in-memory → S3 → Azure Blob)
- Testability via mock implementations

### Domain Events (Future Enhancement)

**Pattern**: Decouple side effects from business operations.

**Planned Implementation**:
- Event emitter in domain entities
- Event handlers in infrastructure layer
- Examples: ApplicationCreated, VersionDeployed, DeploymentFailed

---

## Type System and Error Handling

### Result<T, E> Pattern

**Purpose**: Type-safe error handling without exceptions.

**Implementation**:

```typescript
// Success case
type Success<T> = {
  success: true;
  value: T;
};

// Failure case
type Failure<E> = {
  success: false;
  error: E;
};

// Discriminated union
type Result<T, E> = Success<T> | Failure<E>;
```

**Benefits**:
- **Type Safety**: Compiler enforces error handling
- **Explicit**: Errors are part of the function signature
- **Composable**: Results can be chained with map/flatMap
- **No Exceptions**: Predictable control flow

**Usage Example**:

```typescript
async function deployApplication(
  input: DeploymentInput
): Promise<Result<DeploymentResult, ConfigurationError>> {
  // Read version
  const versionResult = await readVersion.execute(input);
  if (!versionResult.success) {
    // Error type narrowing (TypeScript discriminated union)
    return { success: false, error: versionResult.error };
  }

  // Type narrowing: TypeScript knows versionResult.value exists
  const version = versionResult.value;

  // Deploy dependencies
  const depsResult = await deployDeps.execute({ version });
  if (!depsResult.success) {
    return { success: false, error: ConfigurationError.DeploymentFailed };
  }

  // Success path
  return { success: true, value: depsResult.value };
}
```

### Error Type Hierarchy

**Domain Errors** (`src/domain/types.ts`):
```typescript
export enum DomainError {
  InvalidFormat = 'DOMAIN_INVALID_FORMAT',
  ValidationFailed = 'DOMAIN_VALIDATION_FAILED',
  InvalidState = 'DOMAIN_INVALID_STATE',
}
```

**Configuration Errors** (`src/use-cases/types.ts`):
```typescript
export enum ConfigurationError {
  NotFound = 'CONFIG_NOT_FOUND',
  AlreadyExists = 'CONFIG_ALREADY_EXISTS',
  ValidationFailed = 'CONFIG_VALIDATION_FAILED',
  WriteFailed = 'CONFIG_WRITE_FAILED',
  ReadFailed = 'CONFIG_READ_FAILED',
  DeploymentFailed = 'CONFIG_DEPLOYMENT_FAILED',
}
```

**Storage Errors** (`src/use-cases/ports.ts`):
```typescript
export enum StorageError {
  NotFound = 'STORAGE_NOT_FOUND',
  ReadFailed = 'STORAGE_READ_FAILED',
  WriteFailed = 'STORAGE_WRITE_FAILED',
  DeleteFailed = 'STORAGE_DELETE_FAILED',
}
```

**Error Mapping Strategy**:
- Infrastructure errors (StorageError) → Use case errors (ConfigurationError)
- Domain errors (DomainError) → Use case errors (ConfigurationError)
- Clear error boundaries at each layer

### TypeScript Strict Mode

**Configuration** (`tsconfig.json`):
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true
  }
}
```

**Benefits**:
- Catch errors at compile time
- Prevent null/undefined runtime errors
- Enforce type annotations
- Better IDE autocomplete

---

## State Machines

### DeploymentStatus State Machine

**Purpose**: Model deployment lifecycle with terminal state enforcement.

**States**:
```typescript
type DeploymentStatusType = 'pending' | 'in-progress' | 'completed' | 'failed';
```

**State Transitions**:
```
pending ──────────► in-progress ──────────► completed (terminal)
                         │
                         └──────────► failed (terminal)
```

**Implementation**:

```typescript
// src/domain/value-objects/DeploymentStatus.ts
export class DeploymentStatus {
  private constructor(private readonly status: DeploymentStatusType) {}

  static create(status: DeploymentStatusType): Result<DeploymentStatus, DomainError> {
    const validStatuses: DeploymentStatusType[] = [
      'pending',
      'in-progress',
      'completed',
      'failed'
    ];

    if (!validStatuses.includes(status)) {
      return { success: false, error: DomainError.InvalidState };
    }

    return { success: true, value: new DeploymentStatus(status) };
  }

  // Business rule: Terminal states cannot transition
  canTransitionTo(newStatus: DeploymentStatusType): boolean {
    if (this.isTerminal()) {
      return false; // Terminal states cannot transition
    }

    const validTransitions: Record<DeploymentStatusType, DeploymentStatusType[]> = {
      pending: ['in-progress'],
      'in-progress': ['completed', 'failed'],
      completed: [], // Terminal
      failed: [],    // Terminal
    };

    return validTransitions[this.status].includes(newStatus);
  }

  isTerminal(): boolean {
    return this.status === 'completed' || this.status === 'failed';
  }

  toString(): DeploymentStatusType {
    return this.status;
  }
}
```

**Usage in Deployment Entity**:

```typescript
// src/domain/entities/Deployment.ts
export class Deployment {
  private constructor(
    private readonly id: string,
    private status: DeploymentStatus,
    private readonly startedAt: Date,
    private completedAt?: Date
  ) {}

  // Business rule enforced: No transitions from terminal states
  updateStatus(newStatus: DeploymentStatusType): Result<void, DomainError> {
    const newStatusResult = DeploymentStatus.create(newStatus);
    if (!newStatusResult.success) {
      return newStatusResult;
    }

    const newStatusObj = newStatusResult.value;

    if (!this.status.canTransitionTo(newStatus)) {
      return { success: false, error: DomainError.InvalidState };
    }

    this.status = newStatusObj;

    if (newStatusObj.isTerminal()) {
      this.completedAt = new Date();
    }

    return { success: true, value: undefined };
  }
}
```

**Tests** (`tests/domain/value-objects/DeploymentStatus.test.ts`):
```typescript
describe('DeploymentStatus State Transitions', () => {
  it('should allow pending → in-progress', () => {
    const pending = DeploymentStatus.create('pending').value!;
    expect(pending.canTransitionTo('in-progress')).toBe(true);
  });

  it('should prevent transitions from terminal states', () => {
    const completed = DeploymentStatus.create('completed').value!;
    expect(completed.canTransitionTo('pending')).toBe(false);
    expect(completed.canTransitionTo('in-progress')).toBe(false);
  });

  it('should prevent invalid transitions', () => {
    const pending = DeploymentStatus.create('pending').value!;
    expect(pending.canTransitionTo('completed')).toBe(false); // Must go through in-progress
  });
});
```

---

## Testing Strategy

### Test-Driven Development (TDD)

**Process**: Red → Green → Refactor

1. **Red**: Write failing test
2. **Green**: Write minimal code to pass
3. **Refactor**: Improve code quality while maintaining green tests

**Example TDD Cycle**:

```typescript
// Step 1: Red - Write failing test
describe('VersionNumber', () => {
  it('should parse valid semantic version', () => {
    const result = VersionNumber.create('1.2.3');
    expect(result.success).toBe(true);
    expect(result.value!.toString()).toBe('1.2.3');
  });
});

// Run: FAIL (VersionNumber.create doesn't exist)

// Step 2: Green - Minimal implementation
export class VersionNumber {
  static create(version: string): Result<VersionNumber, DomainError> {
    return { success: true, value: new VersionNumber(version) };
  }
}

// Run: PASS

// Step 3: Refactor - Add validation
export class VersionNumber {
  static create(version: string): Result<VersionNumber, DomainError> {
    const parsed = this.parse(version);
    if (!parsed.success) {
      return { success: false, error: DomainError.InvalidFormat };
    }
    return { success: true, value: new VersionNumber(version) };
  }

  private static parse(version: string): Result<ParsedVersion, DomainError> {
    const regex = /^(\d+)\.(\d+)\.(\d+)$/;
    const match = version.match(regex);
    if (!match) {
      return { success: false, error: DomainError.InvalidFormat };
    }
    return {
      success: true,
      value: {
        major: parseInt(match[1]),
        minor: parseInt(match[2]),
        patch: parseInt(match[3]),
      }
    };
  }
}

// Run: PASS (still green after refactoring)
```

### Test Organization

**Layer-Specific Test Suites**:

```
tests/
├── domain/              # Pure unit tests (44 tests)
│   ├── entities/
│   │   ├── Application.test.ts
│   │   ├── Version.test.ts
│   │   └── Deployment.test.ts
│   └── value-objects/
│       ├── AppId.test.ts
│       ├── VersionNumber.test.ts
│       ├── DeploymentStatus.test.ts
│       └── ResourceTags.test.ts
│
├── use-cases/           # Use case tests (89 tests)
│   ├── applications/
│   │   ├── InitApplication.test.ts
│   │   ├── ReadApplication.test.ts
│   │   ├── UpdateApplication.test.ts
│   │   └── DeleteApplication.test.ts
│   ├── versions/
│   │   ├── InitVersion.test.ts
│   │   ├── CacheArtifact.test.ts
│   │   └── GenerateAppPolicy.test.ts
│   └── deployments/
│       ├── DeployDependencies.test.ts
│       └── DeployApplication.test.ts
│
├── integration/         # Multi-component tests (6 tests)
│   ├── application-lifecycle.test.ts
│   ├── version-lifecycle.test.ts
│   └── deployment-workflow.test.ts
│
└── contract/            # API boundary tests (40 tests)
    ├── ApplicationConfigurator.test.ts
    └── VersionConfigurator.test.ts
```

### Test Categories

**1. Domain Tests (Pure Unit Tests)**
- Test domain entities and value objects in isolation
- Zero external dependencies
- Fast execution (< 1ms per test)
- High coverage (100% for critical business rules)

**Example**:
```typescript
// tests/domain/value-objects/VersionNumber.test.ts
describe('VersionNumber', () => {
  describe('Compatibility Rules', () => {
    it('should treat 0.x.x versions as incompatible', () => {
      const v1 = VersionNumber.create('0.1.0').value!;
      const v2 = VersionNumber.create('0.2.0').value!;
      expect(v1.isCompatibleWith(v2)).toBe(false);
    });

    it('should allow minor/patch updates for 1.x.x+', () => {
      const v1 = VersionNumber.create('1.0.0').value!;
      const v2 = VersionNumber.create('1.5.3').value!;
      expect(v1.isCompatibleWith(v2)).toBe(true);
    });
  });
});
```

**2. Use Case Tests (Integration with Test Doubles)**
- Test use cases with mock adapters
- Verify orchestration logic
- Error handling paths
- Boundary conditions

**Example**:
```typescript
// tests/use-cases/applications/InitApplication.test.ts
describe('InitApplication', () => {
  let storage: AcceleratorStorageAdapter;
  let useCase: InitApplication;

  beforeEach(() => {
    storage = new AcceleratorStorageAdapter();
    useCase = new InitApplication(storage);
  });

  it('should create and persist application', async () => {
    const input: ApplicationIdentifier = {
      account: '123456789012',
      team: 'platform',
      moniker: 'my-app',
      metadata: { description: 'Test app' }
    };

    const result = await useCase.execute(input);

    expect(result.success).toBe(true);
    expect(result.value!.getMetadata()).toEqual(input.metadata);

    // Verify persistence
    const path = StoragePath.forApplication(
      input.account,
      input.team,
      input.moniker
    );
    const readResult = await storage.read(path.toString());
    expect(readResult.success).toBe(true);
  });
});
```

**3. Integration Tests (Multi-Component)**
- Test complete workflows across layers
- Real adapter implementations (in-memory)
- End-to-end scenarios
- Rollback behavior

**Example**:
```typescript
// tests/integration/deployment-workflow.test.ts
describe('Complete Deployment Workflow', () => {
  it('should deploy application with dependencies and rollback on failure', async () => {
    const storage = new AcceleratorStorageAdapter();
    const policy = new AcceleratorPolicyAdapter();
    const deployment = new FailingDeploymentAdapter(); // Simulates failure

    const versionConfig = new LCPlatformAppVersionConfigurator(
      storage,
      policy,
      deployment
    );

    // Deploy (will fail)
    const deployResult = await versionConfig.deploy({
      account: '123456789012',
      team: 'platform',
      moniker: 'my-app',
      versionNumber: '1.0.0',
      environment: 'staging',
      tags: { env: 'staging' }
    });

    expect(deployResult.success).toBe(false);

    // Verify rollback occurred
    expect(deployment.getRollbackCount()).toBe(1);
  });
});
```

**4. Contract Tests (Public API)**
- Test high-level configurator APIs
- Verify documentation examples work
- Input validation
- Error message clarity

### Test Coverage

**Current Metrics** (v0.2.0):
- **179 total tests**
- **94.06% function coverage**
- **93.23% line coverage**
- **0 failures**

**Coverage Requirements**:
- Domain layer: 95%+ (critical business rules)
- Use cases: 90%+ (application workflows)
- Adapters: 80%+ (infrastructure code)
- Overall: 90%+ maintained

**Coverage Report** (excerpt):
```
Domain Layer:
  entities/Application.ts       100% (12/12 functions)
  entities/Version.ts           100% (10/10 functions)
  entities/Deployment.ts        100% (8/8 functions)
  value-objects/VersionNumber.ts 100% (6/6 functions)
  value-objects/DeploymentStatus.ts 100% (5/5 functions)

Use Cases Layer:
  applications/InitApplication.ts    100% (1/1 function)
  applications/ReadApplication.ts    100% (1/1 function)
  versions/DeployDependencies.ts     92% (11/12 functions)
  versions/DeployApplication.ts      89% (8/9 functions)

Adapters Layer:
  storage/AcceleratorStorageAdapter.ts  83% (5/6 functions)
  policy/AcceleratorPolicyAdapter.ts    75% (3/4 functions)
```

---

## Design Decisions

### Decision 1: Result<T, E> Over Exceptions

**Context**: Need predictable, type-safe error handling.

**Decision**: Use Result<T, E> discriminated union instead of throwing exceptions.

**Rationale**:
- TypeScript compiler enforces error handling (no forgotten catch blocks)
- Errors are explicit in function signatures (better API documentation)
- Composable with functional programming patterns (map, flatMap)
- No hidden control flow (exceptions can be thrown from anywhere)
- Better performance (no stack unwinding)

**Trade-offs**:
- More verbose than try-catch
- Requires discipline (must check `.success` before accessing `.value`)
- Less familiar to developers coming from exception-based languages

**Implementation**:
```typescript
// Instead of:
function riskyOperation(): string {
  if (error) throw new Error('Failed');
  return 'success';
}

// We use:
function riskyOperation(): Result<string, DomainError> {
  if (error) {
    return { success: false, error: DomainError.ValidationFailed };
  }
  return { success: true, value: 'success' };
}
```

### Decision 2: Private Constructors + Factory Methods

**Context**: Need to enforce business invariants at object creation.

**Decision**: Use private constructors with static factory methods returning Result<T, E>.

**Rationale**:
- Validation logic centralized in factory method
- Invalid objects cannot be created (compile-time safety)
- Clear failure modes (return error instead of throwing)
- Consistent pattern across all value objects

**Implementation**:
```typescript
export class TeamMoniker {
  private constructor(private readonly value: string) {}

  static create(value: string): Result<TeamMoniker, DomainError> {
    // Validation
    if (!/^[a-z0-9-]+$/.test(value)) {
      return { success: false, error: DomainError.InvalidFormat };
    }

    // Invariant enforced: Only valid TeamMonikers can exist
    return { success: true, value: new TeamMoniker(value) };
  }
}
```

### Decision 3: Port-Adapter Pattern Over Direct Dependencies

**Context**: Need to keep domain and use cases independent of infrastructure.

**Decision**: Define port interfaces in use-cases layer, implement in adapters layer.

**Rationale**:
- **Dependency Inversion**: High-level modules don't depend on low-level modules
- **Testability**: Easy to swap implementations (mock for tests, real for production)
- **Cloud-Agnostic**: Can switch from AWS → Azure → GCP without changing use cases
- **Clean Boundaries**: Clear separation between business logic and infrastructure

**Implementation**:
```typescript
// use-cases/ports.ts (interface)
export interface IStorageProvider {
  write<T>(path: string, data: T): Promise<Result<void, StorageError>>;
  read<T>(path: string): Promise<Result<T, StorageError>>;
}

// use-cases/applications/InitApplication.ts (consumer)
export class InitApplication {
  constructor(private readonly storage: IStorageProvider) {}
  // Uses interface, doesn't care about implementation
}

// adapters/storage/S3StorageAdapter.ts (implementation)
export class S3StorageAdapter implements IStorageProvider {
  async write<T>(path: string, data: T): Promise<Result<void, StorageError>> {
    // AWS S3 implementation
  }
}

// adapters/storage/AcceleratorStorageAdapter.ts (test implementation)
export class AcceleratorStorageAdapter implements IStorageProvider {
  async write<T>(path: string, data: T): Promise<Result<void, StorageError>> {
    // In-memory implementation for testing
  }
}
```

### Decision 4: Bun Runtime Over Node.js

**Context**: Need fast TypeScript execution and modern tooling.

**Decision**: Use Bun as the JavaScript runtime instead of Node.js.

**Rationale**:
- **Native TypeScript**: No transpilation needed for development
- **Built-in Test Runner**: Fast, zero-config testing with `bun test`
- **Performance**: Faster startup and execution than Node.js
- **Modern Defaults**: ESM modules, top-level await, Web APIs
- **Single Tool**: Package manager + runtime + test runner

**Trade-offs**:
- Less mature ecosystem than Node.js
- Fewer production deployments
- Some npm packages may have compatibility issues

**Migration Path**: Code is standard TypeScript/JavaScript, so migration to Node.js is straightforward if needed.

### Decision 5: Immutable Value Objects

**Context**: Need predictable behavior and avoid accidental mutations.

**Decision**: Make all value objects immutable (no setters, readonly properties).

**Rationale**:
- **Thread Safety**: Immutable objects are inherently thread-safe
- **Predictability**: Object state cannot change after creation
- **Easier Testing**: No need to reset state between tests
- **Better Caching**: Immutable objects can be safely cached

**Implementation**:
```typescript
export class VersionNumber {
  private constructor(
    private readonly major: number, // readonly = immutable
    private readonly minor: number,
    private readonly patch: number,
    private readonly raw: string
  ) {}

  // No setters - once created, values cannot change

  // New instances created for modifications
  incrementPatch(): VersionNumber {
    return new VersionNumber(
      this.major,
      this.minor,
      this.patch + 1,
      `${this.major}.${this.minor}.${this.patch + 1}`
    );
  }
}
```

### Decision 6: Cloud-Agnostic Abstractions

**Context**: Library should work across AWS, Azure, GCP without vendor lock-in.

**Decision**: Use cloud-agnostic abstractions from `@stainedhead/lc-platform-dev-accelerators`.

**Rationale**:
- **Portability**: Applications can move between cloud providers
- **Cost Optimization**: Leverage best pricing across clouds
- **Vendor Independence**: Not locked into single provider
- **Consistency**: Same API across all clouds

**Implementation**:
- Domain and use cases have ZERO cloud-specific code
- Adapters use cloud-agnostic utilities (LCPlatform, configPersistence)
- Cloud-specific implementations isolated in separate packages

---

## Code Organization

### File Naming Conventions

- **Entities**: PascalCase (e.g., `Application.ts`, `Version.ts`)
- **Value Objects**: PascalCase (e.g., `AppId.ts`, `VersionNumber.ts`)
- **Use Cases**: PascalCase (e.g., `InitApplication.ts`, `DeployApplication.ts`)
- **Adapters**: PascalCase with suffix (e.g., `AcceleratorStorageAdapter.ts`)
- **Tests**: Match source file + `.test.ts` suffix (e.g., `Application.test.ts`)
- **Types**: `types.ts` per layer

### Import Organization

**Order**:
1. External libraries (e.g., `import { crypto } from 'node:crypto'`)
2. Domain layer imports
3. Use case layer imports
4. Adapter layer imports
5. Infrastructure layer imports
6. Relative imports within same layer

**Example**:
```typescript
// External
import { crypto } from 'node:crypto';

// Domain
import { Application } from '../../domain/entities/Application';
import { AppId } from '../../domain/value-objects/AppId';
import type { DomainError } from '../../domain/types';

// Use Cases
import type { IStorageProvider } from '../ports';
import type { ConfigurationError, ApplicationIdentifier } from '../types';

// Same layer
import { StoragePath } from './StoragePath';
```

### Directory Structure Rationale

**Layered Structure**:
```
src/
├── domain/          # Innermost layer (no dependencies)
├── use-cases/       # Depends on domain
├── adapters/        # Depends on domain + use-cases
└── infrastructure/  # Depends on all (composition root)
```

**Why This Organization**:
- Clear dependency direction (prevents circular dependencies)
- Easy to enforce architectural constraints with linting rules
- Matches mental model of Clean Architecture
- Scales well as codebase grows

---

## Performance Considerations

### In-Memory Caching

**Strategy**: Reference adapters use in-memory Maps for caching.

```typescript
export class AcceleratorStorageAdapter implements IStorageProvider {
  private inMemoryStorage = new Map<string, unknown>();

  async read<T>(path: string): Promise<Result<T, StorageError>> {
    const data = this.inMemoryStorage.get(path) as T;
    if (!data) {
      return { success: false, error: StorageError.NotFound };
    }
    return { success: true, value: data };
  }
}
```

**Trade-offs**:
- Fast for testing and development
- Not suitable for production (data lost on restart)
- Production adapters should use Redis, DynamoDB, or similar

### Lazy Initialization

**Pattern**: Create expensive objects only when needed.

```typescript
export class VersionConfigurator {
  private policyCache?: Map<string, PolicyDocument>;

  private getPolicyCache(): Map<string, PolicyDocument> {
    if (!this.policyCache) {
      this.policyCache = new Map(); // Created on first access
    }
    return this.policyCache;
  }
}
```

### Async/Await Optimization

**Pattern**: Execute independent operations in parallel.

```typescript
// Sequential (slow)
const app = await readApplication.execute(input);
const version = await readVersion.execute(input);
const deployment = await readDeployment.execute(input);

// Parallel (fast)
const [app, version, deployment] = await Promise.all([
  readApplication.execute(input),
  readVersion.execute(input),
  readDeployment.execute(input),
]);
```

### Memory Management

**Guidelines**:
- Use `readonly` to prevent accidental modifications
- Prefer value objects over primitive obsession
- Clean up event listeners in infrastructure layer
- Avoid global mutable state

---

## Future Enhancements

### Planned Improvements

1. **Domain Events**
   - Event emitters in domain entities
   - Event handlers for side effects
   - Example: Send notification on DeploymentFailed

2. **Advanced Caching**
   - Redis adapter for distributed caching
   - Cache invalidation strategies
   - TTL-based expiration

3. **Batch Operations**
   - Deploy multiple applications in parallel
   - Bulk configuration updates
   - Transaction support

4. **Observability**
   - Structured logging with correlation IDs
   - Metrics collection (deployment duration, success rate)
   - Distributed tracing

5. **Production Adapters**
   - AWS adapter (S3, DynamoDB, IAM, CloudFormation)
   - Azure adapter (Blob Storage, Cosmos DB, ARM)
   - GCP adapter (Cloud Storage, Firestore, Deployment Manager)

---

## References

- **Clean Architecture** by Robert C. Martin
- **Domain-Driven Design** by Eric Evans
- **TypeScript Handbook**: https://www.typescriptlang.org/docs/
- **Functional Error Handling**: https://fsharpforfunandprofit.com/posts/recipe-part2/
- **Bun Documentation**: https://bun.sh/docs

---

**Last Updated**: 2025-12-28 (v0.2.0)
