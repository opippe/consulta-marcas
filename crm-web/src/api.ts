import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../api-bun/src/trpc";

export const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ??
  (import.meta.env.DEV ? "http://localhost:3100" : "");

export const publicProposalBaseUrl =
  import.meta.env.VITE_PUBLIC_PROPOSAL_URL?.replace(/\/$/, "") ??
  window.location.origin;

export const trpc = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${apiBaseUrl}/trpc`,
      fetch(url, options) {
        return fetch(url, { ...options, credentials: "include" });
      },
    }),
  ],
});

export type RouterOutputs = inferRouterOutputs<AppRouter>;
export type LeadListOutput = RouterOutputs["crm"]["leads"]["list"];
export type LeadDetailOutput = RouterOutputs["crm"]["leads"]["detail"];
export type LeadStatus = LeadListOutput["items"][number]["status"];
export type ProposalListOutput = RouterOutputs["crm"]["proposals"]["listByLead"];
export type ProposalRecord = ProposalListOutput[number];
export type PublicProposalOutput = RouterOutputs["publicProposal"]["get"];
export type ContractListOutput = RouterOutputs["crm"]["contracts"]["listByLead"];
export type ContractRecord = ContractListOutput[number];
export type ContractDocumentListOutput =
  RouterOutputs["crm"]["contractDocuments"]["listByLead"];
export type ContractDocumentRecord = ContractDocumentListOutput[number];
export type PaymentConfirmationsOutput =
  RouterOutputs["crm"]["paymentConfirmations"]["listByLead"];
export type PaymentConfirmationRecord = PaymentConfirmationsOutput["items"][number];
export type PublicContractOutput = RouterOutputs["publicContract"]["get"];

export type SessionData = {
  user: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
  };
  session: {
    id: string;
    expiresAt: string;
  };
};

export async function loadSession() {
  const response = await fetch(`${apiBaseUrl}/api/auth/get-session`, {
    credentials: "include",
  });
  if (!response.ok) throw new Error("Não foi possível validar sua sessão.");
  return (await response.json()) as SessionData | null;
}

export async function signIn(email: string, password: string) {
  const response = await fetch(`${apiBaseUrl}/api/auth/sign-in/email`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, rememberMe: true }),
  });

  const body = (await response.json().catch(() => ({}))) as {
    message?: string;
  };
  if (!response.ok) {
    throw new Error(
      body.message === "Invalid email or password"
        ? "E-mail ou senha incorretos."
        : body.message || "Não foi possível entrar.",
    );
  }
}

export async function signOut() {
  await fetch(`${apiBaseUrl}/api/auth/sign-out`, {
    method: "POST",
    credentials: "include",
  });
}

export async function uploadContractDocument(input: {
  contractId: string;
  file: File;
  signatureMethod: "GOV_BR" | "MANUAL";
  notes?: string;
}) {
  const formData = new FormData();
  formData.append("file", input.file);
  formData.append("signatureMethod", input.signatureMethod);
  if (input.notes?.trim()) formData.append("notes", input.notes.trim());

  const response = await fetch(
    `${apiBaseUrl}/api/crm/contracts/${encodeURIComponent(input.contractId)}/documents`,
    {
      method: "POST",
      body: formData,
      credentials: "include",
    },
  );
  const body = (await response.json().catch(() => ({}))) as {
    error?: string;
    document?: ContractDocumentRecord;
  };

  if (!response.ok || !body.document) {
    throw new Error(body.error || "Não foi possível anexar o PDF assinado.");
  }
  return body.document;
}

export async function downloadContractDocument(input: {
  contractId: string;
  document: Pick<ContractDocumentRecord, "id" | "originalName">;
}) {
  const response = await fetch(
    `${apiBaseUrl}/api/crm/contracts/${encodeURIComponent(input.contractId)}/documents/${encodeURIComponent(input.document.id)}/download`,
    { credentials: "include" },
  );
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(body.error || "Não foi possível baixar o documento.");
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = input.document.originalName || "contrato-assinado.pdf";
  anchor.rel = "noreferrer";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
