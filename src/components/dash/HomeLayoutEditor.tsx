import { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Eye, EyeOff, Plus, Trash2 } from 'lucide-react'
import { usePrefs } from '../../context/PrefsContext'
import {
  HOME_FIXED_KINDS,
  addHomeBlock,
  defaultHomeLayout,
  moveHomeBlock,
  patchHomeBlock,
  removeHomeBlock,
  type HomeBlockKind,
  type HomeLayout,
} from '../../lib/homeLayout'
import { normalizeViewConfig } from '../../lib/views'
import type { ListRow } from '../../types/domain'
import Button from '../ui/Button'
import { FieldWrap, Select } from '../ui/Input'
import Modal from '../ui/Modal'

export default function HomeLayoutEditor({
  open,
  layout,
  lists,
  onChange,
  onClose,
}: {
  open: boolean
  layout: HomeLayout
  lists: ListRow[]
  onChange: (next: HomeLayout) => void
  onClose: () => void
}) {
  const { t } = usePrefs()
  const [addKind, setAddKind] = useState<HomeBlockKind>('list')
  const listsById = useMemo(() => new Map(lists.map((row) => [row.id, row])), [lists])
  const missingFixed = HOME_FIXED_KINDS.filter((kind) => !layout.blocks.some((row) => row.kind === kind))

  const add = () => {
    onChange(addHomeBlock(layout, addKind))
    setAddKind('list')
  }

  return (
    <Modal open={open} onClose={onClose} title={t('home.customize')} description={t('home.lead')} wide>
      <p className="mb-4 text-sm text-muted">{t('home.leadEx')}</p>
      <ul className="space-y-2">
        {layout.blocks.map((block, index) => {
          const list = block.listId ? listsById.get(block.listId) : undefined
          const views = list ? normalizeViewConfig(list.view_config, list.schema).views : []
          const label =
            block.kind === 'list'
              ? list
                ? `${list.icon ?? ''} ${list.title}`.trim()
                : t('home.kind.list')
              : t(`home.kind.${block.kind}`)
          return (
            <li
              key={block.id}
              className={`rounded-2xl border border-line bg-paper p-3 ${block.on ? '' : 'opacity-60'}`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="min-w-0 flex-1 truncate text-sm font-medium">{label}</p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={index === 0}
                    aria-label={t('home.moveUp')}
                    onClick={() => onChange(moveHomeBlock(layout, block.id, -1))}
                  >
                    <ChevronUp size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={index === layout.blocks.length - 1}
                    aria-label={t('home.moveDown')}
                    onClick={() => onChange(moveHomeBlock(layout, block.id, 1))}
                  >
                    <ChevronDown size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={block.on ? t('home.hide') : t('home.show')}
                    onClick={() => onChange(patchHomeBlock(layout, block.id, { on: !block.on }))}
                  >
                    {block.on ? <Eye size={16} /> : <EyeOff size={16} />}
                  </Button>
                  {block.kind === 'list' ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={t('common.delete')}
                      onClick={() => onChange(removeHomeBlock(layout, block.id))}
                    >
                      <Trash2 size={16} />
                    </Button>
                  ) : null}
                </div>
              </div>
              {block.kind === 'list' ? (
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <FieldWrap label={t('home.pickList')}>
                    <Select
                      className="w-full"
                      value={block.listId ?? ''}
                      onChange={(e) =>
                        onChange(patchHomeBlock(layout, block.id, { listId: e.target.value, viewId: '' }))
                      }
                    >
                      <option value="">{t('home.chooseList')}</option>
                      {lists.map((row) => (
                        <option key={row.id} value={row.id}>
                          {`${row.icon ?? ''} ${row.title}`.trim()}
                        </option>
                      ))}
                    </Select>
                  </FieldWrap>
                  <FieldWrap label={t('home.pickView')}>
                    <Select
                      className="w-full"
                      disabled={!list}
                      value={block.viewId ?? ''}
                      onChange={(e) => onChange(patchHomeBlock(layout, block.id, { viewId: e.target.value }))}
                    >
                      <option value="">{t('home.defaultView')}</option>
                      {views.map((view) => (
                        <option key={view.id} value={view.id}>
                          {view.name}
                        </option>
                      ))}
                    </Select>
                  </FieldWrap>
                  <FieldWrap label={t('home.limit')}>
                    <Select
                      className="w-full"
                      value={String(block.limit ?? 8)}
                      onChange={(e) =>
                        onChange(patchHomeBlock(layout, block.id, { limit: Number(e.target.value) }))
                      }
                    >
                      {[4, 6, 8, 12, 16, 24].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </Select>
                  </FieldWrap>
                </div>
              ) : null}
            </li>
          )
        })}
      </ul>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-end gap-2">
          <FieldWrap label={t('home.addKind')}>
            <Select
              value={addKind}
              onChange={(e) => setAddKind(e.target.value as HomeBlockKind)}
            >
              <option value="list">{t('home.kind.list')}</option>
              {missingFixed.map((kind) => (
                <option key={kind} value={kind}>
                  {t(`home.kind.${kind}`)}
                </option>
              ))}
            </Select>
          </FieldWrap>
          <Button variant="soft" size="sm" onClick={add}>
            <Plus size={14} /> {t('home.add')}
          </Button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (!window.confirm(t('home.resetConfirm'))) return
            onChange(defaultHomeLayout())
          }}
        >
          {t('home.reset')}
        </Button>
      </div>
    </Modal>
  )
}
