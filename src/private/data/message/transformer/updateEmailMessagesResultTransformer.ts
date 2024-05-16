/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  BatchOperationResult,
  BatchOperationResultStatus,
  UpdatedEmailMessageFailure,
  UpdatedEmailMessageSuccess,
} from '../../../../public'
import { UpdateEmailMessagesStatus } from '../../../domain/entities/message/updateEmailMessagesStatus'
import { UpdateEmailMessagesUseCaseOutput } from '../../../domain/use-cases/message/updateEmailMessagesUseCase'

export class UpdateEmailMessagesResultTransformer {
  fromAPItoGraphQL(
    data: UpdateEmailMessagesUseCaseOutput,
  ): BatchOperationResult<
    UpdatedEmailMessageSuccess,
    UpdatedEmailMessageFailure
  > {
    let status: BatchOperationResultStatus
    switch (data.status) {
      case UpdateEmailMessagesStatus.Failed:
        status = BatchOperationResultStatus.Failure
        break
      case UpdateEmailMessagesStatus.Partial:
        status = BatchOperationResultStatus.Partial
        break
      case UpdateEmailMessagesStatus.Success:
        status = BatchOperationResultStatus.Success
        break
    }
    return {
      status,
      failureValues: data.failureMessages ?? [],
      successValues: data.successMessages ?? [],
    }
  }
}
