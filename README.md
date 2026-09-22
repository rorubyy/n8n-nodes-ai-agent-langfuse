# n8n-nodes-ai-agent-langfuse

> This project is proudly developed and maintained by **Wistron DXLab**.

![node-example](https://github.com/rorubyy/n8n-nodes-ai-agent-langfuse/blob/main/assets/node-example.png?raw=true)

An n8n community node that integrates [Langfuse](https://langfuse.com) observability into your AI Agent workflows.
Supports tool-calling agents, memory, structured output, and full tracing of reasoning steps.

npm package: [https://www.npmjs.com/package/n8n-nodes-ai-agent-langfuse](https://www.npmjs.com/package/n8n-nodes-ai-agent-langfuse)

## Features

- AI Agent Integration: Works with LangChain’s AgentExecutor and ToolCallingAgent
- Observability: Automatic Langfuse tracing for LLM reasoning, tool calls, and outputs
- Custom Metadata: Inject sessionId, userId, and structured JSON metadata into each trace

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

[Installation](#installation)  
[Credentials](#credentials)  <!-- delete if no auth needed -->  
[Operations](#operations)  
[Compatibility](#compatibility)  
[Usage](#usage)  <!-- delete if not using this section -->  
[Resources](#resources)  
[Version history](#version-history)  <!-- delete if not using this section -->  

## Installation
Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the official n8n documentation for community nodes.

### Community Nodes (Recommended)
For **n8n v0.187+**, install directly from the UI:
1. Go to Settings → Community Nodes
2. Click **Install**
3. Enter `n8n-nodes-ai-agent-langfuse` in Enter npm package name
4. Agree to the risks of using community nodes
5. Select Install

### Docker Installation (Recommended for Production)
A preconfigured Docker setup is available in the `docker/` directory:

1. Clone the repository and navigate to the docker/ directory
    ```bash
    git clone https://github.com/rorubyy/n8n-nodes-ai-agent-langfuse.git
    cd n8n-nodes-ai-agent-langfuse/docker
    ```
2. Build the Docker image
    ```bash
    docker build -t n8n:nodes-ai-agent-langfuse .
    ```
3. Run the container
    ```bash
    docker run -it -p 5678:5678 n8n:nodes-ai-agent-langfuse
    ```
You can now access n8n at http://localhost:5678

### Manual Installation
For a standard installation without Docker:
```bash
# Go to your n8n installation directory
cd ~/.n8n 
# Install the node
npm install n8n-nodes-ai-agent-langfuse
# Restart n8n to apply the node
n8n start
```
## Credential 

This credential is used to:
- Enable Langfuse tracing, by sending structured request/response logs to your Langfuse instance

### Langfuse Settings
|Field Name|Description|Example|
|-----|-----|-----|
Langfuse Base URL|The base URL of your Langfuse instance|`https://cloud.langfuse.com` or self-hosted URL|
|Public Key *|Langfuse public key used for tracing authentication|`pk-xxx`|
Secret Key *|Langfuse secret key used for tracing authentication|`sk-xxx`|
|Custom Headers (JSON)|Optional JSON object of extra headers sent with every Langfuse request (tracing and credential test)|`{"X-Custom":"value"}`|

> 🔑 How to find your Langfuse keys: <br>
> Log in to your Langfuse dashboard, then go to: <br>
> Settings → Projects → [Your Project] to retrieve publicKey and secretKey.

### Custom headers
Use **Custom Headers (JSON)** when your Langfuse instance sits behind a proxy or gateway that requires extra request headers. The headers are sent with every Langfuse request: trace ingestion and the credential test.

- The value must be a JSON object whose values are all strings.
- Header names must be valid HTTP header names.
- `Authorization`, `Content-Type`, `Content-Length` and `Host` are reserved and cannot be overridden (case-insensitive).
- Leave the field empty if you don't need it. Existing credentials keep working unchanged.
- If the JSON is invalid, the node fails with a clear error instead of silently running without tracing. Header values are never logged or added to trace metadata.

**Example: Langfuse behind Cloudflare Access (Zero Trust)**

1. In Cloudflare Zero Trust, create a **Service Token** (Access → Service Auth → Service Tokens).
2. In the Access application protecting Langfuse, add a policy with action **Service Auth** that includes this service token. A regular `Allow` policy redirects to the login page instead of accepting the token.
3. Put the token in the credential:

```json
{
  "CF-Access-Client-Id": "<client-id>.access",
  "CF-Access-Client-Secret": "<client-secret>"
}
```

### Credential UI Preview
Once filled out, your credential should look like this:

![credentials-example](https://github.com/rorubyy/n8n-nodes-ai-agent-langfuse/blob/main/assets/langfuse-api-example.png?raw=true)

✅ After saving the credential, you're ready to use the node and see traces in your Langfuse dashboard.

## Operations

This node lets you run multi-tool AI agents with full observability.

You can trace every run with context such as `sessionId`, `userId`, and any custom metadata.

---
### Supported Fields

| Field | Type | Description |
|----------|----------|----------|
| `sessionId` | `string` | Logical session ID to group related runs |
| `userId` | `string` | ID representing the end user making the request |
| `metadata` | `object` | Custom JSON object with additional context (e.g., workflowId, env) |

![langfuse-metadata-example](https://github.com/rorubyy/n8n-nodes-ai-agent-langfuse/blob/main/assets/langfuse-metadata-example.png?raw=true)
---
### 🧪 Example Setup
| Input Field | Example Value |
|----------|----------|
| Session ID | `{{$json.sessionId}}`|
| User ID | `test` |	
Custom Metadata (JSON)
```json
{
  "project": "test-project",
  "env": "dev",
  "workflow": "main-flow"
}
```
---
### Visual Example
1. **Node Configuration UI**: This shows a sample n8n workflow using the AI Agent with Langfuse Node.

![node-example](https://github.com/rorubyy/n8n-nodes-ai-agent-langfuse/blob/main/assets/node-example.png?raw=true)

2. **Langfuse Trace Output**
Here’s how a single request looks inside Langfuse:
- LLM reasoning steps
- Tool calls (with args & results)
- Final JSON responseHere’s how traces appear inside the Langfuse dashboard.

![langfuse-trace-example](https://github.com/rorubyy/n8n-nodes-ai-agent-langfuse/blob/main/assets/langfuse-trace-example.png?raw=true)


## Compatibility
- Requires n8n version 1.0.0 or later
- Compatible with:
  - OpenAI official API (https://api.openai.com)
  - Any OpenAI-compatible LLM (e.g. via LiteLLM, LocalAI, Azure OpenAI)
  - Langfuse Cloud and self-hosted instances

## Resources

- [n8n Community Node Docs](https://docs.n8n.io/integrations/community-nodes/)
- [Langfuse Documentation](https://docs.langfuse.com/)
- [n8n Community Forum](https://community.n8n.io/)
- [Langfuse GitHub](https://github.com/langfuse/langfuse)
- [n8n-nodes-langfuse-ai-agent](https://github.com/matanzvili/n8n-nodes-langfuse-ai-agent)

## Version History

### v0.2.0 (2026-09-22)
- Added optional **Custom Headers (JSON)** field to the Langfuse credential (e.g. for Cloudflare Access service tokens)

### v0.1.29 (2026-08-06)
- Fixed tool schema detection for HITL/tool calls (`instanceof` cross-module issue)
- Fixed MCP toolkit detection to prevent `undefined` tool name conflicts

### v0.1.28 (2026-08-05)
- Synced V3 execution flow with official n8n Agent architecture
- Added HITL (`Send and Wait`) and fallback model support
- Fixed cross-module `instanceof` issues in tool schema and toolkit detection

### v0.1.27
- Fixed dependency conflict preventing installation in n8n

### v0.1
- Initial release with AI Agent + Langfuse integration

## License
MIT © 2025 Wistron DXLab  