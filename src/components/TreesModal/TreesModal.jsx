import Modal from '../Modal/Modal.jsx'
import TreeLibrary from '../TreeLibrary/TreeLibrary.jsx'

function TreesModal({ onClose, onShare }) {
  return (
    <Modal title="Your trees" onCancel={onClose} wide>
      <TreeLibrary onOpen={onClose} onShare={onShare} />
    </Modal>
  )
}

export default TreesModal
