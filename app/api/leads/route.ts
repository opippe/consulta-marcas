import { proxyOperationsRequest } from "@/app/api/operations";

export async function POST(request: Request) {
  return proxyOperationsRequest(request, "/api/leads");
}
