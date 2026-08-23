import { useState } from 'react'
import { searchGates } from './searchGates'
import { searchAddresses } from './searchAddresses'
import type { Address } from './addressRepository'
import type { Gate } from './repository'
import { SearchIcon } from './icons'

interface GateSearchProps {
  gates: Gate[]
  addresses: Address[]
  onOpenGate: (gateId: string) => void
}

// One search box over both gates (by name) and addresses (by text) — for
// checking a code before you arrive, not on the spot (CLAUDE.md). Two
// labeled result groups rather than merging them, since a name match and an
// address match answer different questions. Every result is clickable and
// opens that gate's detail sheet, same as tapping its card in the main list.
export function GateSearch({ gates, addresses, onOpenGate }: GateSearchProps) {
  const [query, setQuery] = useState('')
  const gateResults = searchGates(gates, query)
  const addressResults = searchAddresses(addresses, query)

  return (
    <div className="address-search">
      <div className="field search-field">
        <label htmlFor="gate-search" className="visually-hidden">
          Search by gate name or address
        </label>
        <SearchIcon />
        <input
          id="gate-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by gate name or address"
        />
      </div>

      {query.trim() && gateResults.length === 0 && addressResults.length === 0 && (
        <p>No matches.</p>
      )}

      {gateResults.length > 0 && (
        <div className="search-group">
          <p className="search-group-label">Gates</p>
          <ul className="address-search-results">
            {gateResults.map((gate) => (
              <li key={gate.id}>
                <button
                  type="button"
                  className="search-result"
                  aria-label={`Open ${gate.name}`}
                  onClick={() => onOpenGate(gate.id)}
                >
                  <h3>{gate.name}</h3>
                  <p className="code">{gate.code}</p>
                  {gate.codeHistory.length > 0 && (
                    <p className="previous-code">Previously: {gate.codeHistory[0].code}</p>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {addressResults.length > 0 && (
        <div className="search-group">
          <p className="search-group-label">Addresses</p>
          <ul className="address-search-results">
            {addressResults.map((address) => {
              const gate = gates.find((g) => g.id === address.gateId)
              if (!gate) return null

              return (
                <li key={address.id}>
                  <button
                    type="button"
                    className="search-result"
                    aria-label={`Open ${gate.name}`}
                    onClick={() => onOpenGate(gate.id)}
                  >
                    <h3>{gate.name}</h3>
                    <p className="code">{gate.code}</p>
                    {gate.codeHistory.length > 0 && (
                      <p className="previous-code">Previously: {gate.codeHistory[0].code}</p>
                    )}
                    <p className="matched-address">{address.address}</p>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
