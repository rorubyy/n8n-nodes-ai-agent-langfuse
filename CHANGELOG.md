# Changelog

All notable changes to this project will be documented in this file.

## [0.1.27] - 2025-12-30

### Fixed
- **#12**: Fixed dependency conflict preventing installation in n8n
  - Added npm `overrides` to resolve `langfuse-langchain` peer dependency conflict
  - Users can now install the package in n8n Community Nodes without ERESOLVE errors
  - Maintains compatibility with LangChain 1.x while using langfuse-langchain v3

### Technical Details
- The `langfuse-langchain@3.x` package requires `langchain <0.4.0` as a peer dependency
- This package uses `langchain@1.x`, which would normally cause installation failures
- Added `overrides` configuration in package.json to force correct dependency resolution
- This approach allows the package to work in n8n's sandboxed environment without requiring environment variables

---

## [0.1.26] - 2025-12-29

### Fixed
- **#6**: Fixed hardcoded `formatting_instructions` preventing tool usage
  - `formatting_instructions` now only added when Output Parser is connected
  - Allows agent to properly use connected tools without interference
- **#9**: Fixed streaming not enabled due to incorrect typeVersion check
  - Changed condition from `>= 2.1` to `>= 2`
  - Streaming now properly activates when conditions are met

### Added
- Responses API compatibility check to prevent errors with incompatible models
- ESLint TypeScript plugin for better code quality

### Improved
- Memory handling in streaming mode
  - Now uses `loadMemoryVariables()` instead of direct `chatHistory` access
  - Respects context window length configuration
- ESLint configuration with proper TypeScript support

### Changed
- Upgraded to latest LangChain dependencies:
  - `@langchain/classic`: ^1.0.5
  - `@langchain/core`: ^1.0.0
  - `@langchain/openai`: ^1.0.0
  - `langchain`: ^1.1.1

### Documentation
- Added streaming configuration requirements
- Documented webhook streaming setup (requires Response Mode: "Streaming")

---

## Links

- [npm Package](https://www.npmjs.com/package/n8n-nodes-ai-agent-langfuse)
- [GitHub Repository](https://github.com/rorubyy/n8n-nodes-ai-agent-langfuse)
- [Issue Tracker](https://github.com/rorubyy/n8n-nodes-ai-agent-langfuse/issues)
- [Langfuse Documentation](https://langfuse.com/docs)