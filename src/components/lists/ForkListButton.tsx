import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { usePrefs } from '../../context/PrefsContext'
import { useToast } from '../../context/ToastContext'
import { duplicateList } from '../../services/api'
import type { ListRow } from '../../types/domain'
import Button from '../ui/Button'

export default function ForkListButton({ list }: { list: ListRow }) {
  const { user } = useAuth()
  const { t } = usePrefs()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)

  if (!user || user.id === list.owner_id) return null

  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={busy}
      onClick={() => {
        setBusy(true)
        void duplicateList(list.id, user.id, t('list.copyOf', { title: list.title }))
          .then((copy) => {
            toast(t('list.duplicated'))
            navigate(`/lists/${copy.id}`)
          })
          .catch(() => toast(t('list.duplicateFail'), 'err'))
          .finally(() => setBusy(false))
      }}
    >
      {t('explore.fork')}
    </Button>
  )
}
