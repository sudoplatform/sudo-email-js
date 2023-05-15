/*
 * Copyright © 2023 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import * as t from 'io-ts'

export function withDefault<T extends t.Any>(
  type: T,
  defaultValue: t.TypeOf<T>,
): t.Type<t.TypeOf<T>> {
  return new t.Type<t.TypeOf<T>>(
    type.name,
    type.is,
    (v, c) =>
      v !== null && v !== undefined
        ? type.validate(v, c)
        : t.success(defaultValue),
    type.encode,
  )
}
