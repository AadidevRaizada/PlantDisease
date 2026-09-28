// Dev-only page (#/art) for eyeballing every crop at several stages and diseases.
import { CROPS } from '../../data/crops';
import { Plant } from './Plant';

export default function ArtGallery() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4 }}>
      {CROPS.flatMap((c) => {
        const dz = c.conditions.filter((x) => x.sim);
        const cases = [[0.3, undefined], [0.95, undefined], [0.95, dz[0]], [0.8, dz[1]], [0.85, dz[2] ?? dz[0]]] as const;
        return cases.map(([g, d]) => (
          <div key={`${c.id}${g}${d?.id ?? ''}`} style={{ height: 150, textAlign: 'center' }}>
            <Plant crop={c.id} growth={g} disease={d?.sim ? { sim: d.sim, severity: 0.7 } : undefined} />
            <small style={{ fontSize: 9 }}>{d?.id ?? `${c.id} ${g}`}</small>
          </div>
        ));
      })}
    </div>
  );
}
