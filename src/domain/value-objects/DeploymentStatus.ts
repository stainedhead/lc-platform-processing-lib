/**
 * DeploymentStatus Value Object
 * Discriminated union for deployment states
 */

import { Result, ValidationError } from '../types';

export type DeploymentStatusType = 'pending' | 'in-progress' | 'completed' | 'failed';

export class DeploymentStatus {
  private constructor(public readonly status: DeploymentStatusType) {}

  static create(status: DeploymentStatusType): Result<DeploymentStatus, ValidationError> {
    if (!status || status.length === 0) {
      return { success: false, error: ValidationError.MissingRequired };
    }

    const validStatuses: DeploymentStatusType[] = ['pending', 'in-progress', 'completed', 'failed'];
    if (!validStatuses.includes(status)) {
      return { success: false, error: ValidationError.InvalidValue };
    }

    return { success: true, value: new DeploymentStatus(status) };
  }

  isPending(): boolean {
    return this.status === 'pending';
  }

  isInProgress(): boolean {
    return this.status === 'in-progress';
  }

  isCompleted(): boolean {
    return this.status === 'completed';
  }

  isFailed(): boolean {
    return this.status === 'failed';
  }

  isTerminal(): boolean {
    return this.isCompleted() || this.isFailed();
  }

  toString(): string {
    return this.status;
  }

  equals(other: DeploymentStatus): boolean {
    return this.status === other.status;
  }
}
