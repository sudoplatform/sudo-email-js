/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Wrapper to conditionally instantiate and run tests only if a particular
 * condition is met.
 *
 * Typically invoked as:
 *
 * runTestsIf(
 *   'suite name',
 *   () => someCondition,
 *   () => describe('suite name', () => {
 *     tests
 *   })
 * )
 *
 * This is preferable to defining aliases to describe or describe.skip as the
 * eslint-plugin-jest does not recognize the aliased function names.
 *
 * @param name
 * @param condition
 * @param f
 */
export function runTestsIf(
  name: string,
  condition: () => boolean,
  f: () => void,
): void {
  if (condition()) {
    f()
  } else {
    it.skip(`${name}: test conditions not met`, () => {
      // Empty
    })
  }
}
