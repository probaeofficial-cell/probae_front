import { ButtonHTMLAttributes } from "react";

interface ProbaeButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> { }

export function ProbaeButton({ children, disabled, className = "", ...props }: ProbaeButtonProps) {
  const baseStyles = "w-full font-medium text-base rounded-2xl px-4 py-3.5 flex items-center justify-center gap-1.5 transition-all duration-200 outline-none";
  const disabledStyles = "bg-[#353535] text-neutral-500 border border-transparent cursor-not-allowed opacity-60";
  const activeStyles = "bg-[#7C3AED] text-white border border-[#7C3AED] hover:bg-white hover:text-[#7C3AED] cursor-pointer";

  return (
    <button
      disabled={disabled}
      className={`${baseStyles} ${disabled ? disabledStyles : activeStyles} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
