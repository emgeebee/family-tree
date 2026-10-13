import { useState } from 'react'
import Modal from '../Modal/Modal.jsx'

function ParentSelect({ label, value, options, onChange }) {
  return (
    <label className="form-field">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Unknown / not recorded</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>{o.label}</option>
        ))}
      </select>
    </label>
  )
}

function ParentsFormModal({ title, options, initialParentIds, onSubmit, onCancel }) {
  const [first, setFirst] = useState(initialParentIds[0] ?? '')
  const [second, setSecond] = useState(initialParentIds[1] ?? '')
  const [error, setError] = useState(null)

  const handleSubmit = () => {
    if (first && first === second) {
      setError('Choose two different people.')
      return
    }
    onSubmit([first, second].filter(Boolean))
  }

  return (
    <Modal title={title} error={error} onSubmit={handleSubmit} onCancel={onCancel}>
      <ParentSelect label="Parent" value={first} options={options} onChange={setFirst} />
      <ParentSelect label="Other parent" value={second} options={options} onChange={setSecond} />
    </Modal>
  )
}

export default ParentsFormModal
