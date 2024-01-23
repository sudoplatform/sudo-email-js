/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

export async function delay(ms: number): Promise<number> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
