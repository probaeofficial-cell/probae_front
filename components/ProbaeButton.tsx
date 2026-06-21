import { ButtonHTMLAttributes } from "react";

interface ProbaeButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> { }

export function ProbaeButton({ children, disabled, className = "", ...props }: ProbaeButtonProps) {
  const baseStyles = "w-full font-bold text-base rounded-[20px] px-4 py-3.5 flex items-center justify-center gap-1.5 transition-all duration-200 outline-none";

  const disabledStyles = "bg-[#353535] text-neutral-500 border border-transparent cursor-not-allowed opacity-60";

  const activeStyles = "bg-[#6A0FAD] text-white border border-[#6A0FAD] hover:bg-white hover:text-[#6A0FAD] cursor-pointer shadow-sm";

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