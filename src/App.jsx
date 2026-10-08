import { useState } from 'react'
import Header from './components/Header/Header.jsx'
import ShareModal from './components/ShareModal/ShareModal.jsx'
import SyncStatus from './components/SyncStatus/SyncStatus.jsx'
import TreesModal from './components/TreesModal/TreesModal.jsx'
import TreesPage from './components/TreesPage/TreesPage.jsx'
import TreeView from './components/TreeView/TreeView.jsx'
import UserMenu from './components/UserMenu/UserMenu.jsx'
import FamilyTreeProvider from './context/FamilyTreeProvider.jsx'
import { useTrees } from './hooks/useTrees.js'
import { downloadTree } from './services/fileTransfer.js'
import './App.css'

function SharedTree({ shared, onClose }) {
  return (
    <>
      <Header title={shared.name ?? 'Shared family tree'}>
        <span className="app-badge">View only</span>
        <button type="button" className="button button--small" onClick={onClose}>
          My trees
        </button>
        <UserMenu />
      </Header>
      {shared.state === 'ready' ? (
        <FamilyTreeProvider
          key={shared.code}
          treeId={`shared:${shared.code}`}
          initialTree={shared.tree}
          readOnly
        >
          <TreeView />
        </FamilyTreeProvider>
      ) : (
        <p className="app-message">
          {shared.state === 'loading' ? 'Opening shared tree…' : shared.message}
        </p>
      )}
    </>
  )
}

function App() {
  const { index, activeId, activeTree, editorKey, status, shared, updateTree, getTree, closeShared } =
    useTrees()
  const [showTrees, setShowTrees] = useState(false)
  const [sharingId, setSharingId] = useState(null)

  if (shared) return <SharedTree shared={shared} onClose={closeShared} />

  const activeName = index.find((e) => e.id === activeId)?.name

  let content
  if (activeTree) {
    content = (
      <FamilyTreeProvider
        key={editorKey}
        treeId={activeId}
        initialTree={activeTree}
        onChange={(tree) => updateTree(activeId, tree)}
      >
        <TreeView />
      </FamilyTreeProvider>
    )
  } else if (status.state === 'loading') {
    content = <p className="app-message">Loading your trees…</p>
  } else {
    content = <TreesPage onShare={setSharingId} />
  }

  return (
    <>
      <Header title={(activeTree && activeName) || 'Family Tree'}>
        <SyncStatus status={status} />
        {activeTree && (
          <>
            <button
              type="button"
              className="button button--small"
              onClick={() => setSharingId(activeId)}
            >
              Share
            </button>
            <button
              type="button"
              className="button button--small"
              onClick={() => downloadTree(getTree(activeId))}
            >
              Export
            </button>
            <button
              type="button"
              className="button button--small"
              onClick={() => setShowTrees(true)}
            >
              Trees
            </button>
          </>
        )}
        <UserMenu />
      </Header>

      {content}

      {showTrees && (
        <TreesModal
          onClose={() => setShowTrees(false)}
          onShare={(id) => {
            setShowTrees(false)
            setSharingId(id)
          }}
        />
      )}
      {sharingId && <ShareModal treeId={sharingId} onClose={() => setSharingId(null)} />}
    </>
  )
}

export default App
