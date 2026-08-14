import {
  DynamicModule,
  ForwardReference,
  InjectionToken,
  Module,
  OptionalFactoryDependency,
  Provider,
  Type,
} from '@nestjs/common';
import {
  BASE_PROBLEMS_URI_KEY,
  DEFAULT_HTTP_ERRORS,
  HTTP_ERRORS_MAP_KEY,
  SUPPRESS_DETAIL_KEY,
  STRICT_RFC_DEFAULTS_KEY,
} from './filter/constants';
import {
  BASE_PROBLEMS_URI,
  HTTP_ERRORS_MAP,
  HTTP_EXCEPTION_FILTER,
  SUPPRESS_DETAIL,
  STRICT_RFC_DEFAULTS,
} from './filter/providers';
import { SuppressDetail } from './filter/interfaces';

const staticProviders = [
  BASE_PROBLEMS_URI,
  HTTP_ERRORS_MAP,
  SUPPRESS_DETAIL,
  STRICT_RFC_DEFAULTS,
  HTTP_EXCEPTION_FILTER,
];

/**
 * Options accepted by `NestProblemDetailsModule.register()`.
 *
 * @see https://www.rfc-editor.org/rfc/rfc9457
 */
export interface NestProblemDetailsModuleOptions {
  /**
   * Base URI prepended to every `type` value in Problem Details responses.
   * @example 'https://api.example.org/problems'
   */
  baseUri?: string;
  /**
   * Map of HTTP status codes to problem `type` slugs. Merged with
   * `DEFAULT_HTTP_ERRORS`; entries here override the defaults.
   */
  httpErrorsMap?: Record<number, string>;
  /**
   * Controls whether the `detail` field is omitted from responses.
   * @see SuppressDetail
   */
  suppressDetail?: SuppressDetail;
  /**
   * When `true`, enables strict RFC 9457 compliance for plain HTTP exceptions:
   * - `type` defaults to `"about:blank"` instead of a status-code slug (§4.2.1).
   * - `title` is always the HTTP reason phrase; the caller-supplied message
   *   goes into `detail` instead.
   *
   * Defaults to `false` to preserve existing behavior. Pass `true` to opt in
   * now — this is the recommended setting for new projects.
   *
   * **Migration path:**
   * - v1.x (now): opt-in — set to `true` to enable, `false` is the default.
   * - v2 (next major): this field will be marked `@deprecated` and will
   *   default to `true`. Pass `false` explicitly to keep legacy behavior, or
   *   remove the option entirely if you were already passing `true`.
   * - v3 (future): field removed; strict behavior is the only mode.
   *
   * @see https://github.com/Fcmam5/nest-problem-details/issues/47
   * @see https://github.com/Fcmam5/nest-problem-details/issues/48
   */
  // TODO #48: remove this field in v3
  strictRfcDefaults?: boolean;
}

/**
 * Async variant of `NestProblemDetailsModuleOptions` for `registerAsync()`.
 */
export interface NestProblemDetailsModuleAsyncOptions {
  imports?: Array<
    Type<unknown> | DynamicModule | Promise<DynamicModule> | ForwardReference
  >;
  inject?: Array<InjectionToken | OptionalFactoryDependency>;
  useFactory: (
    ...args: any[]
  ) =>
    NestProblemDetailsModuleOptions | Promise<NestProblemDetailsModuleOptions>;
}

@Module({
  providers: staticProviders,
  exports: staticProviders,
})
export class NestProblemDetailsModule {
  /**
   * Register the module with explicit options. Recommended over manually
   * overriding the internal provider tokens.
   *
   * @example
   * NestProblemDetailsModule.register({
   *   baseUri: 'https://api.example.org/problems',
   *   httpErrorsMap: { 418: 'teapot-error' },
   *   suppressDetail: ({ status }) => status >= 500,
   * })
   */
  static register(
    options: NestProblemDetailsModuleOptions = {},
  ): DynamicModule {
    const providers: Provider[] = [
      {
        provide: BASE_PROBLEMS_URI_KEY,
        useValue: options.baseUri ?? '',
      },
      {
        provide: HTTP_ERRORS_MAP_KEY,
        useValue: { ...DEFAULT_HTTP_ERRORS, ...(options.httpErrorsMap ?? {}) },
      },
      {
        provide: SUPPRESS_DETAIL_KEY,
        useValue: options.suppressDetail,
      },
      {
        provide: STRICT_RFC_DEFAULTS_KEY,
        useValue: options.strictRfcDefaults ?? false, // TODO #47: flip default to true in v2
      },
      HTTP_EXCEPTION_FILTER,
    ];

    return {
      module: NestProblemDetailsModule,
      providers,
      exports: providers,
    };
  }

  /**
   * Register the module asynchronously, resolving options from a factory.
   * Useful when options come from a `ConfigService` or other injected source.
   *
   * @example
   * NestProblemDetailsModule.registerAsync({
   *   inject: [ConfigService],
   *   useFactory: (config: ConfigService) => ({
   *     baseUri: config.get('PROBLEMS_BASE_URI'),
   *   }),
   * })
   */
  static registerAsync(
    options: NestProblemDetailsModuleAsyncOptions,
  ): DynamicModule {
    const OPTIONS_TOKEN = Symbol('NEST_PROBLEM_DETAILS_OPTIONS');

    const providers: Provider[] = [
      {
        provide: OPTIONS_TOKEN,
        useFactory: options.useFactory,
        inject: options.inject ?? [],
      },
      {
        provide: BASE_PROBLEMS_URI_KEY,
        useFactory: (opts: NestProblemDetailsModuleOptions) =>
          opts.baseUri ?? '',
        inject: [OPTIONS_TOKEN],
      },
      {
        provide: HTTP_ERRORS_MAP_KEY,
        useFactory: (opts: NestProblemDetailsModuleOptions) => ({
          ...DEFAULT_HTTP_ERRORS,
          ...(opts.httpErrorsMap ?? {}),
        }),
        inject: [OPTIONS_TOKEN],
      },
      {
        provide: SUPPRESS_DETAIL_KEY,
        useFactory: (opts: NestProblemDetailsModuleOptions) =>
          opts.suppressDetail,
        inject: [OPTIONS_TOKEN],
      },
      {
        provide: STRICT_RFC_DEFAULTS_KEY,
        useFactory: (opts: NestProblemDetailsModuleOptions) =>
          opts.strictRfcDefaults ?? false, // TODO #47: flip default to true in v2
        inject: [OPTIONS_TOKEN],
      },
      HTTP_EXCEPTION_FILTER,
    ];

    return {
      module: NestProblemDetailsModule,
      imports: options.imports ?? [],
      providers,
      exports: providers,
    };
  }
}
