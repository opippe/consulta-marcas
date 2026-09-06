import { proxyOperationsRequest } from "@/app/api/operations";

export async function POST(request: Request) {
  return proxyOperationsRequest(request, "/api/leads/interest");
}

export async function GET(request: Request) {
  return proxyOperationsRequest(request, `/api/leads/interest${new URL(request.url).search}`);
}
