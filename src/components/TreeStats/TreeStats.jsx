import './TreeStats.css'

function TreeStats({ stats }) {
  if (!stats) return null

  const items = [
    {
      value: stats.total,
      label: stats.total === 1 ? 'person' : 'people',
      title: 'Everyone in this tree',
    },
  ]

  if (stats.shown < stats.total) {
    items.push({
      value: stats.shown,
      label: 'in this branch',
      title: 'People drawn from the current focus. Other lines stay hidden until you reveal them.',
    })
  }

  items.push(
    {
      value: stats.onScreen,
      label: 'on screen',
      title: 'People currently visible on the canvas, including ones partly in view',
    },
    {
      value: stats.generations,
      label: stats.generations === 1 ? 'generation' : 'generations',
      title: 'Generations in the current branch',
      extra: true,
    },
    {
      value: stats.living,
      label: 'living',
      title: 'People with no death recorded',
      extra: true,
    },
  )

  return (
    <div className="tree-stats" aria-label="Tree statistics">
      {items.map((item) => (
        <span
          key={item.label}
          className={item.extra ? 'tree-stats__item tree-stats__item--extra' : 'tree-stats__item'}
          title={item.title}
        >
          <strong>{item.value ?? '–'}</strong>
          {item.label}
        </span>
      ))}
    </div>
  )
}

export default TreeStats
