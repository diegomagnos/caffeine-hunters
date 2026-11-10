export function CoffeeMark({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 64 64" fill="none" className={className}>
      <path d="M12 25h34v15a15 15 0 0 1-15 15h-4a15 15 0 0 1-15-15V25Z" stroke="currentColor" strokeWidth="3" />
      <path d="M46 28h4a8 8 0 0 1 0 16h-5M19 10v7m12-9v9m12-7v7M9 59h43" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
