## PR Checklist - Instructions

Before submitting, ensure your PR meets the following requirements:

- **Compliance:**
    - Includes a detailed description of the changes.
    - Assess and state the risk (Low | Medium | High) regarding existing functionality.

- **Documentation:**
    - Links to automated tests covering the new functionality.
    - Provides manual testing instructions.
    - Includes a GitBook documentation PR link, if applicable.

- **Commit Guidelines:**
    - The commit message is descriptive and uses `feat:` or `fix:` prefix when needed.
      - Reference: https://www.conventionalcommits.org/en/v1.0.0/ guidelines.

- **Testing:**
    - Ensures changes are covered by tests (acceptance/integration/smoke).

## Review Process

- PRs require thorough reviews, including code, documentation, and testing.
- Manual testing is the submitter's responsibility.
- For Node projects, ensure `package.json` updates align with `package-lock.json`.
- Minimize dependencies; justify new ones.

## PR Approval

- Post-review, PRs are approved by code owners and merged by them or content writers for documentation.

## Submission Fields

- **What does this PR do?**

- **Where should the reviewer start?**

- **How should this be manually tested?**

- **Any background context?**

- **Relevant tickets?**

- **Screenshots (if applicable):**

- **Additional questions or comments:**

