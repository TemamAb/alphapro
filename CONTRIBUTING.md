# Contributing to Alpha-Orion

First off, thank you for considering contributing to Alpha-Orion! It's people like you that make this project a world-class arbitrage platform.

This document provides guidelines for contributing to the project. Please feel free to propose changes to this document in a pull request.

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior.

## How Can I Contribute?

### Reporting Bugs

- **Ensure the bug was not already reported** by searching on GitHub under [Issues](https://github.com/TemamAb/alpha-orion/issues).
- If you're unable to find an open issue addressing the problem, [open a new one](https://github.com/TemamAb/alpha-orion/issues/new). Be sure to include a **title and clear description**, as much relevant information as possible, and a **code sample** or an **executable test case** demonstrating the expected behavior that is not occurring.

### Suggesting Enhancements

- Open a new issue to start a discussion around your idea or change.
- Provide a clear and detailed explanation of the feature, its potential benefits, and any implementation ideas.

### Pull Requests

We follow the "fork-and-pull" Git workflow.

1.  **Fork** the repo on GitHub.
2.  **Clone** your fork locally:
    ```bash
    git clone https://github.com/your_name_here/alpha-orion.git
    ```
3.  **Create a branch** for your changes:
    ```bash
    git checkout -b feature/amazing-feature
    ```
4.  **Make your changes**.
5.  **Run tests** to ensure nothing has broken:
    ```bash
    # For backend services
    npm test

    # For smart contracts
    npx hardhat test
    ```
6.  **Commit your changes** using a descriptive commit message that follows the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification. This is crucial for our release process.
    ```bash
    git commit -m "feat(api): add endpoint for wallet management"
    ```
7.  **Push** your branch to your fork:
    ```bash
    git push origin feature/amazing-feature
    ```
8.  **Open a pull request** to the `main` branch of the original repository.
9.  **Link the PR to any relevant issues**.

## Development Setup

Please refer to the main `README.md` for instructions on setting up your local development environment using both native installation and Docker Compose.

## Coding Standards

- **Follow the existing style**: We use Prettier for automated code formatting. Please ensure it is configured in your editor.
- **Write Tests**: All new features must be accompanied by tests. All bug fixes should include a test that proves the bug is fixed.
- **Documentation**: Update the relevant `README.md` or other documentation if you are changing behavior or adding a new feature.
- **Keep it Simple**: Strive for clear, readable, and maintainable code.

## Commit Message Guidelines

We use Conventional Commits. The commit message should be structured as follows:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types**: `feat`, `fix`, `build`, `chore`, `ci`, `docs`, `style`, `refactor`, `perf`, `test`.

Thank you for your contribution!