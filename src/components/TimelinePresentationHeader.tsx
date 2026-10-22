type Props = { title: string; subtitle?: string; titleId?: string };

export default function TimelinePresentationHeader({ title, subtitle, titleId }: Props) {
  return (
    <header className="timeline-presentation-header">
      <p>Bensaúde|Uberaba</p>
      <h2 id={titleId}>{title}</h2>
      {subtitle && <span>{subtitle}</span>}
    </header>
  );
}