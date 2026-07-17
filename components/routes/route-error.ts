import { ConvexError } from "convex/values";

export function getRouteActionError(error: unknown) {
  if (
    error instanceof ConvexError &&
    typeof error.data === "object" &&
    error.data !== null &&
    "message" in error.data
  ) {
    const message = error.data.message;
    if (typeof message === "string") return message;
  }
  return "The route could not be updated. Please retry.";
}
