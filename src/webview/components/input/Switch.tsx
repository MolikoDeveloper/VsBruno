export interface SwitchProps {
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: {
    track: 'w-10 h-5',       // 40x20px track
    thumb: 'w-4 h-4',        // 16x16px thumb
    translate: 'translate-x-6', // 24px offset (40 - 16 -  ?)
  },
  md: {
    track: 'w-12 h-6',       // 48x24px track
    thumb: 'w-5 h-5',        // 20x20px thumb
    translate: 'translate-x-7', // 28px offset (48 - 20)
  },
  lg: {
    track: 'w-14 h-7',       // 56x28px track
    thumb: 'w-6 h-6',        // 24x24px thumb
    translate: 'translate-x-8', // 32px offset (56 - 24)
  },
};

export default function ({
  value,
  onChange,
  disabled,
  size = "md",
  className = "",
}: SwitchProps) {
  const { track, thumb, translate } = sizeClasses[size];

  const handleClick = () => {
    if (disabled) return;
    onChange(!value);
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      disabled={disabled}
      onClick={handleClick}
      className={
        `relative inline-flex items-center transition-colors duration-200 ease-in-out
        ${track}
        ${value ? 'bg-blue-600' : 'bg-gray-300'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
        ${className}`
      }
    >
      <span
        className={
          `transform transition-transform duration-200 ease-in-out
          ${value ? translate : 'translate-x-0'}
          bg-white
          ${thumb}
          rounded-full`
        }
      />
    </button>
  );
}
