export const buildDashboardUrl = (parameters: Record<string, string>): string => {
  const url = new URL("/dashboard", process.env.FRONTEND_URL ?? "http://localhost:3000");

  Object.entries(parameters).forEach(([key, value]) => url.searchParams.set(key, value));
  return url.toString();
};
