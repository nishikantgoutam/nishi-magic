#!/usr/bin/env node

// ============================================================================
// DevWeaver MCP Server Entry Point
//
// Starts the DevWeaver MCP server for Claude Code integration.
// Usage: devweaver-mcp-server
// ============================================================================

import { startMCPServer } from '../dist/mcp/server.js';

// Start the MCP server
startMCPServer();
