interface IDefaultHTTPErrors {
  [status: number]: string;
}

export const defaultHttpErrors: IDefaultHTTPErrors = {
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
  429: 'too-many-requests',
  500: 'internal-server-error',
  501: 'not-implemented',
  502: 'bad-gateway',
  503: 'service-unavailable',
  504: 'gateway-timeout',
  505: 'http-version-not-supported',
};

// Provider keys
export const BASE_PROBLEMS_URI = 'BASE_PROBLEMS_URI';
export const HTTP_ERRORS_MAP = 'HTTP_ERRORS_MAP';
export const HTTP_EXCEPTION_FILTER = 'HTTP_EXCEPTION_FILTER';
