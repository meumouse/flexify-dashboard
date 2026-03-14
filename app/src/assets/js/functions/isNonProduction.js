export const isNonProduction = (hostname = window.location.hostname) => {
  // List of common development/staging subdomains
  const devSubdomains = ["dev", "development", "staging", "test", "testing", "beta", "qa", "uat"];

  const parts = hostname.split(".");
  const isInstawp = parts.includes("instawp");

  // Function to check if hostname starts with any of the dev subdomains
  const startsWithDevSubdomain = (hostname) => devSubdomains.some((subdomain) => hostname.startsWith(`${subdomain}.`) || hostname === subdomain);

  // Original localhost checks
  const isLocalhost = hostname === "localhost" || hostname === "instawp" || hostname === "[::1]" || hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/);

  // Development TLD checks
  const isDevTLD =
    hostname.endsWith(".local") || hostname.endsWith(".test") || hostname.endsWith(".localhost") || hostname.endsWith(".example") || hostname.endsWith(".invalid") || hostname.endsWith(".dev"); // Note: .dev is now a valid public TLD, but often used for development

  // Local network IP checks
  const isLocalIP = /^10\./.test(hostname) || /^172\.(1[6-9]|2\d|3[01])\./.test(hostname) || /^192\.168\./.test(hostname);

  // Combine all checks
  return (
    isInstawp ||
    isLocalhost ||
    isDevTLD ||
    isLocalIP ||
    startsWithDevSubdomain(hostname) ||
    // Add any custom checks here
    false // Change to `true` to consider additional custom conditions
  );
};
