import { Button } from "@/components/shared/Button";
import { useUiStore } from "@/store/ui";

export function NoRepos() {
  const openAddRepo = useUiStore((s) => s.openAddRepo);

  return (
    <div className="flex-1 grid place-items-center p-10">
      <div className="flex flex-col items-center text-center max-w-100">
        <img src="/placeholder.svg" alt="" width={64} height={64} className="opacity-50 mb-5" />
        <h1 className="text-[22px] font-semibold tracking-[-0.01em]">No repositories yet</h1>
        <p className="text-[13.5px] text-text-2 mt-2.5 leading-[1.55]">
          Add a local Git repository from your machine to pin it here.
        </p>
        <Button className="mt-6 px-4 py-2.5 rounded-lg text-[13px]" onClick={openAddRepo}>
          Add local repository
        </Button>
      </div>
    </div>
  );
}
