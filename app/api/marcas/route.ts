import { proxyOperationsRequest } from "@/app/api/operations";

// Contact validation and capture are required before a real provider search.
export async function POST(request: Request) {
  return proxyOperationsRequest(request, "/api/marcas");
}
