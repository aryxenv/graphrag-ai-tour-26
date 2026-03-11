---
description: "Use when building, modifying, or adding UI components in the client React app. Enforces Fluent UI usage via the MCP server."
applyTo: "client/**"
---

# UI Component Rules

- **Always use the Fluent UI MCP server** (`fluent_*` tools) to look up correct component APIs, props, patterns, and accessibility guidance before writing or modifying any UI component.
- Use `@fluentui/react` components exclusively — do not introduce third-party UI libraries (e.g., Material UI, Chakra, Ant Design) or hand-roll components that Fluent UI already provides.
- When composing layouts or patterns (forms, data tables, dialogs, sidebars), call the relevant Fluent UI MCP pattern tool first (e.g., `fluent-form-pattern`, `fluent-data-table-pattern`) to get the recommended structure.
- Use Microsoft style and design guidelines for UI components, including spacing, typography, and color usage. The Fluent UI MCP server can provide guidance on this as well.
- Use the new Microsoft Foundry (Azure AI Foundry) design system (black [#151515] with subtle purple [#7b53e6] gradient and purple accents and buttons) and Fluent UI version as the source of truth for component design and implementation. Do not use older versions of Fluent UI or reference outdated Microsoft design guidelines.
