import { cn } from '../../lib/cn'
import type { TimelineEvent } from '../../lib/charts'

const COL_REM = 8.5
const TITLE_H = 40
const STEM = 14
const GAP = 10
const BELOW = 34

export default function EventTimeline({ events }: { events: TimelineEvent[] }) {
  const min = events[0]?.at ?? 0
  const max = events[events.length - 1]?.at ?? min
  const trackRem = Math.max(40, events.length * COL_REM)
  const minGap = (COL_REM / trackRem) * 100
  const lanes = assignLanes(events, min, max, minGap)
  const laneCount = Math.max(1, ...lanes.map((n) => n + 1))
  const axisTop = GAP + laneCount * (TITLE_H + STEM)
  const height = axisTop + 8 + BELOW

  return (
    <div className="overflow-x-auto pb-1">
      <div className="relative px-12" style={{ minWidth: `${trackRem}rem`, height }}>
        <div className="absolute left-12 right-12 h-px bg-line" style={{ top: axisTop }} />
        {events.map((event, index) => {
          const left = xOf(event.at, min, max)
          const lane = lanes[index] ?? 0
          const titleTop = GAP + lane * (TITLE_H + STEM)
          const stemH = Math.max(8, axisTop - titleTop - TITLE_H + 5)
          return (
            <div
              key={event.id}
              className="absolute w-32 -translate-x-1/2 text-center"
              style={{
                left: `calc(3rem + ${left} * (100% - 6rem) / 100)`,
                top: titleTop,
              }}
            >
              <p className="line-clamp-2 h-10 text-xs font-medium leading-snug">{event.title}</p>
              <div className="mx-auto w-px bg-line" style={{ height: stemH }} />
              <span className="-mt-1.5 mx-auto block h-2.5 w-2.5 rounded-full bg-accent" />
              <p className={cn('mt-1.5 text-[11px] leading-tight text-muted')}>{event.label}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function xOf(at: number, min: number, max: number): number {
  if (max <= min) return 50
  return ((at - min) / (max - min)) * 100
}

function assignLanes(events: TimelineEvent[], min: number, max: number, minGap: number): number[] {
  const lastAt: number[] = []
  return events.map((event) => {
    const x = xOf(event.at, min, max)
    let lane = lastAt.findIndex((prev) => x - prev >= minGap)
    if (lane === -1) {
      lane = lastAt.length
      lastAt.push(x)
    } else {
      lastAt[lane] = x
    }
    return lane
  })
}
