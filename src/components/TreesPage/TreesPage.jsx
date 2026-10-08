import { useTrees } from '../../hooks/useTrees.js'
import TreeLibrary from '../TreeLibrary/TreeLibrary.jsx'
import './TreesPage.css'

/** Shown instead of the tree when no tree is open, e.g. for a new user. */
function TreesPage({ onShare }) {
  const { index } = useTrees()
  return (
    <main className="trees-page">
      <div className="trees-page__card">
        <h2 className="trees-page__title">
          {index.length ? 'Choose a family tree' : 'Create your first family tree'}
        </h2>
        <TreeLibrary onShare={onShare} />
      </div>
    </main>
  )
}

export default TreesPage
