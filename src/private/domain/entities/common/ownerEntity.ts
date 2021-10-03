/**
 * Core entity representation of a owner business rule. Depicts the identifier and issuer of an owner of a resource.
 *
 * @interface OwnerEntity
 * @property {string} id Unique identifier of the owner.
 * @property {string} issuer Issuer of the owner.
 */
export interface OwnerEntity {
  id: string
  issuer: string
}
