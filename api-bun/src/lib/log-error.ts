/** Database/provider errors can contain parameters, tokens and personal data. */
export function logError(operation: string, error: unknown) {
  if (process.env.NODE_ENV === "production") {
    console.error(operation, { errorId: crypto.randomUUID() });
  } else {
    console.error(operation, error);
  }
}
