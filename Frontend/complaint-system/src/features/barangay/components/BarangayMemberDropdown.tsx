import React, { useState } from "react";

interface BarangayMemberDropdownProps {
  members: Array<{ id: number; name: string; position: string }>;
  selectedMemberIds: string[];
  onChange: (memberIds: string[]) => void;
  disabled?: boolean;
}

export const BarangayMemberDropdown: React.FC<BarangayMemberDropdownProps> = ({
  members,
  selectedMemberIds,
  onChange,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMember = (memberId: string) => {
    onChange(
      selectedMemberIds.includes(memberId)
        ? selectedMemberIds.filter((id) => id !== memberId)
        : [...selectedMemberIds, memberId]
    );
  };

  const buttonLabel = selectedMemberIds.length
    ? `${selectedMemberIds.length} member${selectedMemberIds.length === 1 ? "" : "s"} selected`
    : "Select barangay members";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        disabled={disabled}
        className="flex w-full items-center justify-between rounded-md border border-gray-300 bg-white p-2 text-left text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className={selectedMemberIds.length ? "text-gray-900" : "text-gray-500"}>{buttonLabel}</span>
        <span className="text-gray-400">{isOpen ? "^" : "v"}</span>
      </button>
      {isOpen && (
        <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-gray-200 bg-white p-1 shadow-lg">
          {members.map((member) => {
            const memberId = String(member.id);
            return (
              <label key={member.id} className="flex cursor-pointer items-start gap-2 rounded px-2 py-2 text-sm hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={selectedMemberIds.includes(memberId)}
                  onChange={() => toggleMember(memberId)}
                  className="mt-0.5"
                />
                <span>
                  <span className="block text-gray-900">{member.name}</span>
                  <span className="block text-xs text-gray-500">{member.position}</span>
                </span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
};
