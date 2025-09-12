// For Node.js, we primarily use process.env
// Bindings are more for Cloudflare Workers/edge runtimes
export type Bindings = {
  // Future: Can be used for edge deployment if needed
};

export type AppVariables = {
  // Future: Can store request-specific variables
};

export type contextVariables = {
  Bindings: Bindings;
  Variables: AppVariables;
};
