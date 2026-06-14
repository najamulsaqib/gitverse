import { useState } from "react";
import { Button } from "@/components/shared/Button";
import { IconButton } from "@/components/shared/IconButton";
import { Modal } from "@/components/shared/Modal";
import { IcCheck, IcX } from "@/components/shared/icons";
import { useProfilesStore } from "@/store/profiles";
import { useUiStore } from "@/store/ui";

const COLORS = ["#7b72e8", "#1dccb2", "#e0a94e", "#e8506e", "#9b88ff", "#46b0e6"];

export function EditAccountModal() {
  const editAccountId = useUiStore((s) => s.editAccountId);
  const closeEditAccount = useUiStore((s) => s.closeEditAccount);
  const showToast = useUiStore((s) => s.showToast);
  const accounts = useProfilesStore((s) => s.accounts);
  const account = accounts.find((a) => a.id === editAccountId);

  const [name, setName] = useState(account?.name ?? "");
  const [label, setLabel] = useState(account?.label ?? "");
  const [email, setEmail] = useState(account?.email ?? "");
  const [host, setHost] = useState(account?.host ?? "github.com");
  const [color, setColor] = useState(account?.color ?? COLORS[0]);

  if (!account) return null;

  const save = async () => {
    const initials = (
      name
        .trim()
        .split(/\s+/)
        .map((w) => w[0])
        .join("")
        .slice(0, 2) ||
      label.slice(0, 2) ||
      "NA"
    ).toUpperCase();
    const handle = email.split("@")[0];
    try {
      await useProfilesStore.getState().updateAccount({
        ...account,
        name,
        label,
        kind: label,
        email,
        handle,
        host,
        color,
        initials,
      });
      closeEditAccount();
      showToast({
        title: `${label} updated`,
        sub: "Profile changes saved",
        color,
      });
    } catch (e) {
      showToast({
        title: "Failed to update profile",
        sub: String(e),
        color: "#e8506e",
      });
    }
  };

  return (
    <Modal onClose={closeEditAccount} className="w-120 max-w-[calc(100%-40px)]">
      <div className="relative">
        <IconButton
          className="absolute top-3.5 right-3.5 w-7.5 h-7.5 rounded-lg z-2 text-text-3 hover:bg-surface-2 hover:text-text"
          onClick={closeEditAccount}
        >
          <IcX s={15} />
        </IconButton>
        <div className="pt-6.5 px-7 pb-5 flex flex-col gap-3.5">
          <h2 className="text-[19px] font-semibold tracking-[-0.01em]">Edit profile</h2>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] font-medium text-text-2">Display name</span>
              <input
                className="bg-bg border border-border rounded-lg px-2.75 py-2.25 text-[13px] outline-none transition-colors focus:border-indigo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Sarah Chen"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] font-medium text-text-2">Label</span>
              <input
                className="bg-bg border border-border rounded-lg px-2.75 py-2.25 text-[13px] outline-none transition-colors focus:border-indigo"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Client · Orbit"
              />
            </label>
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-medium text-text-2">Commit email</span>
            <input
              className="bg-bg border border-border rounded-lg px-2.75 py-2.25 text-[13px] outline-none transition-colors focus:border-indigo"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="sarah@orbit.dev"
              type="email"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] font-medium text-text-2">Host</span>
              <select
                className="bg-bg border border-border rounded-lg px-2.75 py-2.25 text-[13px] outline-none transition-colors focus:border-indigo"
                value={host}
                onChange={(e) => setHost(e.target.value)}
              >
                <option>github.com</option>
                <option>gitlab.com</option>
                <option>bitbucket.org</option>
                <option>custom (self-hosted)</option>
              </select>
            </label>
            <div className="flex flex-col gap-1.5">
              <span className="text-[12px] font-medium text-text-2">Accent</span>
              <div className="flex items-center gap-1.75 h-9.5">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    className={`w-5.5 h-5.5 rounded-[7px] border-2 transition-all ${c === color ? "border-text scale-[1.12]" : "border-transparent"
                      }`}
                    style={{ background: c }}
                    onClick={() => setColor(c)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-end gap-2.25 px-6 py-3.5 border-t border-border-soft bg-[#13111f]">
        <Button variant="ghost" onClick={closeEditAccount}>
          Cancel
        </Button>
        <Button className="flex items-center gap-1.75 px-4.5 py-2.25 rounded-lg text-[13px]" onClick={save}>
          <IcCheck s={14} sw={2} /> Save changes
        </Button>
      </div>
    </Modal>
  );
}
