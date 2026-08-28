# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in Roko's Council, please report it to us at [Michael Robins](https://github.com/Michaelrobins938). We will acknowledge your report within 48 hours and provide an initial assessment of the issue.

## Supported Versions

We actively monitor and patch security vulnerabilities in the latest released version. It is recommended to always use the most recent version of Roko's Council.

| Version | Status        |
| ------- | ------------- |
| 1.0.x   | Currently Supported |
| < 1.0   | Not Supported |

## Security Considerations

### API Keys

Roko's Council requires API keys for Google AI services. Never commit API keys to the repository. Use the `.env.example` file as a template and keep your `.env` file local and private.

### User Input

The application processes user prompts and LLM-generated content. While the application renders markdown output, users should be aware that AI-generated content may contain inaccuracies. Always exercise judgment when interpreting deliberation outputs.

### Browser Permissions

The application requests microphone access for speech synthesis features. This permission is requested explicitly and only when the user initiates voice features.

## Secure Development

- All dependencies are tracked in `package.json` and audited regularly
- The build process produces no server-side code — this is a client-side application
- No user data is persisted on servers; all state is local to the browser session
- The application communicates with Google AI APIs over HTTPS

## Contact

For security inquiries, please contact [Michael Robins](https://github.com/Michaelrobins938) via a private GitHub message or email.
