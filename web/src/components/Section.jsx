import React from 'react'

export default function Section({ title, children, action }) {
  return (
    <section className="card">
      <div className="card-pad border-b border-neutral-800 flex items-center justify-between">
        <h2 className="h2">{title}</h2>
        {action}
      </div>
      <div className="card-pad">{children}</div>
    </section>
  )
}