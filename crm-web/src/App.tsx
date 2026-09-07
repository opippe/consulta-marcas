import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Download,
  FileSearch,
  FileText,
  ExternalLink,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Menu,
  MessageCircle,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Send,
  Trash2,
  UserRound,
  UsersRound,
  X,
  XCircle,
} from "lucide-react";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  loadSession,
  publicProposalBaseUrl,
  signIn,
  signOut,
  trpc,
  type LeadDetailOutput,
  type LeadListOutput,
  type LeadStatus,
  type ContractListOutput,
  type ContractRecord,
  type ContractDocumentListOutput,
  type PaymentConfirmationsOutput,
  type PaymentConfirmationRecord,
  type PublicContractOutput,
  type ProposalListOutput,
  type ProposalRecord,
  type PublicProposalOutput,
  type SessionData,
} from "./api";
import { downloadContractPdf } from "./contract-pdf";
import { UsersPage } from "./UsersPage";
import {
  ContractDocumentUploadDialog,
  ContractOperationsPanel,
  PaymentConfirmationDialog,
  PaymentReversalDialog,
} from "./ContractOperations";

const STATUS_META: Record<
  LeadStatus,
  { label: string; shortLabel: string; className: string }
> = {
  NEW: {
    label: "Novo lead",
    shortLabel: "Novos",
    className: "bg-[#e3f0e8] text-[#26745f]",
  },
  CONTACTED: {
    label: "Contato iniciado",
    shortLabel: "Contato",
    className: "bg-[#e8eef1] text-[#46545e]",
  },
  QUALIFIED: {
    label: "Qualificado",
    shortLabel: "Qualificados",
    className: "bg-[#ddf4e6] text-[#167548]",
  },
  PROPOSAL: {
    label: "Proposta enviada",
    shortLabel: "Propostas",
    className: "bg-[#fff0c8] text-[#91671b]",
  },
  WON: {
    label: "Fechado",
    shortLabel: "Fechados",
    className: "bg-[#dceee7] text-[#173f35]",
  },
  LOST: {
    label: "Perdido",
    shortLabel: "Perdidos",
    className: "bg-[#fbe4df] text-[#b64b3f]",
  },
};

const STATUS_ORDER = Object.keys(STATUS_META) as LeadStatus[];
const INTEREST_LABELS = { SEARCH_ONLY: "Somente consulta", REGISTRATION_REQUESTED: "Interesse em registro" } as const;
type LeadItem = LeadListOutput["items"][number];

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function whatsappUrl(value: string) {
  const digits = value.replace(/\D/g, "");
  const international = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${international}`;
}

function formatMoney(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

function formatProposalNumber(value: number) {
  return `P-${String(value).padStart(6, "0")}`;
}

function proposalPublicUrl(token: string) {
  return `${publicProposalBaseUrl}/proposta/${encodeURIComponent(token)}`;
}

function formatContractNumber(value: number) {
  return `C-${String(value).padStart(6, "0")}`;
}

function contractPublicUrl(token: string) {
  return `${publicProposalBaseUrl}/contrato/${encodeURIComponent(token)}`;
}

function decodeProposalToken(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return "";
  }
}

function defaultValidUntil() {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.toISOString().slice(0, 10);
}

function formatDateOnly(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`));
}

function sourceLabel(lead: LeadItem) {
  const source = lead.attribution?.utmSource;
  if (source) return source;
  if (lead.attribution?.gclid) return "Google Ads";
  if (lead.attribution?.fbclid) return "Meta Ads";
  if (lead.attribution?.referralCode) return "Indicação";
  return lead.source === "LANDING_PAGE" ? "Landing page" : lead.source;
}

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative grid size-10 shrink-0 place-items-center rounded-xl bg-[#173f35] text-lg font-bold text-[#fffdfa]">
        55
        <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-[#79b896]" />
      </div>
      {!compact && (
        <div>
          <p className="font-display m-0 text-base font-bold tracking-[-0.02em] text-[#173f35]">
            55 Marcas
          </p>
          <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.17em] text-[#707b81]">
            Operações
          </p>
        </div>
      )}
    </div>
  );
}

function Splash() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#173f35]">
      <div className="flex items-center gap-3 text-[#fffdfa]">
        <LoaderCircle className="size-5 animate-spin" />
        <span className="text-sm font-semibold">Carregando o CRM...</span>
      </div>
    </main>
  );
}

function Login({ onSuccess }: { onSuccess: (session: SessionData) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await signIn(email, password);
      const session = await loadSession();
      if (!session) throw new Error("A sessão não pôde ser iniciada.");
      onSuccess(session);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível entrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-[minmax(360px,0.8fr)_1.2fr]">
      <section className="flex min-h-screen items-center bg-[#fffdfa] px-6 py-10 sm:px-12 lg:px-[clamp(3rem,7vw,7rem)]">
        <div className="mx-auto w-full max-w-md animate-enter">
          <Logo />
          <div className="mt-16">
            <p className="mb-3 text-sm font-bold uppercase tracking-[0.16em] text-[#26745f]">
              Acesso interno
            </p>
            <h1 className="font-display m-0 text-4xl font-bold tracking-[-0.04em] text-[#173f35]">
              Bem-vindo de volta.
            </h1>
            <p className="mt-4 text-base leading-7 text-[#707b81]">
              Entre para acompanhar os novos pedidos de análise e mover oportunidades pelo funil.
            </p>
          </div>

          <form className="mt-10 space-y-5" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#46545e]">
                E-mail
              </span>
              <input
                className="focus-ring h-12 w-full rounded-xl border border-[#d9d8d0] bg-white px-4 text-[#173f35] outline-none transition focus:border-[#79b896]"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="voce@empresa.com"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#46545e]">
                Senha
              </span>
              <input
                className="focus-ring h-12 w-full rounded-xl border border-[#d9d8d0] bg-white px-4 text-[#173f35] outline-none transition focus:border-[#79b896]"
                type="password"
                autoComplete="current-password"
                required
                minLength={10}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Sua senha"
              />
            </label>
            {error && (
              <p className="rounded-xl bg-[#fbe4df] px-4 py-3 text-sm text-[#b64b3f]" role="alert">
                {error}
              </p>
            )}
            <button
              className="focus-ring flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#2fbf73] font-bold text-[#173f35] transition hover:bg-[#27aa65] disabled:cursor-wait disabled:opacity-70"
              type="submit"
              disabled={loading}
            >
              {loading ? <LoaderCircle className="size-5 animate-spin" /> : "Entrar no CRM"}
              {!loading && <ArrowRight className="size-4" />}
            </button>
          </form>
        </div>
      </section>

      <section className="relative hidden overflow-hidden bg-[#173f35] p-12 text-[#fffdfa] lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 size-80 rounded-full border-[48px] border-[#79b896]/10" />
        <div className="relative ml-auto flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-xs font-semibold text-[#d9d6d0]">
          <span className="size-2 rounded-full bg-[#2fbf73]" />
          Operação centralizada
        </div>
        <div className="relative max-w-2xl">
          <Sparkles className="mb-8 size-8 text-[#79b896]" />
          <blockquote className="font-display m-0 text-[clamp(2.2rem,4vw,4.6rem)] font-semibold leading-[1.06] tracking-[-0.045em]">
            Cada consulta já pode nascer como uma oportunidade organizada.
          </blockquote>
          <p className="mt-8 max-w-lg text-lg leading-8 text-[#d9d6d0]">
            Da primeira busca ao pedido no INPI, com contexto e histórico no mesmo lugar.
          </p>
        </div>
        <p className="relative text-xs font-semibold uppercase tracking-[0.15em] text-[#79b896]">
          Você cria. A gente protege.
        </p>
      </section>
    </main>
  );
}

function StatusBadge({ status }: { status: LeadStatus }) {
  const meta = STATUS_META[status];
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${meta.className}`}>
      {meta.label}
    </span>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
  active,
  onClick,
}: {
  label: string;
  value: number;
  icon: typeof UsersRound;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`focus-ring rounded-2xl border p-5 text-left transition hover:-translate-y-0.5 hover:border-[#79b896] ${
        active
          ? "border-[#79b896] bg-[#e3f0e8]"
          : "border-[#d9d8d0] bg-[#fffdfa]"
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-[#707b81]">{label}</span>
        <Icon className="size-4 text-[#26745f]" />
      </div>
      <strong className="font-display mt-4 block text-3xl tracking-[-0.04em] text-[#173f35]">
        {value}
      </strong>
    </button>
  );
}

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className="grid min-h-80 place-items-center p-8 text-center">
      <div>
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#e3f0e8]">
          <FileSearch className="size-6 text-[#26745f]" />
        </div>
        <h3 className="font-display mt-5 text-xl font-bold text-[#173f35]">
          {filtered ? "Nenhum lead neste filtro" : "Os novos leads aparecerão aqui"}
        </h3>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#707b81]">
          {filtered
            ? "Tente outro termo ou selecione uma etapa diferente."
            : "Assim que alguém concluir o formulário após uma consulta, o cadastro entrará automaticamente no CRM."}
        </p>
      </div>
    </div>
  );
}

function InfoCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UserRound;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[#d9d8d0] bg-white p-4">
      <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#e3f0e8]">
        <Icon className="size-4 text-[#26745f]" />
      </div>
      <div className="min-w-0">
        <p className="m-0 text-xs text-[#707b81]">{label}</p>
        <p className="m-0 mt-0.5 truncate text-sm font-bold text-[#173f35]">{value}</p>
      </div>
    </div>
  );
}

function DetailCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#fffdfa] p-4">
      <p className="m-0 text-xs font-semibold uppercase tracking-[0.08em] text-[#707b81]">{label}</p>
      <p className="m-0 mt-1.5 text-sm font-semibold text-[#173f35]">{value}</p>
    </div>
  );
}

type ProposalItemDraft = {
  key: string;
  description: string;
  quantity: number;
  unitPrice: string;
};

const PROPOSAL_STATUS_META: Record<
  ProposalRecord["status"],
  { label: string; className: string }
> = {
  DRAFT: { label: "Rascunho", className: "bg-[#eeebe3] text-[#46545e]" },
  SENT: { label: "Enviada", className: "bg-[#fff0c8] text-[#91671b]" },
  ACCEPTED: { label: "Aceita", className: "bg-[#dceee7] text-[#26745f]" },
  REJECTED: { label: "Recusada", className: "bg-[#fbe4df] text-[#b64b3f]" },
  EXPIRED: { label: "Expirada", className: "bg-[#eeebe3] text-[#707b81]" },
  CANCELED: { label: "Cancelada", className: "bg-[#fbe4df] text-[#b64b3f]" },
};

const CONTRACT_STATUS_META: Record<
  ContractRecord["status"],
  { label: string; className: string }
> = {
  DRAFT: { label: "Rascunho", className: "bg-[#eeebe3] text-[#46545e]" },
  SENT: { label: "Enviado", className: "bg-[#fff0c8] text-[#91671b]" },
  SIGNED: { label: "Assinado externamente", className: "bg-[#dceee7] text-[#26745f]" },
  CANCELED: { label: "Cancelado", className: "bg-[#fbe4df] text-[#b64b3f]" },
  EXPIRED: { label: "Expirado", className: "bg-[#eeebe3] text-[#707b81]" },
};

function moneyInputToCents(value: string) {
  const normalized = value.replace(",", ".");
  const amount = Number(normalized);
  return Number.isFinite(amount) ? Math.round(amount * 100) : 0;
}

function ProposalEditor({
  leadId,
  brandName,
  proposal,
  onClose,
  onSaved,
}: {
  leadId: string;
  brandName: string;
  proposal?: ProposalRecord;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [validUntil, setValidUntil] = useState(
    proposal?.validUntil ?? defaultValidUntil(),
  );
  const [discount, setDiscount] = useState(
    proposal ? (proposal.discountCents / 100).toFixed(2) : "0.00",
  );
  const [notes, setNotes] = useState(proposal?.notes ?? "");
  const [items, setItems] = useState<ProposalItemDraft[]>(
    proposal
      ? proposal.items.map((item) => ({
          key: String(item.id),
          description: item.description,
          quantity: item.quantity,
          unitPrice: (item.unitPriceCents / 100).toFixed(2),
        }))
      : [
          {
            key: crypto.randomUUID(),
            description: `Assessoria para pedido de registro da marca ${brandName}`,
            quantity: 1,
            unitPrice: "",
          },
        ],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const subtotalCents = items.reduce(
    (total, item) =>
      total + item.quantity * moneyInputToCents(item.unitPrice),
    0,
  );
  const discountCents = moneyInputToCents(discount);
  const totalCents = Math.max(0, subtotalCents - discountCents);

  function updateItem(
    key: string,
    field: "description" | "quantity" | "unitPrice",
    value: string | number,
  ) {
    setItems((current) =>
      current.map((item) =>
        item.key === key ? { ...item, [field]: value } : item,
      ),
    );
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (subtotalCents <= 0) {
      setError("Informe ao menos um item com valor maior que zero.");
      return;
    }
    if (discountCents > subtotalCents) {
      setError("O desconto não pode ser maior que o subtotal.");
      return;
    }

    const payload = {
      validUntil,
      discountCents,
      notes: notes.trim() || null,
      items: items.map((item) => ({
        description: item.description.trim(),
        quantity: item.quantity,
        unitPriceCents: moneyInputToCents(item.unitPrice),
      })),
    };

    setSaving(true);
    try {
      if (proposal) {
        await trpc.crm.proposals.updateDraft.mutate({
          id: proposal.id,
          ...payload,
        });
      } else {
        await trpc.crm.proposals.create.mutate({ leadId, ...payload });
      }
      onSaved();
      onClose();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível salvar a proposta.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-[#173f35]/45 p-3 backdrop-blur-[2px] sm:p-6"
      onMouseDown={(event) => {
        event.stopPropagation();
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form
        className="my-auto w-full max-w-3xl overflow-hidden rounded-2xl bg-[#fffdfa] shadow-2xl animate-enter"
        onSubmit={handleSubmit}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-[#d9d8d0] px-5 py-4 sm:px-7">
          <div>
            <p className="m-0 text-xs font-bold uppercase tracking-[0.14em] text-[#26745f]">
              {proposal ? formatProposalNumber(proposal.number) : "Nova proposta"}
            </p>
            <h3 className="font-display m-0 mt-1 text-xl font-bold text-[#173f35]">
              {brandName}
            </h3>
          </div>
          <button
            className="focus-ring grid size-10 place-items-center rounded-xl border border-[#d9d8d0] hover:bg-[#eeebe3]"
            type="button"
            onClick={onClose}
            aria-label="Fechar editor"
          >
            <X className="size-5" />
          </button>
        </header>

        <div className="max-h-[calc(100vh-11rem)] space-y-6 overflow-y-auto px-5 py-5 sm:px-7">
          <section>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h4 className="m-0 text-sm font-bold text-[#173f35]">Serviços e valores</h4>
                <p className="m-0 mt-1 text-xs text-[#707b81]">
                  Separe honorários, taxas e serviços adicionais quando necessário.
                </p>
              </div>
              <button
                className="focus-ring flex shrink-0 items-center gap-1.5 rounded-lg border border-[#b8c0bd] px-3 py-2 text-xs font-bold text-[#26745f] hover:bg-[#e3f0e8]"
                type="button"
                onClick={() =>
                  setItems((current) => [
                    ...current,
                    {
                      key: crypto.randomUUID(),
                      description: "",
                      quantity: 1,
                      unitPrice: "",
                    },
                  ])
                }
              >
                <Plus className="size-3.5" /> Adicionar item
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {items.map((item, index) => (
                <div
                  className="grid gap-3 rounded-xl border border-[#d9d8d0] bg-white p-4 sm:grid-cols-[1fr_90px_140px_36px]"
                  key={item.key}
                >
                  <label>
                    <span className="mb-1.5 block text-xs font-semibold text-[#707b81]">
                      Descrição
                    </span>
                    <input
                      className="focus-ring h-10 w-full rounded-lg border border-[#d9d8d0] px-3 text-sm outline-none"
                      required
                      minLength={3}
                      maxLength={300}
                      value={item.description}
                      onChange={(event) =>
                        updateItem(item.key, "description", event.target.value)
                      }
                    />
                  </label>
                  <label>
                    <span className="mb-1.5 block text-xs font-semibold text-[#707b81]">
                      Qtd.
                    </span>
                    <input
                      className="focus-ring h-10 w-full rounded-lg border border-[#d9d8d0] px-3 text-sm outline-none"
                      type="number"
                      min={1}
                      max={50}
                      required
                      value={item.quantity}
                      onChange={(event) =>
                        updateItem(
                          item.key,
                          "quantity",
                          Math.max(1, Number(event.target.value)),
                        )
                      }
                    />
                  </label>
                  <label>
                    <span className="mb-1.5 block text-xs font-semibold text-[#707b81]">
                      Valor unitário
                    </span>
                    <div className="flex h-10 items-center rounded-lg border border-[#d9d8d0] px-3 focus-within:border-[#79b896]">
                      <span className="mr-1 text-xs text-[#707b81]">R$</span>
                      <input
                        className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none"
                        inputMode="decimal"
                        required
                        value={item.unitPrice}
                        onChange={(event) =>
                          updateItem(item.key, "unitPrice", event.target.value)
                        }
                        placeholder="0,00"
                      />
                    </div>
                  </label>
                  <button
                    className="focus-ring mt-auto grid size-9 place-items-center rounded-lg text-[#b64b3f] hover:bg-[#fbe4df] disabled:cursor-not-allowed disabled:opacity-30"
                    type="button"
                    disabled={items.length === 1}
                    onClick={() =>
                      setItems((current) =>
                        current.filter((currentItem) => currentItem.key !== item.key),
                      )
                    }
                    aria-label={`Remover item ${index + 1}`}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className="mb-1.5 block text-xs font-semibold text-[#707b81]">
                Válida até
              </span>
              <input
                className="focus-ring h-11 w-full rounded-xl border border-[#d9d8d0] bg-white px-3 text-sm outline-none"
                type="date"
                required
                value={validUntil}
                onChange={(event) => setValidUntil(event.target.value)}
              />
            </label>
            <label>
              <span className="mb-1.5 block text-xs font-semibold text-[#707b81]">
                Desconto
              </span>
              <div className="flex h-11 items-center rounded-xl border border-[#d9d8d0] bg-white px-3 focus-within:border-[#79b896]">
                <span className="mr-1 text-xs text-[#707b81]">R$</span>
                <input
                  className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none"
                  inputMode="decimal"
                  value={discount}
                  onChange={(event) => setDiscount(event.target.value)}
                />
              </div>
            </label>
          </section>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-[#707b81]">
              Observações
            </span>
            <textarea
              className="focus-ring min-h-24 w-full resize-y rounded-xl border border-[#d9d8d0] bg-white p-3 text-sm outline-none"
              maxLength={2000}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Condições, escopo ou informações importantes para o cliente."
            />
          </label>

          <div className="rounded-2xl bg-[#e3f0e8] p-5">
            <div className="flex justify-between text-sm text-[#46545e]">
              <span>Subtotal</span>
              <span>{formatMoney(subtotalCents)}</span>
            </div>
            {discountCents > 0 && (
              <div className="mt-2 flex justify-between text-sm text-[#46545e]">
                <span>Desconto</span>
                <span>- {formatMoney(discountCents)}</span>
              </div>
            )}
            <div className="mt-4 flex items-end justify-between border-t border-[#79b896]/50 pt-4">
              <strong className="text-sm text-[#173f35]">Total da proposta</strong>
              <strong className="font-display text-2xl text-[#173f35]">
                {formatMoney(totalCents)}
              </strong>
            </div>
          </div>

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
          >
            Cancelar
          </button>
          <button
            className="focus-ring flex h-11 items-center gap-2 rounded-xl bg-[#2fbf73] px-5 text-sm font-bold text-[#173f35] hover:bg-[#27aa65] disabled:cursor-wait disabled:opacity-60"
            type="submit"
            disabled={saving}
          >
            {saving && <LoaderCircle className="size-4 animate-spin" />}
            Salvar rascunho
          </button>
        </footer>
      </form>
    </div>
  );
}

function ContractEditor({
  contract,
  onClose,
  onSaved,
}: {
  contract: ContractRecord;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(contract.title);
  const [content, setContent] = useState(contract.content);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const nextTitle = title.trim();
    const nextContent = content.trim();
    setError("");

    if (nextTitle.length < 10) {
      setError("O título precisa ter pelo menos 10 caracteres.");
      return;
    }
    if (nextContent.length < 80) {
      setError("O conteúdo precisa ter pelo menos 80 caracteres.");
      return;
    }

    setSaving(true);
    try {
      await trpc.crm.contracts.updateDraft.mutate({
        id: contract.id,
        title: nextTitle,
        content: nextContent,
      });
      onSaved();
      onClose();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível salvar o contrato.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-[#173f35]/45 p-3 backdrop-blur-[2px] sm:p-6"
      onMouseDown={(event) => {
        event.stopPropagation();
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form
        className="my-auto w-full max-w-4xl overflow-hidden rounded-2xl bg-[#fffdfa] shadow-2xl animate-enter"
        onSubmit={handleSubmit}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-[#d9d8d0] px-5 py-4 sm:px-7">
          <div>
            <p className="m-0 text-xs font-bold uppercase tracking-[0.14em] text-[#26745f]">
              {formatContractNumber(contract.number)} · Rascunho
            </p>
            <h3 className="font-display m-0 mt-1 text-xl font-bold text-[#173f35]">
              Editar contrato
            </h3>
          </div>
          <button
            className="focus-ring grid size-10 place-items-center rounded-xl border border-[#d9d8d0] hover:bg-[#eeebe3]"
            type="button"
            onClick={onClose}
            aria-label="Fechar editor"
          >
            <X className="size-5" />
          </button>
        </header>

        <div className="max-h-[calc(100vh-11rem)] space-y-5 overflow-y-auto px-5 py-5 sm:px-7">
          <div className="rounded-xl border border-[#b8c0bd] bg-[#e3f0e8]/55 px-4 py-3 text-sm leading-6 text-[#46545e]">
            Edite livremente o instrumento antes do primeiro envio. Depois que o
            contrato for enviado, ele fica bloqueado para preservar o conteúdo
            que o cliente recebeu.
          </div>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-[#707b81]">
              Título do documento
            </span>
            <input
              className="focus-ring h-11 w-full rounded-xl border border-[#d9d8d0] bg-white px-3 text-sm outline-none"
              required
              minLength={10}
              maxLength={200}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>

          <label className="block">
            <div className="flex items-center justify-between gap-3">
              <span className="mb-1.5 block text-xs font-semibold text-[#707b81]">
                Conteúdo do contrato
              </span>
              <span className="text-[11px] text-[#707b81]">
                {content.length.toLocaleString("pt-BR")} / 40.000
              </span>
            </div>
            <textarea
              className="focus-ring min-h-[32rem] w-full resize-y rounded-xl border border-[#d9d8d0] bg-white p-4 font-mono text-[13px] leading-6 text-[#173f35] outline-none"
              required
              minLength={80}
              maxLength={40_000}
              value={content}
              onChange={(event) => setContent(event.target.value)}
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
          >
            Cancelar
          </button>
          <button
            className="focus-ring flex h-11 items-center gap-2 rounded-xl bg-[#2fbf73] px-5 text-sm font-bold text-[#173f35] hover:bg-[#27aa65] disabled:cursor-wait disabled:opacity-60"
            type="submit"
            disabled={saving}
          >
            {saving && <LoaderCircle className="size-4 animate-spin" />}
            Salvar contrato
          </button>
        </footer>
      </form>
    </div>
  );
}

function LeadDrawer({
  leadId,
  onClose,
  onChanged,
}: {
  leadId: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [data, setData] = useState<LeadDetailOutput>();
  const [proposalList, setProposalList] = useState<ProposalListOutput>([]);
  const [contractList, setContractList] = useState<ContractListOutput>([]);
  const [documentList, setDocumentList] = useState<ContractDocumentListOutput>([]);
  const [paymentData, setPaymentData] = useState<PaymentConfirmationsOutput>({
    items: [],
    confirmedTotalCents: 0,
  });
  const [proposalEditor, setProposalEditor] = useState<{
    proposal?: ProposalRecord;
  }>();
  const [contractEditor, setContractEditor] = useState<ContractRecord>();
  const [documentUploadContract, setDocumentUploadContract] =
    useState<ContractRecord>();
  const [paymentContract, setPaymentContract] = useState<ContractRecord>();
  const [paymentToReverse, setPaymentToReverse] =
    useState<PaymentConfirmationRecord>();
  const [sendingProposalId, setSendingProposalId] = useState<string>();
  const [sendingContractId, setSendingContractId] = useState<string>();
  const [generatingPdfId, setGeneratingPdfId] = useState<string>();
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const loadDetail = useCallback(async () => {
    setError("");
    try {
      const [
        leadDetail,
        savedProposals,
        savedContracts,
        savedDocuments,
        savedPayments,
      ] = await Promise.all([
        trpc.crm.leads.detail.query({ id: leadId }),
        trpc.crm.proposals.listByLead.query({ leadId }),
        trpc.crm.contracts.listByLead.query({ leadId }),
        trpc.crm.contractDocuments.listByLead.query({ leadId }),
        trpc.crm.paymentConfirmations.listByLead.query({ leadId }),
      ]);
      setData(leadDetail);
      setProposalList(savedProposals);
      setContractList(savedContracts);
      setDocumentList(savedDocuments);
      setPaymentData(savedPayments);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível carregar o lead.");
    }
  }, [leadId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadDetail(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadDetail]);

  useEffect(() => {
    if (
      proposalEditor ||
      contractEditor ||
      documentUploadContract ||
      paymentContract ||
      paymentToReverse
    ) {
      return;
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    contractEditor,
    documentUploadContract,
    onClose,
    paymentContract,
    paymentToReverse,
    proposalEditor,
  ]);

  async function updateStatus(status: LeadStatus) {
    if (!data || status === data.lead.status) return;
    setSaving(true);
    try {
      await trpc.crm.leads.updateStatus.mutate({ id: leadId, status });
      await loadDetail();
      onChanged();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível atualizar a etapa.");
    } finally {
      setSaving(false);
    }
  }

  async function sendProposal(proposal: ProposalRecord) {
    if (!data) return;
    const popup = window.open("about:blank", "_blank");
    if (!popup) {
      setError("Permita pop-ups neste site para abrir o WhatsApp.");
      return;
    }

    setSendingProposalId(proposal.id);
    setError("");
    try {
      const sent = await trpc.crm.proposals.markSent.mutate({
        id: proposal.id,
      });
      const message = [
        `Olá, ${data.lead.contactName}!`,
        "",
        `Preparei a proposta ${formatProposalNumber(sent.number)} para o registro da marca *${data.lead.brandName}*.`,
        `Valor total: *${formatMoney(sent.totalCents)}*.`,
        `Condição válida até ${formatDateOnly(sent.validUntil)}.`,
        "",
        "Você pode visualizar e responder à proposta neste link:",
        proposalPublicUrl(sent.publicToken),
        "",
        "Se preferir, posso te explicar os próximos passos por aqui.",
      ].join("\n");
      popup.opener = null;
      popup.location.href = `${whatsappUrl(data.lead.whatsapp)}?text=${encodeURIComponent(message)}`;
      await loadDetail();
      onChanged();
    } catch (caught) {
      popup.close();
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível preparar o envio.",
      );
    } finally {
      setSendingProposalId(undefined);
    }
  }

  async function openPublicProposal(proposal: ProposalRecord) {
    const popup = window.open("about:blank", "_blank");
    if (!popup) {
      setError("Permita pop-ups neste site para abrir a proposta.");
      return;
    }

    setSendingProposalId(proposal.id);
    setError("");
    try {
      const result = await trpc.crm.proposals.getPublicLink.mutate({
        id: proposal.id,
      });
      popup.opener = null;
      popup.location.href = proposalPublicUrl(result.publicToken);
    } catch (caught) {
      popup.close();
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível abrir a proposta.",
      );
    } finally {
      setSendingProposalId(undefined);
    }
  }

  async function sendContract(contract: ContractRecord) {
    if (!data) return;
    const popup = window.open("about:blank", "_blank");
    if (!popup) {
      setError("Permita pop-ups neste site para abrir o WhatsApp.");
      return;
    }

    setSendingContractId(contract.id);
    setError("");
    try {
      const sent = await trpc.crm.contracts.sendContract.mutate({
        id: contract.id,
      });
      const message = [
        `Olá, ${data.lead.contactName}!`,
        "",
        `O contrato ${formatContractNumber(sent.number)} para o registro da marca *${data.lead.brandName}* está pronto.`,
        `Valor total: *${formatMoney(sent.totalCents)}*.`,
        "",
        "Leia o contrato e baixe o PDF para assinatura pelo GOV.br ou manual:",
        contractPublicUrl(sent.publicToken),
        "",
        "Se precisar de ajuda, estou à disposição por aqui.",
      ].join("\n");
      popup.opener = null;
      popup.location.href = `${whatsappUrl(data.lead.whatsapp)}?text=${encodeURIComponent(message)}`;
      await loadDetail();
      onChanged();
    } catch (caught) {
      popup.close();
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível preparar o envio do contrato.",
      );
    } finally {
      setSendingContractId(undefined);
    }
  }

  async function openPublicContract(contract: ContractRecord) {
    const popup = window.open("about:blank", "_blank");
    if (!popup) {
      setError("Permita pop-ups neste site para abrir o contrato.");
      return;
    }

    setSendingContractId(contract.id);
    setError("");
    try {
      const result = await trpc.crm.contracts.getPublicLink.mutate({
        id: contract.id,
      });
      popup.opener = null;
      popup.location.href = contractPublicUrl(result.publicToken);
    } catch (caught) {
      popup.close();
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível abrir o contrato.",
      );
    } finally {
      setSendingContractId(undefined);
    }
  }

  async function downloadContract(contract: ContractRecord) {
    if (!data) return;
    setGeneratingPdfId(contract.id);
    setError("");
    try {
      await downloadContractPdf(
        {
          number: contract.number,
          title: contract.title,
          content: contract.content,
          contactName: data.lead.contactName,
          brandName: data.lead.brandName,
          segment: data.lead.segment,
          totalCents: contract.totalCents,
          validUntil: contract.validUntil,
          createdAt: contract.createdAt,
        },
        `contrato-${formatContractNumber(contract.number)}.pdf`,
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível gerar o PDF do contrato.",
      );
    } finally {
      setGeneratingPdfId(undefined);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[#173f35]/30 backdrop-blur-[2px]" onMouseDown={onClose}>
      <aside
        className="h-full w-full max-w-2xl overflow-y-auto bg-[#fffdfa] shadow-2xl animate-enter"
        onMouseDown={(event) => event.stopPropagation()}
        aria-label="Detalhes do lead"
      >
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-[#d9d8d0] bg-[#fffdfa]/95 px-5 py-4 backdrop-blur sm:px-8">
          <div>
            <p className="m-0 text-xs font-bold uppercase tracking-[0.14em] text-[#26745f]">
              Detalhes da oportunidade
            </p>
            <h2 className="font-display m-0 mt-1 text-xl font-bold text-[#173f35]">
              {data?.lead.brandName ?? "Carregando..."}
            </h2>
          </div>
          <button className="focus-ring grid size-10 place-items-center rounded-xl border border-[#d9d8d0] hover:bg-[#eeebe3]" onClick={onClose} aria-label="Fechar">
            <X className="size-5" />
          </button>
        </header>

        {error && (
          <p className="mx-5 mt-5 rounded-xl bg-[#fbe4df] px-4 py-3 text-sm text-[#b64b3f] sm:mx-8">
            {error}
          </p>
        )}

        {!data && !error && (
          <div className="grid min-h-80 place-items-center">
            <LoaderCircle className="size-6 animate-spin text-[#26745f]" />
          </div>
        )}

        {data && (
          <div className="space-y-8 px-5 py-6 sm:px-8">
            <section className="rounded-2xl bg-[#173f35] p-5 text-[#fffdfa]">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="m-0 text-sm text-[#d9d6d0]">Etapa atual</p>
                  <p className="font-display m-0 mt-1 text-2xl font-bold">
                    {STATUS_META[data.lead.status].label}
                  </p>
                </div>
                <select
                  className="focus-ring h-10 rounded-xl border border-white/20 bg-white/10 px-3 text-sm font-bold text-white"
                  value={data.lead.status}
                  disabled={saving}
                  onChange={(event) => void updateStatus(event.target.value as LeadStatus)}
                >
                  {STATUS_ORDER.map((status) => (
                    <option className="text-[#173f35]" value={status} key={status}>
                      {STATUS_META[status].label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mt-5 flex items-center gap-2 text-xs text-[#79b896]">
                {saving ? <LoaderCircle className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                Toda mudança fica registrada no histórico
              </div>
            </section>

            <section>
              <h3 className="font-display m-0 text-lg font-bold text-[#173f35]">Contato</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <InfoCard icon={UserRound} label="Nome" value={data.lead.contactName} />
                <InfoCard icon={MessageCircle} label="WhatsApp" value={data.lead.whatsapp} />
              </div>
              <a
                className="focus-ring mt-3 flex h-11 items-center justify-center gap-2 rounded-xl bg-[#2fbf73] text-sm font-bold text-[#173f35] transition hover:bg-[#27aa65]"
                href={whatsappUrl(data.lead.whatsapp)}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle className="size-4" />
                Conversar pelo WhatsApp
              </a>
            </section>

            <section>
              <h3 className="font-display m-0 text-lg font-bold text-[#173f35]">Intenção de registro</h3>
              <div className="mt-4 grid gap-px overflow-hidden rounded-2xl border border-[#d9d8d0] bg-[#d9d8d0] sm:grid-cols-2">
                <DetailCell label="Marca" value={data.lead.brandName} />
                <DetailCell label="Segmento" value={data.lead.segment} />
                <DetailCell label="Localização" value={[data.lead.city, data.lead.state].filter(Boolean).join(" / ") || "Não informado"} />
                <DetailCell label="Possui CNPJ" value={data.lead.hasCnpj == null ? "Não informado" : data.lead.hasCnpj ? "Sim" : "Não"} />
                <DetailCell label="Tentativa anterior" value={data.lead.previousAttempt == null ? "Não informado" : data.lead.previousAttempt ? "Sim" : "Não"} />
                <DetailCell label="Origem" value={sourceLabel(data.lead)} />
                <DetailCell label="Interesse" value={INTEREST_LABELS[data.lead.interest]} />
              </div>
            </section>

            <section>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-display m-0 text-lg font-bold text-[#173f35]">
                    Propostas
                  </h3>
                  <p className="m-0 mt-1 text-sm text-[#707b81]">
                    Valores e condições comerciais deste atendimento.
                  </p>
                </div>
                <button
                  className="focus-ring flex shrink-0 items-center gap-1.5 rounded-xl bg-[#173f35] px-3.5 py-2.5 text-xs font-bold text-white hover:bg-[#2f6b52]"
                  onClick={() => setProposalEditor({})}
                >
                  <Plus className="size-3.5" /> Nova proposta
                </button>
              </div>

              {proposalList.length === 0 ? (
                <div className="mt-4 rounded-2xl border border-dashed border-[#b8c0bd] bg-[#eeebe3]/50 p-5 text-center">
                  <FileText className="mx-auto size-5 text-[#26745f]" />
                  <p className="m-0 mt-2 text-sm font-semibold text-[#46545e]">
                    Nenhuma proposta criada
                  </p>
                  <p className="m-0 mt-1 text-xs text-[#707b81]">
                    Crie um rascunho para definir escopo, valor e validade.
                  </p>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {proposalList.map((proposal) => {
                    const statusMeta = PROPOSAL_STATUS_META[proposal.status];
                    const canSend =
                      proposal.status === "DRAFT" || proposal.status === "SENT";
                    return (
                      <article
                        className="rounded-2xl border border-[#d9d8d0] bg-white p-4"
                        key={proposal.id}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <strong className="text-sm text-[#173f35]">
                                {formatProposalNumber(proposal.number)}
                              </strong>
                              <span
                                className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${statusMeta.className}`}
                              >
                                {statusMeta.label}
                              </span>
                            </div>
                            <p className="m-0 mt-1 text-xs text-[#707b81]">
                              Válida até {formatDateOnly(proposal.validUntil)} ·{" "}
                              {proposal.items.length} item(ns)
                            </p>
                          </div>
                          <strong className="font-display text-lg text-[#173f35]">
                            {formatMoney(proposal.totalCents)}
                          </strong>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2 border-t border-[#d9d8d0] pt-3">
                          {proposal.status === "DRAFT" && (
                            <button
                              className="focus-ring flex h-9 items-center gap-1.5 rounded-lg border border-[#d9d8d0] px-3 text-xs font-bold text-[#46545e] hover:bg-[#eeebe3]"
                              onClick={() =>
                                setProposalEditor({ proposal })
                              }
                            >
                              <Pencil className="size-3.5" /> Editar
                            </button>
                          )}
                          {proposal.status === "SENT" && (
                            <button
                              className="focus-ring flex h-9 items-center gap-1.5 rounded-lg border border-[#d9d8d0] px-3 text-xs font-bold text-[#46545e] hover:bg-[#eeebe3]"
                              disabled={sendingProposalId === proposal.id}
                              onClick={() => void openPublicProposal(proposal)}
                            >
                              <ExternalLink className="size-3.5" />
                              Visualizar
                            </button>
                          )}
                          {canSend && (
                            <button
                              className="focus-ring flex h-9 items-center gap-1.5 rounded-lg bg-[#2fbf73] px-3 text-xs font-bold text-[#173f35] hover:bg-[#27aa65] disabled:cursor-wait disabled:opacity-60"
                              disabled={sendingProposalId === proposal.id}
                              onClick={() => void sendProposal(proposal)}
                            >
                              {sendingProposalId === proposal.id ? (
                                <LoaderCircle className="size-3.5 animate-spin" />
                              ) : (
                                <Send className="size-3.5" />
                              )}
                              {proposal.status === "SENT"
                                ? "Reenviar no WhatsApp"
                                : "Enviar no WhatsApp"}
                            </button>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            <section>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-display m-0 text-lg font-bold text-[#173f35]">
                    Contratos
                  </h3>
                  <p className="m-0 mt-1 text-sm text-[#707b81]">
                    O contrato é gerado automaticamente quando a proposta é aceita.
                  </p>
                </div>
              </div>

              {contractList.length === 0 ? (
                <div className="mt-4 rounded-2xl border border-dashed border-[#b8c0bd] bg-[#eeebe3]/50 p-5 text-center">
                  <FileText className="mx-auto size-5 text-[#26745f]" />
                  <p className="m-0 mt-2 text-sm font-semibold text-[#46545e]">
                    Nenhum contrato gerado
                  </p>
                  <p className="m-0 mt-1 text-xs text-[#707b81]">
                    Depois do aceite comercial, o contrato aparecerá aqui para envio.
                  </p>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {contractList.map((contract) => {
                    const statusMeta = CONTRACT_STATUS_META[contract.status];
                    const canSend =
                      contract.status === "DRAFT" || contract.status === "SENT";
                    const canOpen =
                      contract.status === "SENT" || contract.status === "SIGNED";
                    const canEdit = contract.status === "DRAFT";
                    const contractDocuments = documentList.filter(
                      (document) => document.contractId === contract.id,
                    );
                    const contractPayments = paymentData.items.filter(
                      (payment) => payment.contractId === contract.id,
                    );
                    const confirmedTotalCents = contractPayments.reduce(
                      (total, payment) =>
                        total +
                        (payment.status === "CONFIRMED"
                          ? payment.amountCents
                          : 0),
                      0,
                    );
                    return (
                      <article
                        className="rounded-2xl border border-[#d9d8d0] bg-white p-4"
                        key={contract.id}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <strong className="text-sm text-[#173f35]">
                                {formatContractNumber(contract.number)}
                              </strong>
                              <span
                                className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${statusMeta.className}`}
                              >
                                {statusMeta.label}
                              </span>
                            </div>
                            <p className="m-0 mt-1 text-xs text-[#707b81]">
                              Válido até {formatDateOnly(contract.validUntil)}
                            </p>
                          </div>
                          <strong className="font-display text-lg text-[#173f35]">
                            {formatMoney(contract.totalCents)}
                          </strong>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2 border-t border-[#d9d8d0] pt-3">
                          {canEdit && (
                            <button
                              className="focus-ring flex h-9 items-center gap-1.5 rounded-lg border border-[#d9d8d0] px-3 text-xs font-bold text-[#46545e] hover:bg-[#eeebe3]"
                              onClick={() => setContractEditor(contract)}
                            >
                              <Pencil className="size-3.5" /> Editar contrato
                            </button>
                          )}
                          <button
                            className="focus-ring flex h-9 items-center gap-1.5 rounded-lg border border-[#d9d8d0] px-3 text-xs font-bold text-[#46545e] hover:bg-[#eeebe3] disabled:cursor-wait disabled:opacity-60"
                            disabled={generatingPdfId === contract.id}
                            onClick={() => void downloadContract(contract)}
                          >
                            {generatingPdfId === contract.id ? (
                              <LoaderCircle className="size-3.5 animate-spin" />
                            ) : (
                              <FileText className="size-3.5" />
                            )}
                            Baixar PDF
                          </button>
                          {canOpen && (
                            <button
                              className="focus-ring flex h-9 items-center gap-1.5 rounded-lg border border-[#d9d8d0] px-3 text-xs font-bold text-[#46545e] hover:bg-[#eeebe3]"
                              disabled={sendingContractId === contract.id}
                              onClick={() => void openPublicContract(contract)}
                            >
                              <ExternalLink className="size-3.5" />
                              Visualizar contrato
                            </button>
                          )}
                          {canSend && (
                            <button
                              className="focus-ring flex h-9 items-center gap-1.5 rounded-lg bg-[#2fbf73] px-3 text-xs font-bold text-[#173f35] hover:bg-[#27aa65] disabled:cursor-wait disabled:opacity-60"
                              disabled={sendingContractId === contract.id}
                              onClick={() => void sendContract(contract)}
                            >
                              {sendingContractId === contract.id ? (
                                <LoaderCircle className="size-3.5 animate-spin" />
                              ) : (
                                <Send className="size-3.5" />
                              )}
                              {contract.status === "SENT"
                                ? "Reenviar no WhatsApp"
                                : "Enviar no WhatsApp"}
                            </button>
                          )}
                        </div>
                        <ContractOperationsPanel
                          contract={contract}
                          documents={contractDocuments}
                          payments={contractPayments}
                          confirmedTotalCents={confirmedTotalCents}
                          onRequestUpload={() => setDocumentUploadContract(contract)}
                          onRequestPayment={() => setPaymentContract(contract)}
                          onRequestReverse={(payment) => setPaymentToReverse(payment)}
                          onChanged={() => void loadDetail()}
                          onError={setError}
                        />
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            <section>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h3 className="font-display m-0 text-lg font-bold text-[#173f35]">Consulta ao INPI</h3>
                  <p className="m-0 mt-1 text-sm text-[#707b81]">
                    {data.lead.searchStatus === "FAILED" ? "Pesquisa não concluída — dados do contato recebidos" : `${data.lead.totalResults} resultado(s) localizado(s)`}
                  </p>
                </div>
                <span className="text-xs text-[#707b81]">{formatDate(data.lead.searchedAt)}</span>
              </div>
              <div className="mt-4 space-y-2">
                {data.lead.searchStatus === "FAILED" ? (
                  <p className="text-sm text-[#707b81]">A consulta não foi concluída. Não há resultado disponível para análise.</p>
                ) : data.hits.length === 0 ? (
                  <p className="rounded-xl bg-[#e3f0e8] px-4 py-4 text-sm text-[#26745f]">
                    Nenhuma ocorrência exata foi retornada nesta consulta.
                  </p>
                ) : (
                  data.hits.slice(0, 5).map((hit) => (
                    <div className="rounded-xl border border-[#d9d8d0] bg-white p-4" key={hit.id}>
                      <div className="flex items-start justify-between gap-3">
                        <strong className="text-sm text-[#173f35]">{hit.brandName || "Marca sem nome"}</strong>
                        <span className="shrink-0 text-xs text-[#707b81]">{hit.processNumber || "Sem número"}</span>
                      </div>
                      <p className="m-0 mt-2 text-xs leading-5 text-[#707b81]">
                        {[hit.holderName, hit.niceClass, hit.situation].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section>
              <h3 className="font-display m-0 text-lg font-bold text-[#173f35]">Histórico</h3>
              <div className="mt-4 space-y-0">
                {data.events.map((event, index) => (
                  <div className="grid grid-cols-[18px_1fr] gap-3" key={event.id}>
                    <div className="flex flex-col items-center">
                      <span className="mt-1.5 size-2.5 rounded-full bg-[#79b896]" />
                      {index < data.events.length - 1 && <span className="w-px flex-1 bg-[#d9d8d0]" />}
                    </div>
                    <div className="pb-5">
                      <p className="m-0 text-sm font-semibold text-[#46545e]">
                        {event.type === "LEAD_CAPTURED"
                          ? "Lead capturado pela landing page"
                          : event.type === "REGISTRATION_REQUESTED"
                            ? "Cliente solicitou o registro da marca"
                          : event.type === "PROPOSAL_SENT"
                            ? "Proposta enviada pelo WhatsApp"
                          : event.type === "PROPOSAL_ACCEPTED"
                            ? "Proposta aceita pelo cliente"
                          : event.type === "PROPOSAL_REJECTED"
                            ? "Proposta recusada pelo cliente"
                          : event.type === "CONTRACT_SENT"
                            ? "Contrato enviado pelo WhatsApp"
                          : event.type === "CONTRACT_UPDATED"
                            ? "Contrato atualizado no CRM"
                          : event.type === "CONTRACT_DOCUMENT_UPLOADED"
                            ? "PDF assinado anexado ao contrato"
                          : event.type === "CONTRACT_DOCUMENT_REVIEWED"
                            ? "Documento do contrato revisado"
                          : event.type === "PAYMENT_CONFIRMED"
                            ? "Pagamento confirmado manualmente"
                          : event.type === "PAYMENT_REVERSED"
                            ? "Confirmação de pagamento estornada"
                          : event.type === "STATUS_CHANGED"
                            ? "Etapa comercial atualizada"
                            : event.type}
                      </p>
                      <p className="m-0 mt-1 text-xs text-[#707b81]">{formatDate(event.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </aside>
      {proposalEditor && data && (
        <ProposalEditor
          leadId={leadId}
          brandName={data.lead.brandName}
          proposal={proposalEditor.proposal}
          onClose={() => setProposalEditor(undefined)}
          onSaved={() => void loadDetail()}
        />
      )}
      {contractEditor && (
        <ContractEditor
          contract={contractEditor}
          onClose={() => setContractEditor(undefined)}
          onSaved={() => void loadDetail()}
        />
      )}
      {documentUploadContract && (
        <ContractDocumentUploadDialog
          contract={documentUploadContract}
          onClose={() => setDocumentUploadContract(undefined)}
          onUploaded={() => void loadDetail()}
          onError={setError}
        />
      )}
      {paymentContract && (
        <PaymentConfirmationDialog
          contract={paymentContract}
          onClose={() => setPaymentContract(undefined)}
          onSaved={() => void loadDetail()}
          onError={setError}
        />
      )}
      {paymentToReverse && (
        <PaymentReversalDialog
          payment={paymentToReverse}
          onClose={() => setPaymentToReverse(undefined)}
          onSaved={() => void loadDetail()}
          onError={setError}
        />
      )}
    </div>
  );
}

function PublicProposal({ token }: { token: string }) {
  const [proposal, setProposal] = useState<PublicProposalOutput>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [decision, setDecision] = useState<"ACCEPTED" | "REJECTED">();
  const [signerName, setSignerName] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadProposal = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await trpc.publicProposal.get.query({ token });
      setProposal(result);
      document.title = `${formatProposalNumber(result.number)} | 55 Marcas`;
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível carregar esta proposta.",
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadProposal(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadProposal]);

  async function submitResponse(event: FormEvent) {
    event.preventDefault();
    if (!decision || !confirmed) return;
    setSubmitting(true);
    setError("");
    try {
      await trpc.publicProposal.respond.mutate({
        token,
        decision,
        signerName,
        confirmation: true,
      });
      setDecision(undefined);
      setConfirmed(false);
      await loadProposal();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível registrar sua resposta.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f6f2ea]">
        <div className="flex items-center gap-3 text-[#26745f]">
          <LoaderCircle className="size-5 animate-spin" />
          <span className="text-sm font-semibold">Carregando proposta...</span>
        </div>
      </main>
    );
  }

  if (!proposal) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f6f2ea] px-5">
        <section className="max-w-md rounded-2xl border border-[#d9d8d0] bg-[#fffdfa] p-8 text-center">
          <XCircle className="mx-auto size-10 text-[#b64b3f]" />
          <h1 className="font-display mt-5 text-2xl font-bold text-[#173f35]">
            Proposta indisponível
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#707b81]">
            {error || "Confira o endereço recebido ou solicite um novo link."}
          </p>
        </section>
      </main>
    );
  }

  const statusMeta = PROPOSAL_STATUS_META[proposal.status];
  const responseAccepted = proposal.response?.decision === "ACCEPTED";

  return (
    <main className="proposal-page min-h-screen bg-[#f6f2ea] text-[#173f35]">
      <header className="print-hidden border-b border-[#d9d8d0] bg-[#fffdfa]">
        <div className="mx-auto flex h-20 max-w-5xl items-center justify-between px-5 sm:px-8">
          <Logo />
          <button
            className="focus-ring flex h-10 items-center gap-2 rounded-xl border border-[#b8c0bd] px-3 text-xs font-bold text-[#46545e] hover:bg-[#eeebe3]"
            onClick={() => window.print()}
          >
            <FileText className="size-4" /> Imprimir / salvar PDF
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
        <article className="overflow-hidden rounded-[1.5rem] border border-[#d9d8d0] bg-[#fffdfa] shadow-xl shadow-[#173f35]/5">
          <section className="bg-[#173f35] px-6 py-8 text-[#fffdfa] sm:px-10 sm:py-11">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div>
                <p className="m-0 text-xs font-bold uppercase tracking-[0.16em] text-[#79b896]">
                  Proposta comercial {formatProposalNumber(proposal.number)}
                </p>
                <h1 className="font-display m-0 mt-4 max-w-2xl text-3xl font-bold leading-tight tracking-[-0.04em] sm:text-4xl">
                  Registro da marca {proposal.brandName}
                </h1>
                <p className="m-0 mt-4 text-sm text-[#d9d6d0]">
                  Preparada para {proposal.contactName}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1.5 text-xs font-bold ${statusMeta.className}`}
              >
                {statusMeta.label}
              </span>
            </div>
          </section>

          <div className="space-y-9 px-6 py-8 sm:px-10 sm:py-10">
            <section className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-[#e3f0e8] p-4">
                <CalendarDays className="size-4 text-[#26745f]" />
                <p className="m-0 mt-3 text-xs font-semibold uppercase tracking-[0.08em] text-[#707b81]">
                  Validade
                </p>
                <p className="m-0 mt-1 text-sm font-bold">
                  {formatDateOnly(proposal.validUntil)}
                </p>
              </div>
              <div className="rounded-xl bg-[#eeebe3] p-4">
                <FileSearch className="size-4 text-[#26745f]" />
                <p className="m-0 mt-3 text-xs font-semibold uppercase tracking-[0.08em] text-[#707b81]">
                  Segmento
                </p>
                <p className="m-0 mt-1 text-sm font-bold">{proposal.segment}</p>
              </div>
              <div className="rounded-xl bg-[#ddf4e6] p-4">
                <ShieldCheck className="size-4 text-[#26745f]" />
                <p className="m-0 mt-3 text-xs font-semibold uppercase tracking-[0.08em] text-[#707b81]">
                  Responsável
                </p>
                <p className="m-0 mt-1 text-sm font-bold">55 Marcas</p>
              </div>
            </section>

            <section>
              <h2 className="font-display m-0 text-xl font-bold">Escopo e investimento</h2>
              <div className="mt-4 overflow-hidden rounded-2xl border border-[#d9d8d0]">
                <div className="hidden grid-cols-[1fr_80px_140px_140px] bg-[#eeebe3] px-4 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-[#707b81] sm:grid">
                  <span>Item</span>
                  <span className="text-center">Qtd.</span>
                  <span className="text-right">Unitário</span>
                  <span className="text-right">Total</span>
                </div>
                <div className="divide-y divide-[#d9d8d0]">
                  {proposal.items.map((item) => (
                    <div
                      className="grid gap-2 px-4 py-4 text-sm sm:grid-cols-[1fr_80px_140px_140px] sm:items-center"
                      key={item.id}
                    >
                      <strong className="font-semibold">{item.description}</strong>
                      <span className="text-[#707b81] sm:text-center">
                        <span className="sm:hidden">Quantidade: </span>
                        {item.quantity}
                      </span>
                      <span className="text-[#707b81] sm:text-right">
                        {formatMoney(item.unitPriceCents)}
                      </span>
                      <strong className="sm:text-right">
                        {formatMoney(item.quantity * item.unitPriceCents)}
                      </strong>
                    </div>
                  ))}
                </div>
              </div>

              <div className="ml-auto mt-5 max-w-sm space-y-2">
                <div className="flex justify-between text-sm text-[#707b81]">
                  <span>Subtotal</span>
                  <span>{formatMoney(proposal.subtotalCents)}</span>
                </div>
                {proposal.discountCents > 0 && (
                  <div className="flex justify-between text-sm text-[#707b81]">
                    <span>Desconto</span>
                    <span>- {formatMoney(proposal.discountCents)}</span>
                  </div>
                )}
                <div className="flex items-end justify-between border-t border-[#d9d8d0] pt-3">
                  <strong>Total</strong>
                  <strong className="font-display text-2xl">
                    {formatMoney(proposal.totalCents)}
                  </strong>
                </div>
              </div>
            </section>

            {proposal.notes && (
              <section className="rounded-2xl border border-[#d9d8d0] bg-[#eeebe3]/55 p-5">
                <h2 className="m-0 text-sm font-bold">Condições e observações</h2>
                <p className="m-0 mt-2 whitespace-pre-wrap text-sm leading-6 text-[#46545e]">
                  {proposal.notes}
                </p>
              </section>
            )}

            <section className="print-hidden border-t border-[#d9d8d0] pt-8">
              {proposal.response ? (
                <div
                  className={`rounded-2xl p-6 text-center ${
                    responseAccepted ? "bg-[#dceee7]" : "bg-[#fbe4df]"
                  }`}
                >
                  {responseAccepted ? (
                    <CheckCircle2 className="mx-auto size-9 text-[#26745f]" />
                  ) : (
                    <XCircle className="mx-auto size-9 text-[#b64b3f]" />
                  )}
                  <h2 className="font-display m-0 mt-4 text-2xl font-bold">
                    Proposta {responseAccepted ? "aceita" : "recusada"}
                  </h2>
                  <p className="m-0 mt-2 text-sm text-[#46545e]">
                    Resposta registrada por {proposal.response.signerName} em{" "}
                    {formatDate(proposal.response.createdAt)}.
                  </p>
                </div>
              ) : proposal.canRespond ? (
                decision ? (
                  <form
                    className="rounded-2xl border border-[#d9d8d0] bg-[#eeebe3]/40 p-5 sm:p-6"
                    onSubmit={submitResponse}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="m-0 text-xs font-bold uppercase tracking-[0.12em] text-[#26745f]">
                          Confirmação
                        </p>
                        <h2 className="font-display m-0 mt-1 text-xl font-bold">
                          {decision === "ACCEPTED"
                            ? "Aceitar esta proposta"
                            : "Recusar esta proposta"}
                        </h2>
                      </div>
                      <button
                        className="grid size-9 place-items-center rounded-lg hover:bg-[#d9d8d0]"
                        type="button"
                        onClick={() => setDecision(undefined)}
                        aria-label="Cancelar resposta"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                    <label className="mt-5 block">
                      <span className="mb-2 block text-sm font-semibold">
                        Seu nome completo
                      </span>
                      <input
                        className="focus-ring h-11 w-full rounded-xl border border-[#d9d8d0] bg-white px-3 text-sm outline-none"
                        required
                        minLength={3}
                        maxLength={160}
                        value={signerName}
                        onChange={(event) => setSignerName(event.target.value)}
                      />
                    </label>
                    <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm leading-6 text-[#46545e]">
                      <input
                        className="mt-1 size-4 accent-[#167548]"
                        type="checkbox"
                        required
                        checked={confirmed}
                        onChange={(event) => setConfirmed(event.target.checked)}
                      />
                      <span>
                        {decision === "ACCEPTED"
                          ? "Declaro que li os itens, valores e condições e confirmo meu aceite comercial desta proposta."
                          : "Declaro que li a proposta e confirmo que não desejo prosseguir nestas condições."}
                      </span>
                    </label>
                    <p className="mt-4 text-xs leading-5 text-[#707b81]">
                      Esta confirmação registra a decisão comercial e não substitui o contrato de prestação de serviços.
                    </p>
                    <button
                      className={`focus-ring mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold disabled:cursor-wait disabled:opacity-60 ${
                        decision === "ACCEPTED"
                          ? "bg-[#2fbf73] text-[#173f35] hover:bg-[#27aa65]"
                          : "bg-[#b64b3f] text-white hover:bg-[#9d4037]"
                      }`}
                      disabled={submitting || !confirmed}
                    >
                      {submitting && <LoaderCircle className="size-4 animate-spin" />}
                      Confirmar {decision === "ACCEPTED" ? "aceite" : "recusa"}
                    </button>
                  </form>
                ) : (
                  <div className="rounded-2xl bg-[#173f35] p-6 text-center text-white sm:p-8">
                    <ShieldCheck className="mx-auto size-7 text-[#79b896]" />
                    <h2 className="font-display m-0 mt-4 text-2xl font-bold">
                      Pronto para proteger sua marca?
                    </h2>
                    <p className="mx-auto mb-0 mt-3 max-w-lg text-sm leading-6 text-[#d9d6d0]">
                      Registre sua decisão abaixo. Você ainda receberá o contrato antes do início do serviço.
                    </p>
                    <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                      <button
                        className="focus-ring flex h-11 items-center justify-center gap-2 rounded-xl bg-[#2fbf73] px-5 text-sm font-bold text-[#173f35] hover:bg-[#27aa65]"
                        onClick={() => setDecision("ACCEPTED")}
                      >
                        <CheckCircle2 className="size-4" /> Aceitar proposta
                      </button>
                      <button
                        className="focus-ring h-11 rounded-xl border border-white/20 px-5 text-sm font-bold text-white hover:bg-white/10"
                        onClick={() => setDecision("REJECTED")}
                      >
                        Não quero prosseguir
                      </button>
                    </div>
                  </div>
                )
              ) : (
                <div className="rounded-2xl bg-[#eeebe3] p-6 text-center">
                  <h2 className="font-display m-0 text-xl font-bold">
                    Esta proposta não aceita mais respostas
                  </h2>
                  <p className="m-0 mt-2 text-sm text-[#707b81]">
                    Solicite uma condição atualizada à equipe da 55 Marcas.
                  </p>
                </div>
              )}

              {error && (
                <p className="mt-4 rounded-xl bg-[#fbe4df] px-4 py-3 text-sm text-[#b64b3f]">
                  {error}
                </p>
              )}
            </section>
          </div>
        </article>

        <footer className="py-8 text-center text-xs leading-5 text-[#707b81]">
          55 Marcas · Você cria. A gente protege.
        </footer>
      </div>
    </main>
  );
}

function PublicContract({ token }: { token: string }) {
  const [contract, setContract] = useState<PublicContractOutput>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const loadContract = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await trpc.publicContract.get.query({ token });
      setContract(result);
      document.title = `${formatContractNumber(result.number)} | 55 Marcas`;
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível carregar este contrato.",
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadContract(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadContract]);

  async function downloadPdf() {
    if (!contract) return;
    setGeneratingPdf(true);
    setError("");
    try {
      await downloadContractPdf(
        {
          number: contract.number,
          title: contract.title,
          content: contract.content,
          contactName: contract.contactName,
          brandName: contract.brandName,
          segment: contract.segment,
          totalCents: contract.totalCents,
          validUntil: contract.validUntil,
          createdAt: contract.createdAt,
        },
        `contrato-C-${String(contract.number).padStart(6, "0")}.pdf`,
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível gerar o PDF do contrato.",
      );
    } finally {
      setGeneratingPdf(false);
    }
  }

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f6f2ea]">
        <div className="flex items-center gap-3 text-[#26745f]">
          <LoaderCircle className="size-5 animate-spin" />
          <span className="text-sm font-semibold">Carregando contrato...</span>
        </div>
      </main>
    );
  }

  if (!contract) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f6f2ea] px-5">
        <section className="max-w-md rounded-2xl border border-[#d9d8d0] bg-[#fffdfa] p-8 text-center">
          <XCircle className="mx-auto size-10 text-[#b64b3f]" />
          <h1 className="font-display mt-5 text-2xl font-bold text-[#173f35]">
            Contrato indisponível
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#707b81]">
            {error || "Confira o endereço recebido ou solicite um novo link."}
          </p>
        </section>
      </main>
    );
  }

  const statusMeta = CONTRACT_STATUS_META[contract.status];
  return (
    <main className="proposal-page min-h-screen bg-[#f6f2ea] text-[#173f35]">
      <header className="print-hidden border-b border-[#d9d8d0] bg-[#fffdfa]">
        <div className="mx-auto flex h-20 max-w-5xl items-center justify-between px-5 sm:px-8">
          <Logo />
          <div className="flex items-center gap-2">
            <button
              className="focus-ring flex h-10 items-center gap-2 rounded-xl bg-[#173f35] px-3 text-xs font-bold text-white hover:bg-[#2f6b52] disabled:cursor-wait disabled:opacity-60"
              disabled={generatingPdf}
              title="Baixar PDF tradicional"
              onClick={() => void downloadPdf()}
            >
              {generatingPdf ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              Baixar PDF
            </button>
            <button
              className="focus-ring hidden h-10 items-center gap-2 rounded-xl border border-[#b8c0bd] px-3 text-xs font-bold text-[#46545e] hover:bg-[#eeebe3] sm:flex"
              onClick={() => window.print()}
            >
              <FileText className="size-4" /> Imprimir página
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
        <article className="overflow-hidden rounded-[1.5rem] border border-[#d9d8d0] bg-[#fffdfa] shadow-xl shadow-[#173f35]/5">
          <section className="bg-[#173f35] px-6 py-8 text-[#fffdfa] sm:px-10 sm:py-11">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div>
                <p className="m-0 text-xs font-bold uppercase tracking-[0.16em] text-[#79b896]">
                  {formatContractNumber(contract.number)}
                </p>
                <h1 className="font-display m-0 mt-4 max-w-2xl text-3xl font-bold leading-tight tracking-[-0.04em] sm:text-4xl">
                  {contract.title}
                </h1>
                <p className="m-0 mt-4 text-sm text-[#d9d6d0]">
                  Preparado para {contract.contactName}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1.5 text-xs font-bold ${statusMeta.className}`}
              >
                {statusMeta.label}
              </span>
            </div>
          </section>

          <div className="space-y-9 px-6 py-8 sm:px-10 sm:py-10">
            <section className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-[#e3f0e8] p-4">
                <UserRound className="size-4 text-[#26745f]" />
                <p className="m-0 mt-3 text-xs font-semibold uppercase tracking-[0.08em] text-[#707b81]">
                  Contratante
                </p>
                <p className="m-0 mt-1 text-sm font-bold">{contract.contactName}</p>
              </div>
              <div className="rounded-xl bg-[#eeebe3] p-4">
                <FileSearch className="size-4 text-[#26745f]" />
                <p className="m-0 mt-3 text-xs font-semibold uppercase tracking-[0.08em] text-[#707b81]">
                  Marca
                </p>
                <p className="m-0 mt-1 text-sm font-bold">{contract.brandName}</p>
              </div>
              <div className="rounded-xl bg-[#ddf4e6] p-4">
                <CircleDollarSign className="size-4 text-[#26745f]" />
                <p className="m-0 mt-3 text-xs font-semibold uppercase tracking-[0.08em] text-[#707b81]">
                  Valor total
                </p>
                <p className="m-0 mt-1 text-sm font-bold">{formatMoney(contract.totalCents)}</p>
              </div>
            </section>

            <section>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="font-display m-0 text-xl font-bold">
                    Instrumento contratual
                  </h2>
                   <p className="m-0 mt-1 text-sm text-[#707b81]">
                     Leia o conteúdo integral e baixe o PDF para assinatura externa.
                   </p>
                </div>
                <span className="text-xs text-[#707b81]">
                  Validade comercial até {formatDateOnly(contract.validUntil)}
                </span>
              </div>
              <div className="mt-4 rounded-2xl border border-[#d9d8d0] bg-white p-5 text-sm leading-7 text-[#46545e] sm:p-7">
                <p className="m-0 whitespace-pre-wrap">{contract.content}</p>
              </div>
            </section>

            <section className="print-hidden rounded-2xl border border-[#b8c0bd] bg-[#e3f0e8]/55 p-5">
              <h2 className="m-0 text-sm font-bold text-[#173f35]">
                Precisa assinar fora desta página?
              </h2>
              <p className="m-0 mt-2 text-sm leading-6 text-[#46545e]">
                Use “Baixar PDF tradicional” para obter um arquivo formal e
                enviá-lo ao GOV.br. Se preferir, use “Imprimir página” para
                imprimir, assinar manualmente e digitalizar. Esta página não
                registra assinaturas.
              </p>
            </section>

            <section className="print-hidden border-t border-[#d9d8d0] pt-8">
              <div className="rounded-2xl border border-[#d9d8d0] bg-[#eeebe3]/40 p-5 text-center sm:p-6">
                <h2 className="font-display m-0 text-xl font-bold">
                  Assinatura externa
                </h2>
                <p className="m-0 mt-2 text-sm leading-6 text-[#46545e]">
                  Assine o PDF pelo GOV.br ou manualmente. Depois, encaminhe o
                  arquivo assinado à equipe da 55 Marcas para conferência e
                  arquivamento.
                </p>
              </div>

              {error && (
                <p className="mt-4 rounded-xl bg-[#fbe4df] px-4 py-3 text-sm text-[#b64b3f]">
                  {error}
                </p>
              )}
            </section>
          </div>
        </article>

        <footer className="py-8 text-center text-xs leading-5 text-[#707b81]">
          55 Marcas · Você cria. A gente protege.
        </footer>
      </div>
    </main>
  );
}

function Crm({ session, onSignedOut }: { session: SessionData; onSignedOut: () => void }) {
  const [page, setPage] = useState(() => window.location.hash === "#/usuarios" ? "users" : "leads");
  const [data, setData] = useState<LeadListOutput>();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [status, setStatus] = useState<LeadStatus | "ALL">("ALL");
  const [interest, setInterest] = useState<keyof typeof INTEREST_LABELS | "ALL">("ALL");
  const [selectedId, setSelectedId] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mobileNav, setMobileNav] = useState(false);

  useEffect(() => {
    const navigate = () => {
      setPage(window.location.hash === "#/usuarios" ? "users" : "leads");
      setMobileNav(false);
      setSelectedId(undefined);
    };
    window.addEventListener("hashchange", navigate);
    return () => window.removeEventListener("hashchange", navigate);
  }, []);

  const loadLeads = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await trpc.crm.leads.list.query({
        status: status === "ALL" ? undefined : status,
        interest: interest === "ALL" ? undefined : interest,
        query: deferredQuery || undefined,
        limit: 50,
        offset: 0,
      });
      setData(result);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível carregar os leads.");
    } finally {
      setLoading(false);
    }
  }, [deferredQuery, status, interest]);

  useEffect(() => {
    if (page !== "leads") return;
    const timeoutId = window.setTimeout(() => void loadLeads(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadLeads, page]);

  const todayCount = useMemo(() => {
    const today = new Date().toDateString();
    return data?.items.filter((item) => new Date(item.createdAt).toDateString() === today).length ?? 0;
  }, [data]);

  async function handleSignOut() {
    await signOut();
    onSignedOut();
  }

  return (
    <div className="min-h-screen bg-[#f6f2ea] lg:grid lg:grid-cols-[240px_1fr]">
      <aside className={`fixed inset-y-0 left-0 z-40 w-60 border-r border-white/10 bg-[#173f35] p-5 text-white transition-transform lg:translate-x-0 ${
        mobileNav ? "translate-x-0" : "-translate-x-full"
      }`}>
        <div className="flex items-center justify-between">
          <div className="[&_p]:text-white [&_p:last-child]:text-[#79b896]"><Logo /></div>
          <button className="lg:hidden" onClick={() => setMobileNav(false)} aria-label="Fechar menu"><X /></button>
        </div>
        <nav className="mt-12 space-y-2">
          <a className={`focus-ring flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold ${page === "leads" ? "bg-white/10" : "text-[#d9d6d0] hover:bg-white/5"}`} href="#/leads" aria-current={page === "leads" ? "page" : undefined} onClick={() => setMobileNav(false)}>
            <UsersRound className="size-4 text-[#79b896]" /> Leads
          </a>
          {session.user.crmRole === "ADMIN" && <a className={`focus-ring flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold ${page === "users" ? "bg-white/10" : "text-[#d9d6d0] hover:bg-white/5"}`} href="#/usuarios" aria-current={page === "users" ? "page" : undefined} onClick={() => setMobileNav(false)}>
            <UserRound className="size-4 text-[#79b896]" /> Usuários
          </a>}
          <span className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-3 text-sm text-[#d9d6d0]/60">
            <LayoutDashboard className="size-4" /> Dashboard <small className="ml-auto text-[9px] uppercase">Em breve</small>
          </span>
          <span className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-3 text-sm text-[#d9d6d0]/60">
            <CircleDollarSign className="size-4" /> Financeiro <small className="ml-auto text-[9px] uppercase">Em breve</small>
          </span>
        </nav>
        <div className="absolute bottom-5 left-5 right-5 border-t border-white/10 pt-5">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-full bg-[#79b896] text-sm font-bold text-[#173f35]">
              {session.user.name.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="m-0 truncate text-sm font-semibold">{session.user.name}</p>
              <p className="m-0 truncate text-[11px] text-[#d9d6d0]/70">{session.user.email}</p>
            </div>
            <button className="focus-ring text-[#d9d6d0] hover:text-white" onClick={() => void handleSignOut()} aria-label="Sair">
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </aside>

      {mobileNav && <button className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setMobileNav(false)} aria-label="Fechar menu" />}

      <main className="min-w-0 lg:col-start-2">
        <header className="flex h-20 items-center justify-between border-b border-[#d9d8d0] bg-[#fffdfa] px-5 sm:px-8 lg:px-10">
          <div className="flex items-center gap-3">
            <button className="focus-ring grid size-10 place-items-center rounded-xl border border-[#d9d8d0] lg:hidden" onClick={() => setMobileNav(true)} aria-label="Abrir menu">
              <Menu className="size-5" />
            </button>
            <div>
              <p className="m-0 text-xs font-bold uppercase tracking-[0.12em] text-[#26745f]">{page === "users" ? "Administração" : "Comercial"}</p>
              <h1 className="font-display m-0 text-xl font-bold tracking-[-0.03em] text-[#173f35] sm:text-2xl">{page === "users" ? "Usuários" : "Central de leads"}</h1>
            </div>
          </div>
          {page === "leads" && <div className="hidden items-center gap-2 rounded-full bg-[#e3f0e8] px-3 py-2 text-xs font-bold text-[#26745f] sm:flex">
            <span className="size-2 rounded-full bg-[#2fbf73]" />
            {todayCount} novo(s) hoje
          </div>}
        </header>

        {page === "users" ? session.user.crmRole === "ADMIN" ? <UsersPage currentUserId={session.user.id} /> : <p role="alert" className="p-8 text-[#b64b3f]">Somente administradores podem gerenciar usuários. <a href="#/leads" className="underline">Voltar aos leads</a></p> : <div className="mx-auto max-w-[1480px] p-5 sm:p-8 lg:p-10">
          <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <MetricCard label="Todos os leads" value={data?.total ?? 0} icon={UsersRound} active={status === "ALL"} onClick={() => setStatus("ALL")} />
            <MetricCard label="Novos" value={data?.byStatus.NEW ?? 0} icon={Sparkles} active={status === "NEW"} onClick={() => setStatus("NEW")} />
            <MetricCard label="Em proposta" value={data?.byStatus.PROPOSAL ?? 0} icon={FileSearch} active={status === "PROPOSAL"} onClick={() => setStatus("PROPOSAL")} />
            <MetricCard label="Fechados" value={data?.byStatus.WON ?? 0} icon={BarChart3} active={status === "WON"} onClick={() => setStatus("WON")} />
          </section>

          <section className="mt-8 overflow-hidden rounded-2xl border border-[#d9d8d0] bg-[#fffdfa]">
            <div className="flex flex-wrap gap-2 border-b border-[#d9d8d0] p-4" aria-label="Categoria do lead">
              {(["ALL", "SEARCH_ONLY", "REGISTRATION_REQUESTED"] as const).map((category) => (
                <button key={category} type="button" aria-pressed={interest === category}
                  className={`focus-ring rounded-lg px-4 py-2 text-sm font-semibold ${interest === category ? "bg-[#173f35] text-white" : "bg-[#eeebe3] text-[#46545e]"}`}
                  onClick={() => setInterest(category)}>
                  {category === "ALL" ? "Todas as categorias" : INTEREST_LABELS[category]}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-4 border-b border-[#d9d8d0] p-4 sm:p-5 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex gap-2 overflow-x-auto pb-1 xl:pb-0">
                <button className={`focus-ring shrink-0 rounded-full px-3 py-2 text-xs font-bold ${status === "ALL" ? "bg-[#173f35] text-white" : "bg-[#eeebe3] text-[#46545e]"}`} onClick={() => setStatus("ALL")}>Todos</button>
                {STATUS_ORDER.map((item) => (
                  <button className={`focus-ring shrink-0 rounded-full px-3 py-2 text-xs font-bold ${status === item ? "bg-[#173f35] text-white" : "bg-[#eeebe3] text-[#46545e]"}`} onClick={() => setStatus(item)} key={item}>
                    {STATUS_META[item].shortLabel}
                  </button>
                ))}
              </div>
              <label className="relative block w-full xl:max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#707b81]" />
                <input
                  className="focus-ring h-10 w-full rounded-xl border border-[#d9d8d0] bg-white pl-10 pr-3 text-sm outline-none"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar nome, marca ou WhatsApp"
                />
              </label>
            </div>

            {error && <p className="m-4 rounded-xl bg-[#fbe4df] px-4 py-3 text-sm text-[#b64b3f]">{error}</p>}
            {loading && !data ? (
              <div className="grid min-h-80 place-items-center"><LoaderCircle className="size-6 animate-spin text-[#26745f]" /></div>
            ) : data?.items.length === 0 ? (
              <EmptyState filtered={status !== "ALL" || interest !== "ALL" || Boolean(query)} />
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-[#d9d8d0] bg-[#eeebe3]/60 text-[11px] uppercase tracking-[0.08em] text-[#707b81]">
                        <th className="px-5 py-3 font-bold">Contato</th>
                        <th className="px-5 py-3 font-bold">Marca e segmento</th>
                        <th className="px-5 py-3 font-bold">Origem</th>
                        <th className="px-5 py-3 font-bold">Etapa</th>
                        <th className="px-5 py-3 font-bold">Entrada</th>
                        <th className="w-12" />
                      </tr>
                    </thead>
                    <tbody>
                      {data?.items.map((lead) => (
                        <tr
                          className="cursor-pointer border-b border-[#d9d8d0] transition last:border-0 hover:bg-[#e3f0e8]/45"
                          key={lead.id}
                          tabIndex={0}
                          onClick={() => setSelectedId(lead.id)}
                          onKeyDown={(event) => event.key === "Enter" && setSelectedId(lead.id)}
                        >
                          <td className="px-5 py-4">
                            <strong className="block text-sm text-[#173f35]">{lead.contactName}</strong>
                            <a className="mt-1 block text-xs text-[#707b81] hover:text-[#167548]" href={whatsappUrl(lead.whatsapp)} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>
                              {lead.whatsapp}
                            </a>
                          </td>
                          <td className="px-5 py-4">
                            <strong className="block text-sm text-[#173f35]">{lead.brandName}</strong>
                            <span className="mt-1 block max-w-xs truncate text-xs text-[#707b81]">{lead.segment}</span>
                          </td>
                          <td className="px-5 py-4 text-sm text-[#46545e]">{sourceLabel(lead)}<p className="mt-1 text-xs">{INTEREST_LABELS[lead.interest]}</p></td>
                          <td className="px-5 py-4"><StatusBadge status={lead.status} /></td>
                          <td className="whitespace-nowrap px-5 py-4 text-xs text-[#707b81]">{formatDate(lead.createdAt)}</td>
                          <td className="pr-5 text-[#707b81]"><ChevronRight className="size-4" /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="divide-y divide-[#d9d8d0] md:hidden">
                  {data?.items.map((lead) => (
                    <button className="focus-ring block w-full p-4 text-left hover:bg-[#e3f0e8]/40" key={lead.id} onClick={() => setSelectedId(lead.id)}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <strong className="text-sm text-[#173f35]">{lead.brandName}</strong>
                          <p className="m-0 mt-1 text-xs text-[#707b81]">{lead.contactName} · {lead.whatsapp}</p>
                          <p className="m-0 mt-1 text-xs text-[#26745f]">{INTEREST_LABELS[lead.interest]}</p>
                        </div>
                        <ChevronRight className="size-4 shrink-0 text-[#707b81]" />
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <StatusBadge status={lead.status} />
                        <span className="text-xs text-[#707b81]">{formatDate(lead.createdAt)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </section>
        </div>}
      </main>

      {selectedId && (
        <LeadDrawer
          leadId={selectedId}
          onClose={() => setSelectedId(undefined)}
          onChanged={() => void loadLeads()}
        />
      )}
    </div>
  );
}

export function App() {
  const [session, setSession] = useState<SessionData | null>();
  const publicProposalToken = window.location.pathname.match(
    /^\/proposta\/([^/]+)\/?$/,
  )?.[1];
  const publicContractToken = window.location.pathname.match(
    /^\/contrato\/([^/]+)\/?$/,
  )?.[1];
  const publicToken = publicProposalToken ?? publicContractToken;

  useEffect(() => {
    if (publicToken) return;
    loadSession()
      .then(setSession)
      .catch(() => setSession(null));
  }, [publicToken]);

  if (publicProposalToken) {
    return <PublicProposal token={decodeProposalToken(publicProposalToken)} />;
  }
  if (publicContractToken) {
    return <PublicContract token={decodeProposalToken(publicContractToken)} />;
  }
  if (session === undefined) return <Splash />;
  if (session === null) return <Login onSuccess={setSession} />;
  return <Crm session={session} onSignedOut={() => setSession(null)} />;
}
