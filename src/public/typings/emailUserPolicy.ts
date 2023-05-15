/*
 * Copyright © 2023 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

export enum TimePeriod {
  DAY,
  HOUR,
  MINUTE,
  SECOND,
}

export interface EmailUserPolicy {
  maxSendPeriod: TimePeriod
  maxSendMessages: number
  maxRecipientPerMessage: number
}
