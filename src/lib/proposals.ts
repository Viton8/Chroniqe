import type { ChangeProposal } from '../types/domain'

export function proposalValues(proposal: ChangeProposal): Record<string, unknown> | undefined {
  const values = proposal.payload?.values
  if (!values || typeof values !== 'object' || Array.isArray(values)) return undefined
  return values as Record<string, unknown>
}

export function proposalPreview(proposal: ChangeProposal): string {
  const values = proposalValues(proposal)
  if (!values) return ''
  return Object.values(values)
    .filter((value) => value != null && value !== '')
    .slice(0, 3)
    .map(String)
    .join(' · ')
}
