export default function Toast({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-4 top-4 z-[60] mx-auto flex max-w-[440px] items-center justify-center rounded-xl bg-neutral-900/90 px-4 py-2.5 text-center text-sm font-semibold text-white shadow-lg"
    >
      {message}
    </div>
  );
}
