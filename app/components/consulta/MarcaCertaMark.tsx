import Image from "next/image";
import { publicAsset } from "@/app/consulta/paths";

type MarcaCertaMarkProps = { compact?: boolean };

export default function MarcaCertaMark({ compact = false }: MarcaCertaMarkProps) {
  return <Image src={publicAsset("/55-marcas-brand-kit/brand/icon.svg")} alt="" aria-hidden="true" width={compact ? 32 : 44} height={compact ? 32 : 44} className="shrink-0 rounded-lg" unoptimized />;
}
