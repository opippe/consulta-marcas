import { proxyOperationsRequest } from "@/app/api/operations";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token")?.trim();
  if (!token) {
    return Response.json({ error: "Consulta inválida." }, { status: 400 });
  }

  return proxyOperationsRequest(
    request,
    `/api/consultas?token=${encodeURIComponent(token)}`,
  );
}
