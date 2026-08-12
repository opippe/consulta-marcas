export const focusRing =
  "focus-visible:outline-3 focus-visible:outline-solid focus-visible:outline-[rgba(121,184,150,0.52)] focus-visible:outline-offset-4";

export const eyebrow =
  "mb-4 text-[0.68rem] font-bold tracking-[0.16em] text-accent-dark uppercase";

export const note =
  "before:size-1.25 before:flex-none before:rounded-full before:bg-accent before:content-[''] inline-flex items-center gap-2 text-[0.68rem] font-bold tracking-[0.08em] text-ink-soft uppercase";

export const statusPill =
  "inline-block max-w-55 rounded-status px-2.5 py-1.5 text-[0.69rem] font-bold leading-[1.25]";

export function getStatusTone(situacao = "") {
  if (/vigor|registrad|deferid/i.test(situacao)) {
    return "bg-positive-soft text-positive";
  }

  if (/pend|aguard|exame|oposi/i.test(situacao)) {
    return "bg-warning-soft text-warning";
  }

  return "bg-surface-soft text-ink-soft";
}
