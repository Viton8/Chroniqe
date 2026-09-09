import { Pencil, Trash2 } from 'lucide-react'
import type { ChangeProposal, ItemRow, ListSchema } from '../../types/domain'
import { titleFromValues } from '../../lib/cn'
import { proposalPreview } from '../../lib/proposals'
import { usePrefs } from '../../context/PrefsContext'
import Button from '../ui/Button'

export default function ProposalsPanel({
  proposals,
  items,
  schema,
  userId,
  canReview,
  onReview,
  onEdit,
  onWithdraw,
}: {
  proposals: ChangeProposal[]
  items: ItemRow[]
  schema: ListSchema
  userId?: string
  canReview: boolean
  onReview: (id: string, approve: boolean) => Promise<void>
  onEdit: (proposal: ChangeProposal) => void
  onWithdraw: (id: string) => Promise<void>
}) {
  const { t } = usePrefs()
  const pending = proposals.filter((row) => row.status === 'pending')
  const editable = (row: ChangeProposal) =>
    row.status === 'pending' && row.user_id === userId && (row.action === 'create' || row.action === 'update')
  const mine = (row: ChangeProposal) => row.status === 'pending' && row.user_id === userId

  return (
    <div className="space-y-3">
      {!pending.length ? <p className="text-sm text-muted">{t('list.noProposals')}</p> : null}
      <ul className="space-y-2">
        {pending.map((row) => {
          const item = row.item_id ? items.find((entry) => entry.id === row.item_id) : undefined
          const title = item ? titleFromValues(item.values, schema.titleFieldId) : null
          return (
            <li key={row.id} className="rounded-xl bg-ink/5 p-3 text-sm">
              <p>
                {row.profile?.username ?? t('list.someone')} ·{' '}
                {t(`settingsModal.proposal.${row.action}`)}
                {title ? ` · ${title}` : ''}
              </p>
              {proposalPreview(row) ? (
                <p className="mt-1 truncate text-xs text-muted">{proposalPreview(row)}</p>
              ) : null}
              <div className="mt-2 flex flex-wrap gap-2">
                {canReview ? (
                  <>
                    <Button size="sm" onClick={() => void onReview(row.id, true)}>
                      {t('settingsModal.approve')}
                    </Button>
                    <Button size="sm" variant="soft" onClick={() => void onReview(row.id, false)}>
                      {t('settingsModal.reject')}
                    </Button>
                  </>
                ) : null}
                {editable(row) ? (
                  <Button size="sm" variant="soft" onClick={() => onEdit(row)}>
                    <Pencil size={14} /> {t('list.editProposal')}
                  </Button>
                ) : null}
                {mine(row) ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (!window.confirm(t('list.withdrawConfirm'))) return
                      void onWithdraw(row.id)
                    }}
                  >
                    <Trash2 size={14} /> {t('list.withdraw')}
                  </Button>
                ) : null}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
