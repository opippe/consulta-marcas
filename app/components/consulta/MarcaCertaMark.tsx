type MarcaCertaMarkProps = {
  compact?: boolean;
};

export default function MarcaCertaMark({
  compact = false,
}: MarcaCertaMarkProps) {
  return (
    <span
      className={`relative grid shrink-0 place-items-center overflow-hidden rounded-xl bg-ink font-extrabold text-white shadow-[0_0.35rem_0.8rem_rgba(23,59,87,0.18)] ${compact ? "size-8 text-[0.92rem]" : "size-10 text-[1.16rem]"}`}
      aria-hidden="true"
    >
      <span className="absolute left-[19%] top-[8%] tracking-[-0.12em]">M</span>
      <span
        className={`absolute bottom-[-11%] right-[2%] font-light leading-none text-accent ${compact ? "text-[1.46rem]" : "text-[1.82rem]"}`}
      >
        ✓
      </span>
    </span>
  );
}
