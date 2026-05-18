import Image from 'next/image';

interface LogoProps {
  className?: string;
  width?: number;
  variant?: 'full' | 'small' | 'icon';
}

export function Logo({ className = '', width = 140, variant = 'full' }: LogoProps) {
  if (variant === 'icon') {
    return (
      <Image
        src="/logo-icon.png"
        alt="Primar-IA"
        width={width}
        height={width}
        className={className}
        priority
      />
    );
  }

  const src = variant === 'small' ? '/logo-small.png' : '/logo-full.png';
  const aspectRatio = 3.5;

  return (
    <Image
      src={src}
      alt="Primar-IA — La lonja digital del sector primario"
      width={width}
      height={Math.round(width / aspectRatio)}
      className={className}
      priority
    />
  );
}
