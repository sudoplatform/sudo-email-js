/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * @param input The array you want to divide
 * @param chunkSize The max number of items you want in each resulting array
 * @returns An array of arrays where each subarray has at most `chunkSize` items
 */
export const divideArray = (
  input: Array<any>,
  chunkSize: number,
): Array<Array<any>> => {
  if (chunkSize === 0) {
    // Otherwise we get an infinite loop! :D
    return [input]
  }
  const results: Array<Array<any>> = []
  for (let i = 0; i < input.length; i += chunkSize) {
    const chunk = input.slice(i, i + chunkSize)
    results.push(chunk)
  }
  return results
}
