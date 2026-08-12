type MarcaCertaMarkProps = {
  compact?: boolean;
};

export default function MarcaCertaMark({
  compact = false,
}: MarcaCertaMarkProps) {
  return (
    <span
      className={`relative grid shrink-0 place-items-center overflow-hidden rounded-mark bg-ink font-display font-semibold text-white shadow-[0_0.35rem_0.8rem_rgba(27,39,50,0.18)] ${compact ? "size-8 text-[0.9rem]" : "size-11 text-[1.18rem]"}`}
      aria-hidden="true"
    >
      <span className="relative z-10 -mt-0.5 tracking-[-0.08em]">M</span>
      <span
        className={`absolute bottom-1.25 right-1.25 rounded-full bg-accent shadow-[0_0_0_0.2rem_rgba(121,184,150,0.28)] ${compact ? "size-1.75" : "size-2"}`}
      />
    </span>
  );
}
