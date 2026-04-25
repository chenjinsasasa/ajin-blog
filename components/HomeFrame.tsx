'use client'

import type { ReactNode } from 'react'

interface HomeFrameProps {
  children: ReactNode
}

const MATRIX_COLUMNS = [
  { left: '6%', duration: '18s', delay: '-9s', cells: ['0', '1', '0', '1', 'A', 'J', 'I', 'N', '0', '1', '1', '0'] },
  { left: '18%', duration: '21s', delay: '-6s', cells: ['B', 'L', 'O', 'G', '0', '0', '1', '1', 'A', 'R', 'C', 'H'] },
  { left: '34%', duration: '17s', delay: '-12s', cells: ['L', 'O', 'G', '0', '1', '0', '1', '0', 'N', 'O', 'T', 'E'] },
  { left: '52%', duration: '19s', delay: '-4s', cells: ['P', 'R', 'O', 'G', '1', '0', '1', '0', 'D', 'I', 'A', 'R'] },
  { left: '70%', duration: '23s', delay: '-11s', cells: ['A', 'G', 'E', 'N', 'T', '0', '1', '1', '0', 'B', 'U', 'I'] },
  { left: '84%', duration: '20s', delay: '-7s', cells: ['L', 'D', '1', '0', '1', '0', 'L', 'O', 'G', 'N', 'O', 'D'] },
] as const

export default function HomeFrame({ children }: HomeFrameProps) {
  return (
    <div className="home-frame">
      <div className="page-atmosphere" aria-hidden="true">
        <div className="page-atmosphere__inner">
          <div className="page-atmosphere__aurora">
            <span className="page-atmosphere__band page-atmosphere__band--one" />
            <span className="page-atmosphere__band page-atmosphere__band--two" />
            <span className="page-atmosphere__band page-atmosphere__band--three" />
          </div>

          <div className="page-atmosphere__matrix">
            {MATRIX_COLUMNS.map((column) => (
              <div
                key={column.left}
                className="page-atmosphere__column"
                style={{
                  left: column.left,
                  animationDuration: column.duration,
                  animationDelay: column.delay,
                }}
              >
                {column.cells.map((cell, index) => (
                  <span key={`${column.left}-${index}`}>{cell}</span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="home-frame__content">{children}</div>
    </div>
  )
}
