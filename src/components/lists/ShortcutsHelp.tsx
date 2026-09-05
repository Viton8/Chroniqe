import Modal from '../ui/Modal'
import { usePrefs } from '../../context/PrefsContext'

export default function ShortcutsHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = usePrefs()
  return (
    <Modal open={open} onClose={onClose} title={t('shortcuts.title')}>
      <ul className="space-y-2 text-sm">
        {(
          [
            ['⌘K', t('shortcuts.palette')],
            ['/', t('shortcuts.search')],
            ['n', t('shortcuts.new')],
            ['j / k', t('shortcuts.move')],
            ['Enter', t('shortcuts.open')],
            ['a', t('shortcuts.selectAll')],
            ['?', t('shortcuts.help')],
            ['Esc', t('shortcuts.close')],
          ] as const
        ).map(([key, label]) => (
          <li key={key} className="flex items-center justify-between gap-4">
            <span>{label}</span>
            <kbd className="rounded-lg bg-ink/5 px-2 py-0.5 font-mono text-xs">{key}</kbd>
          </li>
        ))}
      </ul>
    </Modal>
  )
}
