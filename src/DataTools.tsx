import type { ChangeEvent } from 'react'
import type { Gate, GateRepository } from './repository'

interface DataToolsProps {
  repo: GateRepository
  onImport: () => void
}

export function DataTools({ repo, onImport }: DataToolsProps) {
  function handleExport() {
    const data = repo.exportGates()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = `sesame-export-${new Date().toISOString().slice(0, 10)}.json`
    link.click()

    URL.revokeObjectURL(url)
  }

  async function handleImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    try {
      const data = JSON.parse(await file.text()) as Gate[]
      repo.importGates(data)
      onImport()
    } catch {
      window.alert('That file is not a valid Sesame export.')
    }
  }

  return (
    <div className="data-tools">
      <button type="button" onClick={handleExport}>
        Export
      </button>
      <label htmlFor="import-file">Import</label>
      <input id="import-file" type="file" accept="application/json" onChange={handleImportFile} />
    </div>
  )
}
