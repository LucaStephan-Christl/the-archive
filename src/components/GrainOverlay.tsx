export default function GrainOverlay({ className = '' }: { className?: string }) {
  return <span aria-hidden="true" className={`grain-overlay ${className}`} />
}
