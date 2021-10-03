import { EmailAccountEntityTransformer } from '../../../../../../src/private/data/account/transformer/emailAccountEntityTransformer'
import { EntityDataFactory } from '../../../../data-factory/entity'
import { GraphQLDataFactory } from '../../../../data-factory/graphQL'

describe('EmailAccountEntityTransformer Test Suite', () => {
  const instanceUnderTest = new EmailAccountEntityTransformer()

  describe('transformGraphQL', () => {
    it('transforms successfully', () => {
      expect(
        instanceUnderTest.transformGraphQL(GraphQLDataFactory.emailAddress),
      ).toStrictEqual(EntityDataFactory.emailAccount)
    })
  })
})
