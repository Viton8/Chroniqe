import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { usePrefs } from '../context/PrefsContext'
import { useToast } from '../context/ToastContext'
import { updateProfile, uploadAvatar } from '../services/api'
import type { Profile } from '../types/domain'
import Avatar from '../components/ui/Avatar'
import Button from '../components/ui/Button'
import { FieldWrap, Input, Textarea } from '../components/ui/Input'

export default function ProfilePage() {
  const { profile, user, refreshProfile, signOut } = useAuth()
  if (!user || !profile) return null
  return (
    <ProfileForm
      key={profile.updated_at}
      userId={user.id}
      profile={profile}
      onSaved={refreshProfile}
      onSignOut={() => void signOut()}
    />
  )
}

function ProfileForm({
  userId,
  profile,
  onSaved,
  onSignOut,
}: {
  userId: string
  profile: Profile
  onSaved: () => Promise<void>
  onSignOut: () => void
}) {
  const { toast } = useToast()
  const { t } = usePrefs()
  const [displayName, setDisplayName] = useState(profile.display_name)
  const [username, setUsername] = useState(profile.username)
  const [bio, setBio] = useState(profile.bio ?? '')

  return (
    <div className="max-w-lg">
      <h1 className="font-serif text-3xl">{t('profile.title')}</h1>
      <div className="mt-6 flex items-center gap-4">
        <Avatar name={displayName || username} url={profile.avatar_url} size={64} />
        <label className="text-sm text-accent">
          {t('profile.photo')}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (!file) return
              try {
                const url = await uploadAvatar(userId, file)
                await updateProfile(userId, { avatar_url: url })
                await onSaved()
              } catch (err) {
                toast(err instanceof Error ? err.message : t('fields.uploadFail'), 'err')
              }
            }}
          />
        </label>
      </div>
      <form
        className="mt-6 space-y-3"
        onSubmit={async (e) => {
          e.preventDefault()
          try {
            await updateProfile(userId, {
              display_name: displayName,
              username: username.toLowerCase(),
              bio,
            })
            await onSaved()
            toast(t('profile.saved'))
          } catch (err) {
            toast(err instanceof Error ? err.message : t('common.error'), 'err')
          }
        }}
      >
        <FieldWrap label={t('profile.name')}>
          <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </FieldWrap>
        <FieldWrap label={t('auth.username')}>
          <Input value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} />
        </FieldWrap>
        <FieldWrap label={t('profile.about')}>
          <Textarea value={bio} maxLength={500} onChange={(e) => setBio(e.target.value)} />
        </FieldWrap>
        <Button>{t('common.save')}</Button>
      </form>
      <p className="mt-4 text-sm">
        <Link className="text-accent underline" to={`/u/${username}`}>
          {t('profile.publicLists')}
        </Link>
      </p>
      <Button className="mt-8" variant="ghost" onClick={onSignOut}>
        {t('profile.logout')}
      </Button>
    </div>
  )
}
