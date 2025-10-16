/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { EmailMaskFilterTransformer } from '../../../../../../src/private/data/mask/transformer/emailMaskFilterTransformer'
import {
  EmailMaskRealAddressType as EmailMaskRealAddressTypeGraphQL,
  EmailMaskStatus as EmailMaskStatusGraphQL,
} from '../../../../../../src/gen/graphqlTypes'
import {
  EmailMaskEntityRealAddressType,
  EmailMaskEntityStatus,
} from '../../../../../../src/private/domain/entities/mask/emailMaskEntity'
import {
  EmailMaskRealAddressType,
  EmailMaskStatus,
} from '../../../../../../src/public'

describe('EmailMaskFilterTransformer Test Suite', () => {
  describe('toGraphQL', () => {
    it('transforms empty filter', () => {
      const result = EmailMaskFilterTransformer.toGraphQL({})
      expect(result).toEqual({})
    })

    describe('status filters', () => {
      it('transforms status equal filter', () => {
        const result = EmailMaskFilterTransformer.toGraphQL({
          status: {
            equal: EmailMaskEntityStatus.ENABLED,
          },
        })
        expect(result).toEqual({
          status: {
            eq: EmailMaskStatusGraphQL.Enabled,
          },
        })
      })

      it('transforms status notEqual filter', () => {
        const result = EmailMaskFilterTransformer.toGraphQL({
          status: {
            notEqual: EmailMaskEntityStatus.DISABLED,
          },
        })
        expect(result).toEqual({
          status: {
            ne: EmailMaskStatusGraphQL.Disabled,
          },
        })
      })

      it('transforms status oneOf filter', () => {
        const result = EmailMaskFilterTransformer.toGraphQL({
          status: {
            oneOf: [
              EmailMaskEntityStatus.ENABLED,
              EmailMaskEntityStatus.DISABLED,
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
        const result = EmailMaskFilterTransformer.toGraphQL({
          status: {
            notOneOf: [
              EmailMaskEntityStatus.LOCKED,
              EmailMaskEntityStatus.DISABLED,
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
        const result = EmailMaskFilterTransformer.toGraphQL({
          status: {
            oneOf: [],
          },
        })
        expect(result).toEqual({})
      })

      it('handles empty notOneOf array', () => {
        const result = EmailMaskFilterTransformer.toGraphQL({
          status: {
            notOneOf: [],
          },
        })
        expect(result).toEqual({})
      })
    })

    describe('realAddressType filters', () => {
      it('transforms realAddressType equal filter', () => {
        const result = EmailMaskFilterTransformer.toGraphQL({
          realAddressType: {
            equal: EmailMaskEntityRealAddressType.INTERNAL,
          },
        })
        expect(result).toEqual({
          realAddressType: {
            eq: EmailMaskRealAddressTypeGraphQL.Internal,
          },
        })
      })

      it('transforms realAddressType notEqual filter', () => {
        const result = EmailMaskFilterTransformer.toGraphQL({
          realAddressType: {
            notEqual: EmailMaskEntityRealAddressType.EXTERNAL,
          },
        })
        expect(result).toEqual({
          realAddressType: {
            ne: EmailMaskRealAddressTypeGraphQL.External,
          },
        })
      })

      it('transforms realAddressType oneOf filter', () => {
        const result = EmailMaskFilterTransformer.toGraphQL({
          realAddressType: {
            oneOf: [
              EmailMaskEntityRealAddressType.INTERNAL,
              EmailMaskEntityRealAddressType.EXTERNAL,
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
        const result = EmailMaskFilterTransformer.toGraphQL({
          realAddressType: {
            notOneOf: [EmailMaskEntityRealAddressType.EXTERNAL],
          },
        })
        expect(result).toEqual({
          realAddressType: {
            notIn: [EmailMaskRealAddressTypeGraphQL.External],
          },
        })
      })

      it('handles empty oneOf array', () => {
        const result = EmailMaskFilterTransformer.toGraphQL({
          realAddressType: {
            oneOf: [],
          },
        })
        expect(result).toEqual({})
      })

      it('handles empty notOneOf array', () => {
        const result = EmailMaskFilterTransformer.toGraphQL({
          realAddressType: {
            notOneOf: [],
          },
        })
        expect(result).toEqual({})
      })
    })

    describe('combined filters', () => {
      it('transforms both status and realAddressType filters', () => {
        const result = EmailMaskFilterTransformer.toGraphQL({
          status: {
            equal: EmailMaskEntityStatus.ENABLED,
          },
          realAddressType: {
            equal: EmailMaskEntityRealAddressType.INTERNAL,
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
      const result = EmailMaskFilterTransformer.apiToEntity({})
      expect(result).toEqual({})
    })

    describe('realAddressType filters', () => {
      it('transforms realAddressType equal filter', () => {
        const result = EmailMaskFilterTransformer.apiToEntity({
          realAddressType: {
            equal: EmailMaskRealAddressType.INTERNAL,
          },
        })
        expect(result).toEqual({
          realAddressType: {
            equal: EmailMaskEntityRealAddressType.INTERNAL,
          },
        })
      })

      it('transforms realAddressType notEqual filter', () => {
        const result = EmailMaskFilterTransformer.apiToEntity({
          realAddressType: {
            notEqual: EmailMaskRealAddressType.EXTERNAL,
          },
        })
        expect(result).toEqual({
          realAddressType: {
            notEqual: EmailMaskEntityRealAddressType.EXTERNAL,
          },
        })
      })

      it('transforms realAddressType oneOf filter', () => {
        const result = EmailMaskFilterTransformer.apiToEntity({
          realAddressType: {
            oneOf: [
              EmailMaskRealAddressType.INTERNAL,
              EmailMaskRealAddressType.EXTERNAL,
            ],
          },
        })
        expect(result).toEqual({
          realAddressType: {
            oneOf: [
              EmailMaskEntityRealAddressType.INTERNAL,
              EmailMaskEntityRealAddressType.EXTERNAL,
            ],
          },
        })
      })

      it('transforms realAddressType notOneOf filter', () => {
        const result = EmailMaskFilterTransformer.apiToEntity({
          realAddressType: {
            notOneOf: [EmailMaskRealAddressType.EXTERNAL],
          },
        })
        expect(result).toEqual({
          realAddressType: {
            notOneOf: [EmailMaskEntityRealAddressType.EXTERNAL],
          },
        })
      })

      it('handles empty oneOf array', () => {
        const result = EmailMaskFilterTransformer.apiToEntity({
          realAddressType: {
            oneOf: [],
          },
        })
        expect(result).toEqual({})
      })

      it('handles empty notOneOf array', () => {
        const result = EmailMaskFilterTransformer.apiToEntity({
          realAddressType: {
            notOneOf: [],
          },
        })
        expect(result).toEqual({})
      })
    })

    describe('status filters', () => {
      it('transforms status equal filter', () => {
        const result = EmailMaskFilterTransformer.apiToEntity({
          status: {
            equal: EmailMaskStatus.ENABLED,
          },
        })
        expect(result).toEqual({
          status: {
            equal: EmailMaskEntityStatus.ENABLED,
          },
        })
      })

      it('transforms status notEqual filter', () => {
        const result = EmailMaskFilterTransformer.apiToEntity({
          status: {
            notEqual: EmailMaskStatus.DISABLED,
          },
        })
        expect(result).toEqual({
          status: {
            notEqual: EmailMaskEntityStatus.DISABLED,
          },
        })
      })

      it('transforms status oneOf filter', () => {
        const result = EmailMaskFilterTransformer.apiToEntity({
          status: {
            oneOf: [EmailMaskStatus.ENABLED, EmailMaskStatus.DISABLED],
          },
        })
        expect(result).toEqual({
          status: {
            oneOf: [
              EmailMaskEntityStatus.ENABLED,
              EmailMaskEntityStatus.DISABLED,
            ],
          },
        })
      })

      it('transforms status notOneOf filter', () => {
        const result = EmailMaskFilterTransformer.apiToEntity({
          status: {
            notOneOf: [EmailMaskStatus.LOCKED],
          },
        })
        expect(result).toEqual({
          status: {
            notOneOf: [EmailMaskEntityStatus.LOCKED],
          },
        })
      })

      it('handles empty oneOf array', () => {
        const result = EmailMaskFilterTransformer.apiToEntity({
          status: {
            oneOf: [],
          },
        })
        expect(result).toEqual({})
      })

      it('handles empty notOneOf array', () => {
        const result = EmailMaskFilterTransformer.apiToEntity({
          status: {
            notOneOf: [],
          },
        })
        expect(result).toEqual({})
      })
    })
  })
})
