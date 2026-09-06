import {
  Check,
  CheckCircle2,
  CircleAlert,
  Download,
  FileCheck2,
  LoaderCircle,
  ReceiptText,
  RotateCcw,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  downloadContractDocument,
  trpc,
  uploadContractDocument,
  type ContractDocumentRecord,
  type ContractRecord,
  type PaymentConfirmationRecord,
} from "./api";

const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024;

const SIGNATURE_METHOD_LABELS = {
  GOV_BR: "Assinatura GOV.br",
  MANUAL: "Assinatura manual digitalizada",
} as const;

const REVIEW_STATUS_META = {
  RECEIVED: {
    label: "Recebido",
    className: "bg-[#fff0c8] text-[#91671b]",
  },
  CONFIRMED: {
    label: "Conferido",
    className: "bg-[#dceee7] text-[#26745f]",
  },
  REJECTED: {
    label: "Revisar",
    className: "bg-[#fbe4df] text-[#b64b3f]",
  },
} as const;

const PAYMENT_METHOD_LABELS = {
  PIX: "Pix",
  BANK_TRANSFER: "Transferência bancária",
  CASH: "Dinheiro",
  CARD_EXTERNAL: "Cartão (externo)",
  OTHER: "Outro",
} as const;

function formatMoney(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDateOnly(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`));
}

function todayIsoDate() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function moneyInputToCents(value: string) {
  const cleaned = value.replace(/[^\d,.-]/g, "");
  const commaIndex = cleaned.lastIndexOf(",");
  const dotIndex = cleaned.lastIndexOf(".");
  let normalized = cleaned;
  if (commaIndex >= 0 && dotIndex >= 0) {
    normalized =
      commaIndex > dotIndex
        ? cleaned.replace(/\./g, "").replace(",", ".")
        : cleaned.replace(/,/g, "");
  } else if (commaIndex >= 0) {
    normalized = cleaned.replace(",", ".");
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

function DialogShell({
  children,
  onClose,
}: {
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-[#173f35]/45 p-3 backdrop-blur-[2px] sm:p-6"
      onMouseDown={(event) => {
        event.stopPropagation();
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="my-auto w-full max-w-xl overflow-hidden rounded-2xl bg-[#fffdfa] shadow-2xl animate-enter"
        onMouseDown={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export function ContractDocumentUploadDialog({
  contract,
  onClose,
  onUploaded,
  onError,
}: {
  contract: ContractRecord;
  onClose: () => void;
  onUploaded: () => void;
  onError: (message: string) => void;
}) {
  const [file, setFile] = useState<File>();
  const [signatureMethod, setSignatureMethod] = useState<"GOV_BR" | "MANUAL">(
    "GOV_BR",
  );
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !saving) onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, saving]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!file) {
      setError("Selecione o PDF assinado recebido do cliente.");
      return;
    }
    if (!/\.pdf$/i.test(file.name)) {
      setError("O arquivo precisa ter extensão PDF.");
      return;
    }
    if (file.size <= 0 || file.size > MAX_DOCUMENT_SIZE_BYTES) {
      setError("O PDF precisa ter entre 1 byte e 10 MB.");
      return;
    }

    setSaving(true);
    try {
      await uploadContractDocument({
        contractId: contract.id,
        file,
        signatureMethod,
        notes,
      });
      onUploaded();
      onClose();
    } catch (caught) {
      const message =
        caught instanceof Error
          ? caught.message
          : "Não foi possível anexar o PDF assinado.";
      setError(message);
      onError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <DialogShell onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <header className="flex items-center justify-between border-b border-[#d9d8d0] px-5 py-4 sm:px-7">
          <div>
            <p className="m-0 text-xs font-bold uppercase tracking-[0.14em] text-[#26745f]">
              Contrato {contract.number}
            </p>
            <h3 className="font-display m-0 mt-1 text-xl font-bold text-[#173f35]">
              Anexar PDF assinado
            </h3>
          </div>
          <button
            className="focus-ring grid size-10 place-items-center rounded-xl border border-[#d9d8d0] hover:bg-[#eeebe3]"
            type="button"
            onClick={onClose}
            aria-label="Fechar"
          >
            <X className="size-5" />
          </button>
        </header>

        <div className="space-y-4 px-5 py-5 sm:px-7">
          <div className="rounded-xl border border-[#b8c0bd] bg-[#e3f0e8]/55 px-4 py-3 text-sm leading-6 text-[#46545e]">
            O arquivo é uma nova versão de evidência do contrato assinado fora
            do CRM. Anexar ou conferir este documento não altera a etapa do
            atendimento.
          </div>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-[#707b81]">
              Arquivo PDF
            </span>
            <input
              className="focus-ring block w-full rounded-xl border border-[#d9d8d0] bg-white px-3 py-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-[#e3f0e8] file:px-3 file:py-2 file:text-xs file:font-bold file:text-[#26745f]"
              type="file"
              accept="application/pdf,.pdf"
              onChange={(event) => setFile(event.target.files?.[0])}
            />
            <span className="mt-1.5 block text-xs text-[#707b81]">
              Somente PDF, até 10 MB. O nome original será preservado no histórico.
            </span>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-[#707b81]">
              Como o cliente assinou?
            </span>
            <select
              className="focus-ring h-11 w-full rounded-xl border border-[#d9d8d0] bg-white px-3 text-sm outline-none"
              value={signatureMethod}
              onChange={(event) =>
                setSignatureMethod(event.target.value as "GOV_BR" | "MANUAL")
              }
            >
              <option value="GOV_BR">Assinatura eletrônica pelo GOV.br</option>
              <option value="MANUAL">Impressão, assinatura manual e digitalização</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-[#707b81]">
              Observações (opcional)
            </span>
            <textarea
              className="focus-ring min-h-24 w-full resize-y rounded-xl border border-[#d9d8d0] bg-white p-3 text-sm outline-none"
              maxLength={2000}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Ex.: recebido pelo WhatsApp em 04/09/2026"
            />
          </label>

          {error && (
            <p className="rounded-xl bg-[#fbe4df] px-4 py-3 text-sm text-[#b64b3f]" role="alert">
              {error}
            </p>
          )}
        </div>

        <footer className="flex items-center justify-end gap-3 border-t border-[#d9d8d0] px-5 py-4 sm:px-7">
          <button
            className="focus-ring h-11 rounded-xl px-4 text-sm font-bold text-[#46545e] hover:bg-[#eeebe3]"
            type="button"
            onClick={onClose}
            disabled={saving}
          >
            Cancelar
          </button>
          <button
            className="focus-ring flex h-11 items-center gap-2 rounded-xl bg-[#2fbf73] px-5 text-sm font-bold text-[#173f35] hover:bg-[#27aa65] disabled:cursor-wait disabled:opacity-60"
            type="submit"
            disabled={saving}
          >
            {saving ? <LoaderCircle className="size-4 animate-spin" /> : <Upload className="size-4" />}
            Anexar documento
          </button>
        </footer>
      </form>
    </DialogShell>
  );
}

export function PaymentConfirmationDialog({
  contract,
  onClose,
  onSaved,
  onError,
}: {
  contract: ContractRecord;
  onClose: () => void;
  onSaved: () => void;
  onError: (message: string) => void;
}) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"PIX" | "BANK_TRANSFER" | "CASH" | "CARD_EXTERNAL" | "OTHER">("PIX");
  const [paidAt, setPaidAt] = useState(todayIsoDate);
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !saving) onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, saving]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    const amountCents = moneyInputToCents(amount);
    if (amountCents <= 0) {
      setError("Informe um valor de pagamento maior que zero.");
      return;
    }
    if (!paidAt) {
      setError("Informe a data em que o pagamento foi confirmado.");
      return;
    }

    setSaving(true);
    try {
      await trpc.crm.paymentConfirmations.create.mutate({
        contractId: contract.id,
        amountCents,
        method,
        paidAt,
        reference: reference.trim() || null,
        notes: notes.trim() || null,
      });
      onSaved();
      onClose();
    } catch (caught) {
      const message =
        caught instanceof Error
          ? caught.message
          : "Não foi possível registrar o pagamento.";
      setError(message);
      onError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <DialogShell onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <header className="flex items-center justify-between border-b border-[#d9d8d0] px-5 py-4 sm:px-7">
          <div>
            <p className="m-0 text-xs font-bold uppercase tracking-[0.14em] text-[#26745f]">
              Registro manual · Contrato {contract.number}
            </p>
            <h3 className="font-display m-0 mt-1 text-xl font-bold text-[#173f35]">
              Confirmar pagamento
            </h3>
          </div>
          <button
            className="focus-ring grid size-10 place-items-center rounded-xl border border-[#d9d8d0] hover:bg-[#eeebe3]"
            type="button"
            onClick={onClose}
            aria-label="Fechar"
          >
            <X className="size-5" />
          </button>
        </header>

        <div className="space-y-4 px-5 py-5 sm:px-7">
          <div className="rounded-xl border border-[#b8c0bd] bg-[#e3f0e8]/55 px-4 py-3 text-sm leading-6 text-[#46545e]">
            Registre aqui uma confirmação feita fora do aplicativo. O lançamento
            é apenas organizacional e não libera, bloqueia ou muda qualquer etapa.
            O contrato tem valor de {formatMoney(contract.totalCents)}.
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-[#707b81]">
                Valor recebido (R$)
              </span>
              <input
                className="focus-ring h-11 w-full rounded-xl border border-[#d9d8d0] bg-white px-3 text-sm outline-none"
                required
                inputMode="decimal"
                placeholder="0,00"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-[#707b81]">
                Data da confirmação
              </span>
              <input
                className="focus-ring h-11 w-full rounded-xl border border-[#d9d8d0] bg-white px-3 text-sm outline-none"
                required
                type="date"
                value={paidAt}
                onChange={(event) => setPaidAt(event.target.value)}
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-[#707b81]">
              Meio informado pelo cliente
            </span>
            <select
              className="focus-ring h-11 w-full rounded-xl border border-[#d9d8d0] bg-white px-3 text-sm outline-none"
              value={method}
              onChange={(event) =>
                setMethod(
                  event.target.value as
                    | "PIX"
                    | "BANK_TRANSFER"
                    | "CASH"
                    | "CARD_EXTERNAL"
                    | "OTHER",
                )
              }
            >
              {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-[#707b81]">
              Referência (opcional)
            </span>
            <input
              className="focus-ring h-11 w-full rounded-xl border border-[#d9d8d0] bg-white px-3 text-sm outline-none"
              maxLength={160}
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder="Ex.: comprovante enviado no WhatsApp"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-[#707b81]">
              Observações (opcional)
            </span>
            <textarea
              className="focus-ring min-h-24 w-full resize-y rounded-xl border border-[#d9d8d0] bg-white p-3 text-sm outline-none"
              maxLength={2000}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </label>

          {error && (
            <p className="rounded-xl bg-[#fbe4df] px-4 py-3 text-sm text-[#b64b3f]" role="alert">
              {error}
            </p>
          )}
        </div>

        <footer className="flex items-center justify-end gap-3 border-t border-[#d9d8d0] px-5 py-4 sm:px-7">
          <button
            className="focus-ring h-11 rounded-xl px-4 text-sm font-bold text-[#46545e] hover:bg-[#eeebe3]"
            type="button"
            onClick={onClose}
            disabled={saving}
          >
            Cancelar
          </button>
          <button
            className="focus-ring flex h-11 items-center gap-2 rounded-xl bg-[#2fbf73] px-5 text-sm font-bold text-[#173f35] hover:bg-[#27aa65] disabled:cursor-wait disabled:opacity-60"
            type="submit"
            disabled={saving}
          >
            {saving ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}
            Confirmar recebimento
          </button>
        </footer>
      </form>
    </DialogShell>
  );
}

export function PaymentReversalDialog({
  payment,
  onClose,
  onSaved,
  onError,
}: {
  payment: PaymentConfirmationRecord;
  onClose: () => void;
  onSaved: () => void;
  onError: (message: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !saving) onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, saving]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (reason.trim().length < 3) {
      setError("Explique brevemente o motivo do estorno.");
      return;
    }

    setSaving(true);
    try {
      await trpc.crm.paymentConfirmations.reverse.mutate({
        id: payment.id,
        reason: reason.trim(),
      });
      onSaved();
      onClose();
    } catch (caught) {
      const message =
        caught instanceof Error
          ? caught.message
          : "Não foi possível estornar a confirmação.";
      setError(message);
      onError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <DialogShell onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <header className="flex items-center justify-between border-b border-[#d9d8d0] px-5 py-4 sm:px-7">
          <div>
            <p className="m-0 text-xs font-bold uppercase tracking-[0.14em] text-[#b64b3f]">
              Atenção · Registro manual
            </p>
            <h3 className="font-display m-0 mt-1 text-xl font-bold text-[#173f35]">
              Estornar confirmação
            </h3>
          </div>
          <button
            className="focus-ring grid size-10 place-items-center rounded-xl border border-[#d9d8d0] hover:bg-[#eeebe3]"
            type="button"
            onClick={onClose}
            aria-label="Fechar"
          >
            <X className="size-5" />
          </button>
        </header>
        <div className="space-y-4 px-5 py-5 sm:px-7">
          <div className="rounded-xl border border-[#e4b7ad] bg-[#fbe4df]/70 px-4 py-3 text-sm leading-6 text-[#7d4038]">
            O lançamento de {formatMoney(payment.amountCents)} será preservado
            no histórico, mas deixará de compor o total confirmado.
          </div>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-[#707b81]">
              Motivo do estorno
            </span>
            <textarea
              className="focus-ring min-h-28 w-full resize-y rounded-xl border border-[#d9d8d0] bg-white p-3 text-sm outline-none"
              required
              minLength={3}
              maxLength={500}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Ex.: comprovante duplicado"
            />
          </label>
          {error && (
            <p className="rounded-xl bg-[#fbe4df] px-4 py-3 text-sm text-[#b64b3f]" role="alert">
              {error}
            </p>
          )}
        </div>
        <footer className="flex items-center justify-end gap-3 border-t border-[#d9d8d0] px-5 py-4 sm:px-7">
          <button
            className="focus-ring h-11 rounded-xl px-4 text-sm font-bold text-[#46545e] hover:bg-[#eeebe3]"
            type="button"
            onClick={onClose}
            disabled={saving}
          >
            Cancelar
          </button>
          <button
            className="focus-ring flex h-11 items-center gap-2 rounded-xl bg-[#b64b3f] px-5 text-sm font-bold text-white hover:bg-[#9f4035] disabled:cursor-wait disabled:opacity-60"
            type="submit"
            disabled={saving}
          >
            {saving ? <LoaderCircle className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
            Estornar confirmação
          </button>
        </footer>
      </form>
    </DialogShell>
  );
}

export function ContractOperationsPanel({
  contract,
  documents,
  payments,
  confirmedTotalCents,
  onRequestUpload,
  onRequestPayment,
  onRequestReverse,
  onChanged,
  onError,
}: {
  contract: ContractRecord;
  documents: ContractDocumentRecord[];
  payments: PaymentConfirmationRecord[];
  confirmedTotalCents: number;
  onRequestUpload: () => void;
  onRequestPayment: () => void;
  onRequestReverse: (payment: PaymentConfirmationRecord) => void;
  onChanged: () => void;
  onError: (message: string) => void;
}) {
  const [downloadingId, setDownloadingId] = useState<string>();
  const [reviewingId, setReviewingId] = useState<string>();

  async function handleDownload(document: ContractDocumentRecord) {
    setDownloadingId(document.id);
    try {
      await downloadContractDocument({ contractId: contract.id, document });
    } catch (caught) {
      onError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível baixar o documento.",
      );
    } finally {
      setDownloadingId(undefined);
    }
  }

  async function reviewDocument(
    document: ContractDocumentRecord,
    reviewStatus: "RECEIVED" | "CONFIRMED" | "REJECTED",
  ) {
    setReviewingId(document.id);
    try {
      await trpc.crm.contractDocuments.review.mutate({
        id: document.id,
        reviewStatus,
        reviewNotes: null,
      });
      onChanged();
    } catch (caught) {
      onError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível atualizar a conferência.",
      );
    } finally {
      setReviewingId(undefined);
    }
  }

  const balanceCents = contract.totalCents - confirmedTotalCents;

  return (
    <div className="mt-4 space-y-4 border-t border-[#d9d8d0] pt-4">
      <div className="rounded-xl border border-[#b8c0bd] bg-[#eeebe3]/55 px-4 py-3 text-xs leading-5 text-[#46545e]">
        Assinatura e pagamento são referências operacionais. O profissional
        continua livre para conduzir o atendimento, independentemente destes
        registros.
      </div>

      <section className="rounded-xl border border-[#d9d8d0] bg-[#fffdfa] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h4 className="m-0 flex items-center gap-2 text-sm font-bold text-[#173f35]">
              <FileCheck2 className="size-4 text-[#26745f]" /> PDFs assinados recebidos
            </h4>
            <p className="m-0 mt-1 text-xs text-[#707b81]">
              Cada anexo é uma versão imutável; envie uma nova versão se necessário.
            </p>
          </div>
          <button
            className="focus-ring flex shrink-0 items-center gap-1.5 rounded-lg bg-[#173f35] px-3 py-2 text-xs font-bold text-white hover:bg-[#2f6b52]"
            type="button"
            onClick={onRequestUpload}
          >
            <Upload className="size-3.5" /> Anexar PDF
          </button>
        </div>

        {documents.length === 0 ? (
          <div className="mt-3 rounded-lg border border-dashed border-[#b8c0bd] px-3 py-4 text-center text-xs text-[#707b81]">
            Nenhum PDF assinado foi anexado ainda.
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {documents.map((document) => {
              const statusMeta = REVIEW_STATUS_META[document.reviewStatus];
              return (
                <div className="rounded-lg border border-[#d9d8d0] bg-white p-3" key={document.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="m-0 truncate text-sm font-semibold text-[#173f35]" title={document.originalName}>
                        {document.originalName}
                      </p>
                      <p className="m-0 mt-1 text-xs text-[#707b81]">
                        {SIGNATURE_METHOD_LABELS[document.signatureMethod]} · {formatBytes(document.sizeBytes)} · {formatDate(document.uploadedAt)}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${statusMeta.className}`}>
                      {statusMeta.label}
                    </span>
                  </div>
                  {document.notes && (
                    <p className="m-0 mt-2 text-xs leading-5 text-[#46545e]">{document.notes}</p>
                  )}
                  <p className="m-0 mt-2 truncate font-mono text-[10px] text-[#9aa39f]" title={document.sha256}>
                    SHA-256: {document.sha256}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      className="focus-ring flex h-8 items-center gap-1.5 rounded-lg border border-[#d9d8d0] px-2.5 text-xs font-bold text-[#46545e] hover:bg-[#eeebe3] disabled:cursor-wait disabled:opacity-60"
                      type="button"
                      disabled={downloadingId === document.id}
                      onClick={() => void handleDownload(document)}
                    >
                      {downloadingId === document.id ? <LoaderCircle className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
                      Baixar
                    </button>
                    {document.reviewStatus !== "CONFIRMED" && (
                      <button
                        className="focus-ring flex h-8 items-center gap-1.5 rounded-lg bg-[#e3f0e8] px-2.5 text-xs font-bold text-[#26745f] hover:bg-[#d5e9dc] disabled:cursor-wait disabled:opacity-60"
                        type="button"
                        disabled={reviewingId === document.id}
                        onClick={() => void reviewDocument(document, "CONFIRMED")}
                      >
                        {reviewingId === document.id ? <LoaderCircle className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
                        Confirmar conferência
                      </button>
                    )}
                    {document.reviewStatus === "CONFIRMED" ? (
                      <button
                        className="focus-ring flex h-8 items-center gap-1.5 rounded-lg border border-[#d9d8d0] px-2.5 text-xs font-bold text-[#46545e] hover:bg-[#eeebe3] disabled:cursor-wait disabled:opacity-60"
                        type="button"
                        disabled={reviewingId === document.id}
                        onClick={() => void reviewDocument(document, "RECEIVED")}
                      >
                        <RotateCcw className="size-3.5" /> Reabrir conferência
                      </button>
                    ) : (
                      <button
                        className="focus-ring flex h-8 items-center gap-1.5 rounded-lg border border-[#e4b7ad] px-2.5 text-xs font-bold text-[#b64b3f] hover:bg-[#fbe4df] disabled:cursor-wait disabled:opacity-60"
                        type="button"
                        disabled={reviewingId === document.id}
                        onClick={() => void reviewDocument(document, "REJECTED")}
                      >
                        <CircleAlert className="size-3.5" /> Marcar para revisar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-[#d9d8d0] bg-[#fffdfa] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h4 className="m-0 flex items-center gap-2 text-sm font-bold text-[#173f35]">
              <ReceiptText className="size-4 text-[#26745f]" /> Confirmações de pagamento
            </h4>
            <p className="m-0 mt-1 text-xs text-[#707b81]">
              Lançamentos manuais, sem gateway e sem dados de cartão armazenados.
            </p>
          </div>
          <button
            className="focus-ring flex shrink-0 items-center gap-1.5 rounded-lg bg-[#173f35] px-3 py-2 text-xs font-bold text-white hover:bg-[#2f6b52]"
            type="button"
            onClick={onRequestPayment}
          >
            <ReceiptText className="size-3.5" /> Registrar pagamento
          </button>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <div className="rounded-lg bg-[#e3f0e8] px-3 py-2">
            <p className="m-0 text-[11px] font-semibold uppercase tracking-wide text-[#26745f]">Confirmado</p>
            <p className="m-0 mt-1 text-sm font-bold text-[#173f35]">{formatMoney(confirmedTotalCents)}</p>
          </div>
          <div className="rounded-lg bg-[#eeebe3] px-3 py-2">
            <p className="m-0 text-[11px] font-semibold uppercase tracking-wide text-[#707b81]">Valor contratado</p>
            <p className="m-0 mt-1 text-sm font-bold text-[#173f35]">{formatMoney(contract.totalCents)}</p>
          </div>
          <div className={`rounded-lg px-3 py-2 ${balanceCents <= 0 ? "bg-[#dceee7]" : "bg-[#fff0c8]"}`}>
            <p className="m-0 text-[11px] font-semibold uppercase tracking-wide text-[#707b81]">
              {balanceCents < 0 ? "Crédito informado" : "Saldo informativo"}
            </p>
            <p className="m-0 mt-1 text-sm font-bold text-[#173f35]">{formatMoney(Math.abs(balanceCents))}</p>
          </div>
        </div>

        {payments.length === 0 ? (
          <div className="mt-3 rounded-lg border border-dashed border-[#b8c0bd] px-3 py-4 text-center text-xs text-[#707b81]">
            Nenhum pagamento confirmado neste contrato.
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {payments.map((payment) => (
              <div className={`rounded-lg border p-3 ${payment.status === "REVERSED" ? "border-[#e4b7ad] bg-[#fbe4df]/35" : "border-[#d9d8d0] bg-white"}`} key={payment.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="m-0 text-sm font-semibold text-[#173f35]">
                      {formatMoney(payment.amountCents)} · {PAYMENT_METHOD_LABELS[payment.method]}
                    </p>
                    <p className="m-0 mt-1 text-xs text-[#707b81]">
                      Pago em {formatDateOnly(payment.paidAt)} · registrado por {payment.confirmedByEmail}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${payment.status === "REVERSED" ? "bg-[#fbe4df] text-[#b64b3f]" : "bg-[#dceee7] text-[#26745f]"}`}>
                    {payment.status === "REVERSED" ? "Estornado" : "Confirmado"}
                  </span>
                </div>
                {(payment.reference || payment.notes || payment.reversalReason) && (
                  <p className="m-0 mt-2 text-xs leading-5 text-[#46545e]">
                    {[payment.reference, payment.notes, payment.reversalReason ? `Estorno: ${payment.reversalReason}` : null].filter(Boolean).join(" · ")}
                  </p>
                )}
                {payment.status === "CONFIRMED" && (
                  <button
                    className="focus-ring mt-3 flex h-8 items-center gap-1.5 rounded-lg border border-[#e4b7ad] px-2.5 text-xs font-bold text-[#b64b3f] hover:bg-[#fbe4df]"
                    type="button"
                    onClick={() => onRequestReverse(payment)}
                  >
                    <RotateCcw className="size-3.5" /> Estornar
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
