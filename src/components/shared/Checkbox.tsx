import { IcCheck } from "@/components/shared/icons";

interface CheckboxProps {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  onClick?: (e: React.MouseEvent) => void;
}

export function Checkbox({ checked, indeterminate, onChange, onClick }: CheckboxProps) {
  const active = checked || indeterminate;
  return (
    <label className="relative grid place-items-center cursor-pointer flex-none" onClick={onClick}>
      <input
        type="checkbox"
        className="absolute opacity-0 w-0 h-0"
        checked={checked}
        ref={(el) => {
          if (el) el.indeterminate = !!indeterminate;
        }}
        onChange={onChange}
      />
      <span
        className={`w-4 h-4 rounded-[5px] border-[1.5px] grid place-items-center transition-colors duration-100 ${active ? "bg-indigo border-indigo text-[#0b0a16]" : "border-[#3b3666] text-transparent"
          }`}
      >
        {indeterminate ? <span className="w-2 h-0.5 bg-[#0b0a16] rounded-xs" /> : <IcCheck s={11} sw={2.4} />}
      </span>
    </label>
  );
}
