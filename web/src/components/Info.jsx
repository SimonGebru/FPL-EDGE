import React from 'react';

export default function Info({ text, className = '' }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);

  React.useEffect(() => {
    function onDoc(e) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  return (
    <span ref={ref} className={`relative inline-flex ${className}`}>
      <button
        type="button"
        aria-label="Info"
        onClick={() => setOpen(o => !o)}
        className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-neutral-800 text-neutral-300 text-xs hover:bg-neutral-700"
      >
        ?
      </button>
      {open && (
        <div
          role="tooltip"
          className="absolute z-20 top-6 right-0 max-w-xs rounded-lg border border-neutral-700 bg-neutral-900 p-3 text-xs text-neutral-200 shadow-xl"
        >
          {text}
        </div>
      )}
    </span>
  );
}