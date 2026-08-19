import { useId, useState, type FormEvent } from 'react'

interface UpdateCodeFormProps {
  currentCode: string
  onSubmit: (newCode: string) => void
}

export function UpdateCodeForm({ currentCode, onSubmit }: UpdateCodeFormProps) {
  const [editing, setEditing] = useState(false)
  const [code, setCode] = useState(currentCode)
  const inputId = useId()

  if (!editing) {
    return (
      <button
        type="button"
        className="link-button"
        onClick={() => {
          setCode(currentCode)
          setEditing(true)
        }}
      >
        Change code
      </button>
    )
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!code.trim() || code.trim() === currentCode) {
      setEditing(false)
      return
    }
    onSubmit(code.trim())
    setEditing(false)
  }

  return (
    <form className="update-code-form" onSubmit={handleSubmit}>
      <label htmlFor={inputId} className="visually-hidden">
        New code
      </label>
      <input
        id={inputId}
        value={code}
        onChange={(event) => setCode(event.target.value)}
        autoFocus
      />
      <button type="submit">Save</button>
      <button type="button" className="link-button" onClick={() => setEditing(false)}>
        Cancel
      </button>
    </form>
  )
}
