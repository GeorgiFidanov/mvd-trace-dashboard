import Image from "next/image";

export function PinkPantherMark({ className = "h-12 w-12" }: { className?: string }) {
  return (
    <Image
      className={className}
      src="/pink.svg"
      alt="Pink Panther project mark"
      width={96}
      height={96}
      priority
      unoptimized
    />
  );
}
