#!/usr/bin/env node

// ============================================================================
// NISHI MCP Server Entry Point
//
// Starts the NISHI MCP server for Claude Code integration.
// Usage: nishi-mcp-server
// ============================================================================

import { startMCPServer } from '../dist/mcp/server.js';

// Start the MCP server
startMCPServer();
