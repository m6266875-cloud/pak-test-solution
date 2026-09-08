const BOARDS = [
  { name: 'PTB', range: '1st \u2013 12th' },
  { name: 'AFAQ', range: '1st \u2013 7th' },
  { name: 'Oxford', range: '1st \u2013 5th' },
  { name: 'Gohar', range: '1st \u2013 5th' },
  { name: 'Federal', range: 'coming soon' },
];

export default function BoardStrip() {
  return (
    <div className="mkt-board-strip">
      {BOARDS.map((b) => (
        <div key={b.name} className="mkt-board-chip">
          <span className="mkt-board-name">{b.name}</span>
          <span className="mkt-board-range">{b.range}</span>
        </div>
      ))}
    </div>
  );
}
