/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { EmailAliasFilterTransformer } from '../../../../../../src/private/data/alias/transformer/emailAliasFilterTransformer'
import {
  EmailMaskRealAddressType as EmailMaskRealAddressTypeGraphQL,
  EmailMaskStatus as EmailMaskStatusGraphQL,
} from '../../../../../../src/gen/graphqlTypes'
import {
  EmailAliasEntityRealAddressType,
  EmailAliasEntityStatus,
} from '../../../../../../src/private/domain/entities/alias/emailAliasEntity'
import {
  EmailAliasRealAddressType,
  EmailAliasStatus,
} from '../../../../../../src/public'

describe('EmailAliasFilterTransformer Test Suite', () => {
  describe('toGraphQL', () => {
    it('transforms empty filter', () => {
      const result = EmailAliasFilterTransformer.toGraphQL({})
      expect(result).toEqual({})
    })

    describe('status filters', () => {
      it('transforms status equal filter', () => {
        const result = EmailAliasFilterTransformer.toGraphQL({
          status: {
            equal: EmailAliasEntityStatus.ENABLED,
          },
        })
        expect(result).toEqual({
          status: {
            eq: EmailMaskStatusGraphQL.Enabled,
          },
        })
      })

      it('transforms status notEqual filter', () => {
        const result = EmailAliasFilterTransformer.toGraphQL({
          status: {
            notEqual: EmailAliasEntityStatus.DISABLED,
          },
        })
        expect(result).toEqual({
          status: {
            ne: EmailMaskStatusGraphQL.Disabled,
          },
        })
      })

      it('transforms status oneOf filter', () => {
        const result = EmailAliasFilterTransformer.toGraphQL({
          status: {
            oneOf: [
              EmailAliasEntityStatus.ENABLED,
              EmailAliasEntityStatus.DISABLED,
            ],
          },
        })
        expect(result).toEqual({
          status: {
            in: [
              EmailMaskStatusGraphQL.Enabled,
              EmailMaskStatusGraphQL.Disabled,
            ],
          },
        })
      })

      it('transforms status notOneOf filter', () => {
        const result = EmailAliasFilterTransformer.toGraphQL({
          status: {
            notOneOf: [
              EmailAliasEntityStatus.LOCKED,
              EmailAliasEntityStatus.DISABLED,
            ],
          },
        })
        expect(result).toEqual({
          status: {
            notIn: [
              EmailMaskStatusGraphQL.Locked,
              EmailMaskStatusGraphQL.Disabled,
            ],
          },
        })
      })

      it('handles empty oneOf array', () => {
        const result = EmailAliasFilterTransformer.toGraphQL({
          status: {
            oneOf: [],
          },
        })
        expect(result).toEqual({})
      })

      it('handles empty notOneOf array', () => {
        const result = EmailAliasFilterTransformer.toGraphQL({
          status: {
            notOneOf: [],
          },
        })
        expect(result).toEqual({})
      })
    })

    describe('realAddressType filters', () => {
      it('transforms realAddressType equal filter', () => {
        const result = EmailAliasFilterTransformer.toGraphQL({
          realAddressType: {
            equal: EmailAliasEntityRealAddressType.INTERNAL,
          },
        })
        expect(result).toEqual({
          realAddressType: {
            eq: EmailMaskRealAddressTypeGraphQL.Internal,
          },
        })
      })

      it('transforms realAddressType notEqual filter', () => {
        const result = EmailAliasFilterTransformer.toGraphQL({
          realAddressType: {
            notEqual: EmailAliasEntityRealAddressType.EXTERNAL,
          },
        })
        expect(result).toEqual({
          realAddressType: {
            ne: EmailMaskRealAddressTypeGraphQL.External,
          },
        })
      })

      it('transforms realAddressType oneOf filter', () => {
        const result = EmailAliasFilterTransformer.toGraphQL({
          realAddressType: {
            oneOf: [
              EmailAliasEntityRealAddressType.INTERNAL,
              EmailAliasEntityRealAddressType.EXTERNAL,
            ],
          },
        })
        expect(result).toEqual({
          realAddressType: {
            in: [
              EmailMaskRealAddressTypeGraphQL.Internal,
              EmailMaskRealAddressTypeGraphQL.External,
            ],
          },
        })
      })

      it('transforms realAddressType notOneOf filter', () => {
        const result = EmailAliasFilterTransformer.toGraphQL({
          realAddressType: {
            notOneOf: [EmailAliasEntityRealAddressType.EXTERNAL],
          },
        })
        expect(result).toEqual({
          realAddressType: {
            notIn: [EmailMaskRealAddressTypeGraphQL.External],
          },
        })
      })

      it('handles empty oneOf array', () => {
        const result = EmailAliasFilterTransformer.toGraphQL({
          realAddressType: {
            oneOf: [],
          },
        })
        expect(result).toEqual({})
      })

      it('handles empty notOneOf array', () => {
        const result = EmailAliasFilterTransformer.toGraphQL({
          realAddressType: {
            notOneOf: [],
          },
        })
        expect(result).toEqual({})
      })
    })

    describe('combined filters', () => {
      it('transforms both status and realAddressType filters', () => {
        const result = EmailAliasFilterTransformer.toGraphQL({
          status: {
            equal: EmailAliasEntityStatus.ENABLED,
          },
          realAddressType: {
            equal: EmailAliasEntityRealAddressType.INTERNAL,
          },
        })
        expect(result).toEqual({
          status: {
            eq: EmailMaskStatusGraphQL.Enabled,
          },
          realAddressType: {
            eq: EmailMaskRealAddressTypeGraphQL.Internal,
          },
        })
      })
    })
  })

  describe('apiToEntity', () => {
    it('transforms empty filter', () => {
      const result = EmailAliasFilterTransformer.apiToEntity({})
      expect(result).toEqual({})
    })

    describe('realAddressType filters', () => {
      it('transforms realAddressType equal filter', () => {
        const result = EmailAliasFilterTransformer.apiToEntity({
          realAddressType: {
            equal: EmailAliasRealAddressType.INTERNAL,
          },
        })
        expect(result).toEqual({
          realAddressType: {
            equal: EmailAliasEntityRealAddressType.INTERNAL,
          },
        })
      })

      it('transforms realAddressType notEqual filter', () => {
        const result = EmailAliasFilterTransformer.apiToEntity({
          realAddressType: {
            notEqual: EmailAliasRealAddressType.EXTERNAL,
          },
        })
        expect(result).toEqual({
          realAddressType: {
            notEqual: EmailAliasEntityRealAddressType.EXTERNAL,
          },
        })
      })

      it('transforms realAddressType oneOf filter', () => {
        const result = EmailAliasFilterTransformer.apiToEntity({
          realAddressType: {
            oneOf: [
              EmailAliasRealAddressType.INTERNAL,
              EmailAliasRealAddressType.EXTERNAL,
            ],
          },
        })
        expect(result).toEqual({
          realAddressType: {
            oneOf: [
              EmailAliasEntityRealAddressType.INTERNAL,
              EmailAliasEntityRealAddressType.EXTERNAL,
            ],
          },
        })
      })

      it('transforms realAddressType notOneOf filter', () => {
        const result = EmailAliasFilterTransformer.apiToEntity({
          realAddressType: {
            notOneOf: [EmailAliasRealAddressType.EXTERNAL],
          },
        })
        expect(result).toEqual({
          realAddressType: {
            notOneOf: [EmailAliasEntityRealAddressType.EXTERNAL],
          },
        })
      })

      it('handles empty oneOf array', () => {
        const result = EmailAliasFilterTransformer.apiToEntity({
          realAddressType: {
            oneOf: [],
          },
        })
        expect(result).toEqual({})
      })

      it('handles empty notOneOf array', () => {
        const result = EmailAliasFilterTransformer.apiToEntity({
          realAddressType: {
            notOneOf: [],
          },
        })
        expect(result).toEqual({})
      })
    })

    describe('status filters', () => {
      it('transforms status equal filter', () => {
        const result = EmailAliasFilterTransformer.apiToEntity({
          status: {
            equal: EmailAliasStatus.ENABLED,
          },
        })
        expect(result).toEqual({
          status: {
            equal: EmailAliasEntityStatus.ENABLED,
          },
        })
      })

      it('transforms status notEqual filter', () => {
        const result = EmailAliasFilterTransformer.apiToEntity({
          status: {
            notEqual: EmailAliasStatus.DISABLED,
          },
        })
        expect(result).toEqual({
          status: {
            notEqual: EmailAliasEntityStatus.DISABLED,
          },
        })
      })

      it('transforms status oneOf filter', () => {
        const result = EmailAliasFilterTransformer.apiToEntity({
          status: {
            oneOf: [EmailAliasStatus.ENABLED, EmailAliasStatus.DISABLED],
          },
        })
        expect(result).toEqual({
          status: {
            oneOf: [
              EmailAliasEntityStatus.ENABLED,
              EmailAliasEntityStatus.DISABLED,
            ],
          },
        })
      })

      it('transforms status notOneOf filter', () => {
        const result = EmailAliasFilterTransformer.apiToEntity({
          status: {
            notOneOf: [EmailAliasStatus.LOCKED],
          },
        })
        expect(result).toEqual({
          status: {
            notOneOf: [EmailAliasEntityStatus.LOCKED],
          },
        })
      })

      it('handles empty oneOf array', () => {
        const result = EmailAliasFilterTransformer.apiToEntity({
          status: {
            oneOf: [],
          },
        })
        expect(result).toEqual({})
      })

      it('handles empty notOneOf array', () => {
        const result = EmailAliasFilterTransformer.apiToEntity({
          status: {
            notOneOf: [],
          },
        })
        expect(result).toEqual({})
      })
    })
  })
})
