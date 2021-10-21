import { EmailAccountEntityTransformer } from '../../../../../../src/private/data/account/transformer/emailAccountEntityTransformer'
import { EntityDataFactory } from '../../../../data-factory/entity'
import { GraphQLDataFactory } from '../../../../data-factory/graphQL'

describe('EmailAccountEntityTransformer Test Suite', () => {
  const instanceUnderTest = new EmailAccountEntityTransformer()

  describe('transformGraphQL', () => {
    it('transforms successfully with optionals present', () => {
      expect(
        instanceUnderTest.transformGraphQL(GraphQLDataFactory.emailAddress),
      ).toStrictEqual(EntityDataFactory.emailAccount)
    })

    it.each`
      optional
      ${undefined}
      ${null}
    `(
      'transforms successfully with optionals absent by value $optional',
      ({ optional }) => {
        expect(
          instanceUnderTest.transformGraphQL({
            ...GraphQLDataFactory.emailAddress,
            lastReceivedAtEpochMs: optional,
          }),
        ).toStrictEqual({
          ...EntityDataFactory.emailAccount,
          lastReceivedAt: undefined,
        })
      },
    )
  })
})
