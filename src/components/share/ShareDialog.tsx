import { useEffect, useState } from 'react'
import { Eye, Link2, Pencil, MessageSquare } from 'lucide-react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { SearchField, Select } from '../ui/Input'
import { usePrefs } from '../../context/PrefsContext'
import { useToast } from '../../context/ToastContext'
import {
  createInvite,
  fetchListInvites,
  searchProfiles,
  updateList,
} from '../../services/api'
import type { LinkAccess, ListInvite, ListRow, MemberRole, Profile } from '../../types/domain'
import { applyLinkAccess, joinShareUrl, listLinkAccess, listShareUrl, roleForLinkAccess } from '../../lib/share'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { cn } from '../../lib/cn'
import PersonRow from '../people/PersonRow'

const ACCESS: Array<{ id: LinkAccess; icon: typeof Eye }> = [
  { id: 'off', icon: Link2 },
  { id: 'view', icon: Eye },
  { id: 'propose', icon: MessageSquare },
  { id: 'edit', icon: Pencil },
]

export default function ShareDialog({
  open,
  list,
  userId,
  onClose,
  onChange,
}: {
  open: boolean
  list: ListRow
  userId: string
  onClose: () => void
  onChange: (list: ListRow) => void
}) {
  const { t } = usePrefs()
  const { toast } = useToast()
  const access = listLinkAccess(list)
  const [query, setQuery] = useState('')
  const [role, setRole] = useState<MemberRole>(() => roleForLinkAccess(access))
  const [found, setFound] = useState<Profile[]>([])
  const [foundFor, setFoundFor] = useState('')
  const [invites, setInvites] = useState<ListInvite[]>([])
  const debounced = useDebouncedValue(query)
  const searchKey = open ? debounced.trim() : ''
  const visibleFound = searchKey.length < 2 || foundFor !== searchKey ? [] : found
  const searching = searchKey.length >= 2 && foundFor !== searchKey

  useEffect(() => {
    if (!open) return
    setRole(roleForLinkAccess(listLinkAccess(list)))
    void fetchListInvites(list.id).then(setInvites).catch(() => setInvites([]))
    // Reset invite role when the dialog opens, not on every list patch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, list.id])

  useEffect(() => {
    if (!open || searchKey.length < 2) return
    let cancelled = false
    void searchProfiles(searchKey).then((rows) => {
      if (cancelled) return
      setFound(rows.filter((row) => row.id !== userId))
      setFoundFor(searchKey)
    })
    return () => {
      cancelled = true
    }
  }, [searchKey, open, userId])

  const saveAccess = async (next: LinkAccess) => {
    const patch = applyLinkAccess(list, next)
    const row = await updateList(list.id, patch)
    onChange(row)
    setRole(roleForLinkAccess(next))
  }

  const copy = async (url: string) => {
    await navigator.clipboard.writeText(url)
    toast(t('common.copied'))
  }

  return (
    <Modal open={open} onClose={onClose} title={t('share.title')} description={t('share.lead')} wide>
      <section className="space-y-3">
        <h3 className="text-sm font-medium">{t('share.anyone')}</h3>
        <p className="text-xs text-muted">{t('share.anyoneHint')}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {ACCESS.map((option) => {
            const Icon = option.icon
            const active = access === option.id
            return (
              <button
                key={option.id}
                type="button"
                className={cn(
                  'flex items-start gap-3 rounded-2xl border px-3 py-3 text-left text-sm transition-colors',
                  active ? 'border-accent bg-accent-soft' : 'border-line hover:border-accent hover:bg-ink/5',
                )}
                onClick={() => {
                  void saveAccess(option.id).catch((error) =>
                    toast(error instanceof Error ? error.message : t('common.error'), 'err'),
                  )
                }}
              >
                <Icon size={16} className={cn('mt-0.5 shrink-0', active ? 'text-accent' : 'text-muted')} />
                <span>
                  <span className="block font-medium">{t(`share.access.${option.id}`)}</span>
                  <span className="mt-0.5 block text-xs text-muted">{t(`share.accessHint.${option.id}`)}</span>
                </span>
              </button>
            )
          })}
        </div>
        <Button variant="soft" onClick={() => void copy(listShareUrl(list.id))}>
          <Link2 size={14} /> {t('share.copyList')}
        </Button>
        {access === 'off' ? <p className="text-xs text-muted">{t('share.copyOffHint')}</p> : null}
      </section>

      <section className="mt-6 space-y-3">
        <h3 className="text-sm font-medium">{t('share.invite')}</h3>
        <div className="flex flex-wrap gap-2">
          <SearchField
            className="min-w-0 flex-1"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('share.findUser')}
          />
          <Select value={role} onChange={(e) => setRole(e.target.value as MemberRole)}>
            <option value="viewer">{t('settingsModal.viewer')}</option>
            <option value="proposer">{t('settingsModal.proposer')}</option>
            <option value="editor">{t('settingsModal.editor')}</option>
          </Select>
        </div>
        {query.trim().length > 0 && query.trim().length < 2 ? (
          <p className="text-xs text-muted">{t('friends.emptySearch')}</p>
        ) : null}
        {searching ? <p className="text-xs text-muted">{t('common.loading')}</p> : null}
        {searchKey.length >= 2 && !searching && !visibleFound.length ? (
          <p className="text-xs text-muted">{t('friends.noUsers')}</p>
        ) : null}
        <ul className="space-y-2">
          {visibleFound.map((profile) => {
            const pending = invites.some((invite) => invite.invitee_id === profile.id)
            return (
              <PersonRow
                key={profile.id}
                profile={profile}
                action={
                  pending ? (
                    <span className="text-xs text-muted">{t('share.pending')}</span>
                  ) : (
                    <Button
                      size="sm"
                      variant="soft"
                      onClick={() => {
                        void createInvite({
                          list_id: list.id,
                          inviter_id: userId,
                          invitee_id: profile.id,
                          role,
                        })
                          .then((row) => {
                            setInvites((prev) => [row, ...prev])
                            toast(t('share.invited'))
                          })
                          .catch((error) => toast(error instanceof Error ? error.message : t('common.error'), 'err'))
                      }}
                    >
                      {t('settingsModal.invite')}
                    </Button>
                  )
                }
              />
            )
          })}
        </ul>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            void createInvite({ list_id: list.id, inviter_id: userId, role })
              .then((row) => {
                setInvites((prev) => [row, ...prev])
                return copy(joinShareUrl(row.token))
              })
              .catch((error) => toast(error instanceof Error ? error.message : t('common.error'), 'err'))
          }}
        >
          <Link2 size={14} /> {t('share.copyInvite')}
        </Button>
      </section>

      {invites.length ? (
        <section className="mt-6 space-y-2">
          <h3 className="text-sm font-medium">{t('share.pending')}</h3>
          <ul className="space-y-2">
            {invites.map((invite) =>
              invite.invitee ? (
                <PersonRow
                  key={invite.id}
                  profile={invite.invitee}
                  meta={t(`settingsModal.${invite.role}`)}
                  action={
                    <Button size="sm" variant="ghost" onClick={() => void copy(joinShareUrl(invite.token))}>
                      {t('common.share')}
                    </Button>
                  }
                />
              ) : (
                <li
                  key={invite.id}
                  className="flex items-center justify-between rounded-2xl border border-line bg-paper px-4 py-3 text-sm"
                >
                  <span>
                    {t('share.openLink')}
                    <span className="ml-2 text-xs text-muted">{t(`settingsModal.${invite.role}`)}</span>
                  </span>
                  <Button size="sm" variant="ghost" onClick={() => void copy(joinShareUrl(invite.token))}>
                    {t('common.share')}
                  </Button>
                </li>
              ),
            )}
          </ul>
        </section>
      ) : null}
    </Modal>
  )
}
