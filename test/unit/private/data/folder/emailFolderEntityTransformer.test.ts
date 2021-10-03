import { EmailFolderEntityTransformer } from '../../../../../src/private/data/folder/transformer/emailFolderEntityTransformer'
import { EntityDataFactory } from '../../../data-factory/entity'
import { GraphQLDataFactory } from '../../../data-factory/graphQL'

describe('EmailFolderEntityTransformer Test Suite', () => {
  const instanceUnderTest = new EmailFolderEntityTransformer()

  describe('transformGraphQL', () => {
    it('transforms successfully', () => {
      expect(
        instanceUnderTest.transformGraphQL(GraphQLDataFactory.emailFolder),
      ).toStrictEqual(EntityDataFactory.emailFolder)
    })
  })
})
