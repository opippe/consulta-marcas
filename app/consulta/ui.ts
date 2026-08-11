export const focusRing =
  "focus-visible:outline-3 focus-visible:outline-solid focus-visible:outline-[rgba(33,181,115,0.34)] focus-visible:outline-offset-4";

export const eyebrow =
  "mb-4 text-[0.7rem] font-extrabold tracking-[0.15em] text-accent-dark uppercase";

export const note =
  "before:size-1.25 before:flex-none before:rounded-full before:bg-accent before:content-[''] inline-flex items-center gap-2 text-[0.7rem] font-bold tracking-[0.08em] text-ink-soft uppercase";

export const statusPill =
  "inline-block max-w-55 rounded-status px-2.25 py-1.5 text-[0.7rem] font-bold leading-[1.25]";

export function getStatusTone(situacao = "") {
  if (/vigor|registrad|deferid/i.test(situacao)) {
    return "bg-positive-soft text-positive";
  }

  if (/pend|aguard|exame|oposi/i.test(situacao)) {
    return "bg-warning-soft text-warning";
  }

  return "bg-[#eef2f0] text-ink-soft";
}
