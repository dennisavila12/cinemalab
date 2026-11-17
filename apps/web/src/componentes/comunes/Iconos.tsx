export const IconoPlay = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
);
export const IconoPausa = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z" /></svg>
);
export const IconoInicio = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5h2v14H6zM9.5 12 19 5v14z" /></svg>
);
export const IconoVoz = ({ activa }: { activa: boolean }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 9v6h4l5 4V5L8 9H4z" />
    {activa ? <path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /> : <path d="m16 9 5 6m0-6-5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />}
  </svg>
);
