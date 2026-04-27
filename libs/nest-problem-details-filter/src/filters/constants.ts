export interface IDefaultHTTPErrors {
  [status: number]: string;
}

export const DEFAULT_HTTP_ERRORS: IDefaultHTTPErrors = {
  400: 'bad-request',
  401: 'unauthorized',
  402: 'payment-required',
  403: 'forbidden',
  404: 'not-found',
  405: 'method-not-allowed',
  406: 'not-acceptable',
  407: 'proxy-authentication-required',
  408: 'request-timeout',
  409: 'conflict',
  410: 'gone',
  411: 'length-required',
  412: 'precondition-failed',
  413: 'payload-too-large',
  414: 'uri-too-long',
  415: 'unsupported-media-type',
  416: 'requested-range-not-satisfiable',
  417: 'expectation-failed',
  418: 'i-am-a-teapot',
  421: 'misdirected',
  422: 'unprocessable-entity',
  424: 'failed-dependency',
  425: 'too-early',
  426: 'upgrade-required',
  428: 'precondition-required',
  429: 'too-many-requests',
  431: 'request-header-fields-too-large',
  451: 'unavailable-for-legal-reasons',
  500: 'internal-server-error',
  501: 'not-implemented',
  502: 'bad-gateway',
  503: 'service-unavailable',
  504: 'gateway-timeout',
  505: 'http-version-not-supported',
  506: 'variant-also-negotiates',
  507: 'insufficient-storage',
  508: 'loop-detected',
  510: 'not-extended',
  511: 'network-authentication-required',
};

// Provider keys
export const BASE_PROBLEMS_URI_KEY = 'BASE_PROBLEMS_URI';
export const HTTP_ERRORS_MAP_KEY = 'HTTP_ERRORS_MAP';
export const HTTP_EXCEPTION_FILTER_KEY = 'HTTP_EXCEPTION_FILTER';

export const PROBLEM_CONTENT_TYPE = 'application/problem+json';
