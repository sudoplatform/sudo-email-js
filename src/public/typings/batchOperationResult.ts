/*
 * Copyright © 2023 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * The Sudo Platform SDK representation of the success or failure result from a batch operation.
 *
 * @interface BatchOperationSuccessOrFailureResult
 * @property {BatchOperationResultStatus} status Status of the batch operation result.
 */
export interface BatchOperationSuccessOrFailureResult {
  status:
    | BatchOperationResultStatus.Success
    | BatchOperationResultStatus.Failure
}

/**
 * The Sudo Platform SDK representation of the partial result from a batch operation.
 *
 * @interface BatchOperationPartialResult
 * @property {BatchOperationResultStatus} status Status of the batch operation result.
 * @property {T[]} successValues List of the values that were successful.
 * @property {T[]} failureValues List of the values that failed.
 */
export interface BatchOperationPartialResult<T> {
  status: BatchOperationResultStatus.Partial
  successValues: T[]
  failureValues: T[]
}

/**
 * Status of the Batch Operation Result.
 */
export enum BatchOperationResultStatus {
  Success,
  Partial,
  Failure,
}

/**
 * Result of a Batch Operation.
 */
export type BatchOperationResult<T> =
  | BatchOperationSuccessOrFailureResult
  | BatchOperationPartialResult<T>
