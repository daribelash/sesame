import { useState } from 'react'
import { searchAddresses } from './searchAddresses'
import type { Address } from './addressRepository'
import type { Gate } from './repository'

interface AddressSearchProps {
  addresses: Address[]
  gates: Gate[]
}

export function AddressSearch({ addresses, gates }: AddressSearchProps) {
  const [query, setQuery] = useState('')
  const results = searchAddresses(addresses, query)

  return (
    <div className="address-search">
      <div className="field">
        <label htmlFor="address-search">Search by address</label>
        <input
          id="address-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="123 Oak Lane"
        />
      </div>

      {query.trim() &&
        (results.length === 0 ? (
          <p>No matching addresses.</p>
        ) : (
          <ul className="address-search-results">
            {results.map((address) => {
              const gate = gates.find((g) => g.id === address.gateId)
              if (!gate) return null

              return (
                <li key={address.id}>
                  <h3>{gate.name}</h3>
                  <p className="code">{gate.code}</p>
                  {gate.codeHistory.length > 0 && (
                    <p className="previous-code">Previously: {gate.codeHistory[0].code}</p>
                  )}
                  <p className="matched-address">{address.address}</p>
                </li>
              )
            })}
          </ul>
        ))}
    </div>
  )
}
