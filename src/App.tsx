import { useState } from 'react'
import { GateForm } from './GateForm'
import { GateList } from './GateList'
import { createGate, listGates, type NewGateInput } from './repository'
import './App.css'

function App() {
  const [gates, setGates] = useState(() => listGates())

  function handleAdd(input: NewGateInput) {
    createGate(input)
    setGates(listGates())
  }

  return (
    <main>
      <h1>Sesame</h1>
      <GateForm onAdd={handleAdd} />
      <GateList gates={gates} />
    </main>
  )
}

export default App
