# Security Policy

## Supported Versions

The following versions of `nest-problem-details-filter` are currently supported with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |

## Reporting a Vulnerability

We take the security of `nest-http-problem-details` seriously. If you believe you have found a security vulnerability, please follow the guidelines below.

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please send vulnerability reports by email to: <au54vz9rk@mozmail.com>

Please include the following information in your report:

- Type of issue (e.g., information disclosure, ReDoS, prototype pollution, injection via error messages, etc.)
- Full paths of source file(s) related to the manifestation of the issue
- The location of the affected source code (tag/branch/commit or direct URL)
- Any special configuration required to reproduce the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit it

You should receive a response within **5 business days**. If for some reason you do not, please follow up via email to ensure we received your original message.

### Disclosure Policy

When we receive a security bug report, we will:

1. Confirm the problem and determine the affected versions.
2. Audit code to find any potential similar problems.
3. Prepare fixes for all supported versions.
4. Release new versions and notify users as quickly as possible.

We will coordinate a release date with the reporter to ensure the fix is available before the vulnerability is made public.

## Security Best Practices

When using `nest-problem-details-filter` in your application:

- Keep the library updated to the latest version
- Validate and sanitize all user inputs before they reach your NestJS application
- Be cautious when exposing detailed error information in production environments
- Ensure that sensitive data is not included in error responses

## Acknowledgments

We thank the security researchers and community members who help keep `nest-http-problem-details` and its users safe by reporting vulnerabilities responsibly.
