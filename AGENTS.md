
- MCP server lives in src/lib/mcp (tools read via user-token Supabase client so RLS applies); OAuth consent at src/routes/[.]lovable.oauth.consent.tsx — why: external agents act as the signed-in user.
