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
 * TODO #51: Remove this file and import directly from `@nestjs/swagger` once it
 * exposes these types via its public entry point.
 * Tracked in: https://github.com/Fcmam5/nest-problem-details/issues/51
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

/**
 * OAS 3.0 serialization styles (§4.8.12).
 * Used by Parameter and Header objects.
 */
export type ParameterStyle =
  | 'matrix'
  | 'label'
  | 'form'
  | 'simple'
  | 'spaceDelimited'
  | 'pipeDelimited'
  | 'deepObject';

/**
 * OAS 3.0 Example Object (§4.8.19).
 */
export interface ExampleObject {
  summary?: string;
  description?: string;
  value?: unknown;
  externalValue?: string;
}

/**
 * OpenAPI 3.0 Header Object (§4.8.13).
 * Mirrors the Parameter Object minus `name` and `in`.
 * See: https://spec.openapis.org/oas/v3.0.3#header-object
 */
export interface HeaderObject {
  description?: string;
  required?: boolean;
  deprecated?: boolean;
  allowEmptyValue?: boolean;
  /** Serialization style. Default for headers is `"simple"`. */
  style?: ParameterStyle;
  explode?: boolean;
  allowReserved?: boolean;
  schema?: SchemaObject | ReferenceObject;
  example?: unknown;
  examples?: Record<string, ExampleObject | ReferenceObject>;
  /** Single media type encoding for a header value (rarely used). */
  content?: Record<
    string,
    { schema?: SchemaObject | ReferenceObject; [key: string]: unknown }
  >;
}
