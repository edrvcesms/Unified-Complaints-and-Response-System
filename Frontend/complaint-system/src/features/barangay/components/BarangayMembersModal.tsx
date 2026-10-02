import React, { useState } from "react";
import type { BarangayMember } from "../../../services/barangay/barangays";

interface BarangayMembersModalProps {
  members: BarangayMember[];
  isLoading: boolean;
  isAdding: boolean;
  removingMemberId?: number;
  onAdd: (payload: { name: string; position: string }) => Promise<void>;
  onRemove: (memberId: number) => void;
  onClose: () => void;
}

export const BarangayMembersModal: React.FC<BarangayMembersModalProps> = ({
  members,
  isLoading,
  isAdding,
  removingMemberId,
  onAdd,
  onRemove,
  onClose,
}) => {
  const [name, setName] = useState("");
  const [position, setPosition] = useState("");
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !position.trim()) return;
    await onAdd({ name: name.trim(), position: position.trim() });
    setName("");
    setPosition("");
    setIsAddFormOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Barangay Members</h2>
            <p className="mt-1 text-xs text-gray-500">Manage members available for incident assignment.</p>
          </div>
          <button type="button" onClick={onClose} className="text-2xl leading-none text-gray-400 hover:text-gray-700" aria-label="Close members modal">&times;</button>
        </div>

        <div className="px-6 py-4">
          {isLoading ? <p className="text-sm text-gray-500">Loading members...</p> : members.length === 0 ? <p className="text-sm text-gray-500">No barangay members yet.</p> : (
            <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
              {members.map((member) => (
                <div key={member.id} className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-3">
                  <div><p className="text-sm font-medium text-gray-900">{member.name}</p><p className="text-xs text-gray-500">{member.position}</p></div>
                  <button type="button" onClick={() => onRemove(member.id)} disabled={removingMemberId === member.id} className="text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50">
                    {removingMemberId === member.id ? (
                      <span className="inline-flex items-center gap-1.5">
                        <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                        </svg>
                        Removing...
                      </span>
                    ) : "Remove"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 px-6 py-4">
          {!isAddFormOpen ? <button type="button" onClick={() => setIsAddFormOpen(true)} className="w-full rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">Add Member</button> : (
            <form onSubmit={submit} className="space-y-3">
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Member name" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" required />
              <input value={position} onChange={(event) => setPosition(event.target.value)} placeholder="Position" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" required />
              <div className="flex justify-end gap-2"><button type="button" onClick={() => setIsAddFormOpen(false)} disabled={isAdding} className="rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-50">Cancel</button><button type="submit" disabled={isAdding} className="rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">{isAdding ? <span className="inline-flex items-center gap-2"><svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>Adding...</span> : "Save Member"}</button></div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};