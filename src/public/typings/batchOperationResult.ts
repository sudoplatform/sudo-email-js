/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * The Sudo Platform SDK representation of the result from a batch operation.
 *
 * @interface BatchOperationPartialResult<S,F=S>
 * @property {BatchOperationResultStatus} status Status of the batch operation result.
 * @property {S[]} successValues List of the values that were successful.
 * @property {F[]} failureValues List of the values that failed.
 */
export interface BatchOperationResult<S, F=S> {
  status: BatchOperationResultStatus
  successValues?: S[]
  failureValues?: F[]
}

/**
 * Status of the Batch Operation Result.
 */
export enum BatchOperationResultStatus {
  Success,
  Partial,
  Failure,
}
