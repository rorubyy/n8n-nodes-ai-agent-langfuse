FROM n8nio/n8n:latest

USER root

RUN mkdir -p /opt/n8n-custom-nodes && \
    cd /opt/n8n-custom-nodes && \
    npm init -y && \
    npm install n8n-nodes-ai-agent-langfuse@0.1.27 && \
    chown -R node:node /opt/n8n-custom-nodes

ENV N8N_CUSTOM_EXTENSIONS="/opt/n8n-custom-nodes"

USER node
ENTRYPOINT ["tini", "--", "/docker-entrypoint.sh"]
