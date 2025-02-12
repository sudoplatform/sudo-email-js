/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ListOperationResult,
  ListOperationResultStatus,
  Subset,
} from '@sudoplatform/sudo-common'

export async function readAllPages<T, S extends Subset<S, T> = T>(
  paginator: (nextToken?: string) => Promise<ListOperationResult<T, S>>,
): Promise<ListOperationResult<T, S>> {
  let nextToken: string | undefined = undefined

  const failed: {
    item: Omit<T, keyof S>
    cause: Error
  }[] = []
  const items: T[] = []

  do {
    const result: ListOperationResult<T, S> = await paginator(nextToken)
    if (result.status === ListOperationResultStatus.Failure) {
      return result
    } else if (result.status === ListOperationResultStatus.Partial) {
      failed.push(...result.failed)
      items.push(...result.items)
      nextToken = result.nextToken
    } else {
      items.push(...result.items)
      nextToken = result.nextToken
    }
  } while (nextToken !== undefined)

  if (failed.length > 0) {
    return {
      status: ListOperationResultStatus.Partial,
      failed,
      items,
    }
  } else {
    return {
      status: ListOperationResultStatus.Success,
      items,
    }
  }
}
