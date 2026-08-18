import { RADIUS_OPTIONS_MILES } from './gateSort'

interface RadiusFilterProps {
  value: number
  onChange: (radiusMiles: number) => void
}

export function RadiusFilter({ value, onChange }: RadiusFilterProps) {
  return (
    <div className="radius-filter">
      <label htmlFor="radius">Radius</label>
      <select
        id="radius"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      >
        {RADIUS_OPTIONS_MILES.map((radiusMiles) => (
          <option key={radiusMiles} value={radiusMiles}>
            {radiusMiles} mi
          </option>
        ))}
      </select>
    </div>
  )
}
