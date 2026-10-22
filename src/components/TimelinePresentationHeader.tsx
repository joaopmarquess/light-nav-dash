type Props = { title: string; subtitle: string };

export default function TimelinePresentationHeader({ title, subtitle }: Props) {
  return (
    <header className="timeline-presentation-header">
      <p>Bensaúde Uberaba</p>
      <h2>{title}</h2>
      <span>{subtitle}</span>
    </header>
  );
}