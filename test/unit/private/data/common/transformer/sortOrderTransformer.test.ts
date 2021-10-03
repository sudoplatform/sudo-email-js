import { SortOrder as SortOrderGraphQL } from '../../../../../../src/gen/graphqlTypes'
import { SortOrderTransformer } from '../../../../../../src/private/data/common/transformer/sortOrderTransformer'
import { SortOrder } from '../../../../../../src/public/typings/sortOrder'

describe('SortOrderTransformerTest Suite', () => {
  const instanceUnderTest = new SortOrderTransformer()

  describe('fromAPItoGraphQL', () => {
    it.each`
      input             | expected
      ${SortOrder.Asc}  | ${SortOrderGraphQL.Asc}
      ${SortOrder.Desc} | ${SortOrderGraphQL.Desc}
    `(
      'converts API sortOrder ($input) to GraphQL sortOrder ($expected)',
      ({ input, expected }) => {
        expect(instanceUnderTest.fromAPItoGraphQL(input)).toStrictEqual(
          expected,
        )
      },
    )
  })

  describe('fromGraphQLtoAPI', () => {
    it.each`
      input                    | expected
      ${SortOrderGraphQL.Asc}  | ${SortOrder.Asc}
      ${SortOrderGraphQL.Desc} | ${SortOrder.Desc}
    `(
      'converts GraphQL state ($input) to API state ($expected)',
      ({ input, expected }) => {
        expect(instanceUnderTest.fromGraphQLtoAPI(input)).toStrictEqual(
          expected,
        )
      },
    )
  })
})
