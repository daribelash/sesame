import { useEffect, useState } from 'react'
import { GateForm } from './GateForm'
import { GateList } from './GateList'
import { RadiusFilter } from './RadiusFilter'
import { DataTools } from './DataTools'
import { createGate, listGates, type NewGateInput } from './repository'
import { selectVisibleGates, RADIUS_OPTIONS_MILES } from './gateSort'
import { getCurrentFix } from './geolocation'
import type { Coordinates } from './distance'
import './App.css'

function App() {
  const [gates, setGates] = useState(() => listGates())
  const [currentPosition, setCurrentPosition] = useState<Coordinates | null>(null)
  const [radiusMiles, setRadiusMiles] = useState<number>(RADIUS_OPTIONS_MILES[1])

  useEffect(() => {
    getCurrentFix().then((result) => {
      if (result.status === 'success') {
        setCurrentPosition({ lat: result.fix.lat, lng: result.fix.lng })
      }
    })
  }, [])

  function refresh() {
    setGates(listGates())
  }

  function handleAdd(input: NewGateInput) {
    createGate(input)
    refresh()
  }

  const visibleGates = selectVisibleGates(gates, currentPosition, radiusMiles)

  return (
    <main>
      <h1>Sesame</h1>
      <GateForm onAdd={handleAdd} />
      <RadiusFilter value={radiusMiles} onChange={setRadiusMiles} />
      <GateList gates={visibleGates} />
      <DataTools onImport={refresh} />
    </main>
  )
}

export default App
