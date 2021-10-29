export interface FolderUseCaseOutput {
  id: string
  owner: string
  owners: Array<{ id: string; issuer: string }>
  emailAddressId: string
  folderName: string
  size: number
  unseenCount: number
  ttl?: number
  version: number
  createdAt: Date
  updatedAt: Date
}
