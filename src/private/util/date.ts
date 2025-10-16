/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

export function secondsSinceEpoch(date: Date): number {
  return Math.floor(date.getTime() / 1000)
}

export function dateFromEpochSeconds(epochSeconds: number): Date {
  return new Date(epochSeconds * 1000)
}
