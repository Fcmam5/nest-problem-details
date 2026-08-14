/**
 * Minimal OpenAPI 3.0 structural type definitions used internally by the
 * swagger module.
 *
 * @nestjs/swagger v11 enforces its package `exports` map, which means deep
 * imports such as `@nestjs/swagger/dist/interfaces/open-api-spec.interface`
 * are no longer accessible. These local equivalents are structurally
 * compatible with the OpenAPI 3.0 spec and avoid the dependency on internal
 * library paths.
 *
 * See: https://spec.openapis.org/oas/v3.0.3
 */

export interface ReferenceObject {
  $ref: string;
}

export interface SchemaObject {
  type?: string;
  format?: string;
  description?: string;
  properties?: Record<string, SchemaObject | ReferenceObject>;
  required?: string[];
  additionalProperties?: boolean | SchemaObject | ReferenceObject;
  items?: SchemaObject | ReferenceObject;
  allOf?: Array<SchemaObject | ReferenceObject>;
  oneOf?: Array<SchemaObject | ReferenceObject>;
  anyOf?: Array<SchemaObject | ReferenceObject>;
  not?: SchemaObject | ReferenceObject;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  minItems?: number;
  maxItems?: number;
  enum?: unknown[];
  nullable?: boolean;
  default?: unknown;
  example?: unknown;
  /** Allow OpenAPI extension members and any additional schema keywords. */
  [key: string]: unknown;
}

export interface HeaderObject {
  description?: string;
  required?: boolean;
  deprecated?: boolean;
  schema?: SchemaObject | ReferenceObject;
}
