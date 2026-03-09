import type { CodegenConfig } from '@graphql-codegen/cli'

const config: CodegenConfig = {
  schema: ['./graphql/schema/**/*.graphql'],
  documents: [
    './graphql/documents/**/*.graphql',
  ],
  generates: {
    './src/gen/graphqlTypes.ts': {
      plugins: ['typescript', 'typescript-operations', 'typed-document-node'],
    },
  },
  ignoreNoDocuments: true,
  hooks: {
    afterOneFileWrite: ['prettier --write'],
    afterAllFileWrite: [
      'echo "GraphQL code generation completed successfully"',
    ],
  },
}

export default config
