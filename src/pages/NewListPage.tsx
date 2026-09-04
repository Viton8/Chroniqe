import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { usePrefs } from '../context/PrefsContext'
import { useToast } from '../context/ToastContext'
import { createChart, createList, updateList } from '../services/api'
import { TEMPLATES, TEMPLATE_PACKS, cloneTemplate } from '../lib/templates'
import type { ListSettings, TransferAction } from '../types/domain'
import Button from '../components/ui/Button'
import Hint from '../components/ui/Hint'
import { todayIso } from '../lib/cn'

export default function NewListPage() {
  const { user } = useAuth()
  const { t } = usePrefs()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)

  const makeOne = async (key: string) => {
    if (!user) return
    const spec = TEMPLATES.find((tpl) => tpl.key === key)
    if (!spec) return
    setBusy(true)
    try {
      const cloned = cloneTemplate(spec)
      const list = await createList({
        owner_id: user.id,
        title: t(`tpl.${spec.key}.title`),
        icon: cloned.icon,
        template_key: cloned.template_key,
        schema: cloned.schema,
        view_config: cloned.view_config,
        settings: cloned.settings,
      })
      for (const chart of spec.charts ?? []) {
        await createChart({
          list_id: list.id,
          name: chart.name,
          chart_type: chart.chart_type,
          config: chart.config,
        })
      }
      navigate(`/lists/${list.id}`)
    } catch (e) {
      toast(e instanceof Error ? e.message : t('common.error'), 'err')
    } finally {
      setBusy(false)
    }
  }

  const makePack = async (packKey: string) => {
    if (!user) return
    const pack = TEMPLATE_PACKS.find((p) => p.key === packKey)
    if (!pack) return
    setBusy(true)
    try {
      const created: Record<string, string> = {}
      for (const spec of pack.lists) {
        const cloned = cloneTemplate(spec)
        const list = await createList({
          owner_id: user.id,
          title: t(`tpl.${spec.key}.title`),
          icon: cloned.icon,
          template_key: cloned.template_key,
          schema: cloned.schema,
          view_config: cloned.view_config,
          settings: cloned.settings,
        })
        created[spec.key] = list.id
        for (const chart of spec.charts ?? []) {
          await createChart({
            list_id: list.id,
            name: chart.name,
            chart_type: chart.chart_type,
            config: chart.config,
          })
        }
      }
      for (const transfer of pack.transfers ?? []) {
        const fromId = created[transfer.fromKey]
        const toId = created[transfer.toKey]
        if (!fromId || !toId) continue
        const fromSpec = pack.lists.find((l) => l.key === transfer.fromKey)
        const action: TransferAction = {
          id: crypto.randomUUID(),
          label: transfer.label,
          targetListId: toId,
          fieldMap: transfer.fieldMap,
          deleteSource: true,
          setFields:
            transfer.toKey.includes('watched') || transfer.toKey === 'bought'
              ? { watched_at: todayIso(), bought_at: todayIso(), decided_at: todayIso() }
              : {},
        }
        const settings: ListSettings = {
          ...(fromSpec?.settings ?? {}),
          transferActions: [...(fromSpec?.settings?.transferActions ?? []), action],
        }
        await updateList(fromId, { settings })
      }
      const first = created[pack.lists[0].key]
      navigate(`/lists/${first}`)
    } catch (e) {
      toast(e instanceof Error ? e.message : t('common.error'), 'err')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <h1 className="font-serif text-3xl">{t('newList.title')}</h1>
      <p className="mt-1 text-sm text-muted">{t('newList.lead')}</p>

      <h2 className="mt-8 font-serif text-2xl">{t('newList.packs')}</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {TEMPLATE_PACKS.map((p) => (
          <article key={p.key} className="rounded-3xl border border-line bg-paper p-5 shadow-lift">
            <h3 className="text-lg">
              {p.icon} {t(`tpl.pack_${p.key}.title`)}
            </h3>
            <p className="mt-1 text-sm text-muted">{t(`tpl.pack_${p.key}.description`)}</p>
            <div className="mt-3">
              <Hint compact title={t(`tpl.pack_${p.key}.hint`)} />
            </div>
            <Button className="mt-4" disabled={busy} onClick={() => void makePack(p.key)}>
              {t('newList.makePack')}
            </Button>
          </article>
        ))}
      </div>

      <h2 className="mt-10 font-serif text-2xl">{t('newList.templates')}</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TEMPLATES.map((tpl) => (
          <article key={tpl.key} className="rounded-3xl border border-line bg-paper p-4">
            <h3>
              {tpl.icon} {t(`tpl.${tpl.key}.title`)}
            </h3>
            <p className="mt-1 text-sm text-muted">{t(`tpl.${tpl.key}.description`)}</p>
            <details className="mt-2 text-xs text-muted">
              <summary>{t('newList.how')}</summary>
              <p className="mt-1">{t(`tpl.${tpl.key}.hint`)}</p>
              <p className="mt-1">
                {t('newList.example')}: {t(`tpl.${tpl.key}.example`)}
              </p>
            </details>
            <Button className="mt-3" size="sm" disabled={busy} onClick={() => void makeOne(tpl.key)}>
              {t('newList.makeOne')}
            </Button>
          </article>
        ))}
      </div>
    </div>
  )
}
