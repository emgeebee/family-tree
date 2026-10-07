import { useState } from 'react'
import { validateDateRange } from '../../utils/dates.js'
import Modal from '../Modal/Modal.jsx'

function PartnershipFormModal({ title, partnership, onSubmit, onCancel }) {
  const [values, setValues] = useState({
    marriage_date: partnership.marriageDate ?? '',
    marriage_location: partnership.marriageLocation ?? '',
    divorcing_date: partnership.divorceDate ?? '',
  })
  const [error, setError] = useState(null)

  const setField = (field) => (e) => setValues((v) => ({ ...v, [field]: e.target.value }))

  const handleSubmit = () => {
    const validationError = validateDateRange(
      values.marriage_date,
      values.divorcing_date,
      'Divorce date cannot be before the wedding date.',
    )
    if (validationError) {
      setError(validationError)
      return
    }
    onSubmit(values)
  }

  return (
    <Modal title={title} error={error} onSubmit={handleSubmit} onCancel={onCancel}>
      <div className="form-row">
        <label className="form-field">
          <span>Wedding date</span>
          <input
            autoFocus
            placeholder="YYYY-MM-DD"
            value={values.marriage_date}
            onChange={setField('marriage_date')}
          />
        </label>
        <label className="form-field">
          <span>Wedding location</span>
          <input value={values.marriage_location} onChange={setField('marriage_location')} />
        </label>
      </div>
      <label className="form-field">
        <span>Divorce date</span>
        <input
          placeholder="YYYY-MM-DD"
          value={values.divorcing_date}
          onChange={setField('divorcing_date')}
        />
      </label>
    </Modal>
  )
}

export default PartnershipFormModal
