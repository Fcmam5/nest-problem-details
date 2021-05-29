# Nest.js HTTP Problem Details (RFC-7807)

## Example output

### OpenAPI schema

```yml
# Source: https://opensource.zalando.com/restful-api-guidelines/problem-1.0.1.yaml
Problem:
  type: object
  properties:
    type:
      type: string
      format: uri-reference
      description: >
        A URI reference that uniquely identifies the problem type only in the
        context of the provided API. Opposed to the specification in RFC-7807,
        it is neither recommended to be dereferencable and point to a
        human-readable documentation nor globally unique for the problem type.
      default: 'about:blank'
      example: '/problem/connection-error'
    title:
      type: string
      description: >
        A short summary of the problem type. Written in English and readable
        for engineers, usually not suited for non technical stakeholders and
        not localized.
      example: Service Unavailable
    status:
      type: integer
      format: int32
      description: >
        The HTTP status code generated by the origin server for this occurrence
        of the problem.
      minimum: 100
      maximum: 600
      exclusiveMaximum: true
      example: 503
    detail:
      type: string
      description: >
        A human readable explanation specific to this occurrence of the
        problem that is helpful to locate the problem and give advice on how
        to proceed. Written in English and readable for engineers, usually not
        suited for non technical stakeholders and not localized.
      example: Connection to database timed out
    instance:
      type: string
      format: uri-reference
      description: >
        A URI reference that identifies the specific occurrence of the problem,
        e.g. by adding a fragment identifier or sub-path to the problem type.
        May be used to locate the root of this problem in the source code.
      example: '/problem/connection-error#token-info-read-timed-out'
```

## Resources

- [IETF RFC-7807: Problem Details for HTTP APIs](https://datatracker.ietf.org/doc/html/rfc7807)
- [Zalando RESTful API:](https://opensource.zalando.com/restful-api-guidelines/#176)
- And of course, Nest's awesome community:
  - [Exception filters](https://docs.nestjs.com/exception-filters#exception-filters-1)
  - [@kamilmysliwiec's comment](https://github.com/nestjs/nest/issues/2953#issuecomment-531678153)

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details
