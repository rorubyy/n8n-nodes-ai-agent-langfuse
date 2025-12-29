# Changelog

All notable changes to this project will be documented in this file.

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