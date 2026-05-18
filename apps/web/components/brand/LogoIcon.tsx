interface LogoIconProps {
  className?: string;
  size?: number;
  color?: string;
}

export function LogoIcon({ className = '', size = 32, color = '#D4A817' }: LogoIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Primar-IA icon"
    >
      {/* Four-petal flower icon */}
      <path
        d="M100 10C100 10 120 50 120 80C120 90 112 100 100 100C88 100 80 90 80 80C80 50 100 10 100 10Z"
        fill={color}
      />
      <path
        d="M190 100C190 100 150 120 120 120C110 120 100 112 100 100C100 88 110 80 120 80C150 80 190 100 190 100Z"
        fill={color}
      />
      <path
        d="M100 190C100 190 80 150 80 120C80 110 88 100 100 100C112 100 120 110 120 120C120 150 100 190 100 190Z"
        fill={color}
      />
      <path
        d="M10 100C10 100 50 80 80 80C90 80 100 88 100 100C100 112 90 120 80 120C50 120 10 100 10 100Z"
        fill={color}
      />
    </svg>
  );
}
