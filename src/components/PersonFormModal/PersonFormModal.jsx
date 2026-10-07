import { useState } from 'react'
import { uploadPhoto } from '../../services/api.js'
import { validateDateRange } from '../../utils/dates.js'
import Avatar from '../Avatar/Avatar.jsx'
import Modal from '../Modal/Modal.jsx'

const GENDER_OPTIONS = [
  { value: 'Female', label: 'Female' },
  { value: 'Male', label: 'Male' },
  { value: '', label: 'Unknown' },
]

const EMPTY_VALUES = {
  given_name: '',
  surname: '',
  surname_at_birth: '',
  known_as: '',
  gender: '',
  date_of_birth: '',
  place_of_birth: '',
  is_deceased: false,
  date_of_death: '',
  place_of_death: '',
  profile_image: '',
}

function toFormValues(initialValues = {}) {
  const values = { ...EMPTY_VALUES }
  for (const key of Object.keys(EMPTY_VALUES)) {
    if (initialValues[key] != null) values[key] = initialValues[key]
  }
  return values
}

function PersonFormModal({
  title,
  submitLabel,
  initialValues,
  otherParentOptions,
  initialOtherParentId = '',
  onSubmit,
  onCancel,
}) {
  const [values, setValues] = useState(() => toFormValues(initialValues))
  const [otherParentId, setOtherParentId] = useState(initialOtherParentId)
  const [error, setError] = useState(null)
  const [uploading, setUploading] = useState(false)

  const setField = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setValues((v) => ({ ...v, [field]: value }))
  }

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const url = await uploadPhoto(file)
      setValues((v) => ({ ...v, profile_image: url }))
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = () => {
    const validationError = validateDateRange(
      values.date_of_birth,
      values.date_of_death,
      'Date of death cannot be before date of birth.',
    )
    if (validationError) {
      setError(validationError)
      return
    }
    const deceased = values.is_deceased || Boolean(values.date_of_death.trim())
    onSubmit(
      {
        ...values,
        is_deceased: deceased,
        date_of_death: deceased ? values.date_of_death : '',
        place_of_death: deceased ? values.place_of_death : '',
      },
      { otherParentId: otherParentId || null },
    )
  }

  return (
    <Modal
      title={title}
      submitLabel={submitLabel}
      submitDisabled={uploading}
      error={error}
      onSubmit={handleSubmit}
      onCancel={onCancel}
    >
      <div className="form-photo">
        <Avatar src={values.profile_image} size={64} />
        <div className="form-photo__actions">
          <label className="button button--small">
            {uploading ? 'Uploading…' : values.profile_image ? 'Change photo' : 'Upload photo'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              hidden
              disabled={uploading}
              onChange={handlePhotoChange}
            />
          </label>
          {values.profile_image && !uploading && (
            <button
              type="button"
              className="button button--small"
              onClick={() => setValues((v) => ({ ...v, profile_image: '' }))}
            >
              Remove
            </button>
          )}
        </div>
      </div>

      <div className="form-row">
        <label className="form-field">
          <span>Given name</span>
          <input autoFocus value={values.given_name} onChange={setField('given_name')} />
        </label>
        <label className="form-field">
          <span>Surname</span>
          <input value={values.surname} onChange={setField('surname')} />
        </label>
      </div>

      <div className="form-row">
        <label className="form-field">
          <span>Surname at birth</span>
          <input value={values.surname_at_birth} onChange={setField('surname_at_birth')} />
        </label>
        <label className="form-field">
          <span>Known as</span>
          <input value={values.known_as} onChange={setField('known_as')} />
        </label>
      </div>

      <label className="form-field">
        <span>Gender</span>
        <select value={values.gender} onChange={setField('gender')}>
          {GENDER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </label>

      <div className="form-row">
        <label className="form-field">
          <span>Date of birth</span>
          <input
            placeholder="YYYY-MM-DD"
            value={values.date_of_birth}
            onChange={setField('date_of_birth')}
          />
        </label>
        <label className="form-field">
          <span>Place of birth</span>
          <input value={values.place_of_birth} onChange={setField('place_of_birth')} />
        </label>
      </div>

      <label className="form-checkbox">
        <input type="checkbox" checked={values.is_deceased} onChange={setField('is_deceased')} />
        <span>Deceased</span>
      </label>

      {values.is_deceased && (
        <div className="form-row">
          <label className="form-field">
            <span>Date of death</span>
            <input
              placeholder="YYYY-MM-DD"
              value={values.date_of_death}
              onChange={setField('date_of_death')}
            />
          </label>
          <label className="form-field">
            <span>Place of death</span>
            <input value={values.place_of_death} onChange={setField('place_of_death')} />
          </label>
        </div>
      )}

      {otherParentOptions && (
        <label className="form-field">
          <span>Other parent</span>
          <select value={otherParentId} onChange={(e) => setOtherParentId(e.target.value)}>
            <option value="">Unknown / not recorded</option>
            {otherParentOptions.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
        </label>
      )}
    </Modal>
  )
}

export default PersonFormModal
