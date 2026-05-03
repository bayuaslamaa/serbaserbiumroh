import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

export type GuideGroup = 'persiapan' | 'manasik' | 'doa-dzikir'

export interface GuideMetadata {
  slug: string
  title: string
  description: string
  group: GuideGroup
  order: number
  filePath: string // relative to content/panduan/
}

const PANDUAN_DIR = path.join(process.cwd(), 'content', 'panduan')

const GROUP_ORDER: Record<GuideGroup, number> = {
  persiapan: 0,
  manasik: 1,
  'doa-dzikir': 2,
}

export function getAllGuides(): GuideMetadata[] {
  const guides: GuideMetadata[] = []

  if (!fs.existsSync(PANDUAN_DIR)) return guides

  const groups = fs.readdirSync(PANDUAN_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)

  for (const group of groups) {
    const groupDir = path.join(PANDUAN_DIR, group)
    const files = fs.readdirSync(groupDir).filter(f => f.endsWith('.mdx'))

    for (const file of files) {
      const filePath = path.join(groupDir, file)
      const raw = fs.readFileSync(filePath, 'utf-8')
      const { data } = matter(raw)
      const slug = file.replace(/\.mdx$/, '')

      guides.push({
        slug,
        title: data.title ?? slug,
        description: data.description ?? '',
        group: (data.group as GuideGroup) ?? (group as GuideGroup),
        order: data.order ?? 0,
        filePath: `${group}/${file}`,
      })
    }
  }

  return guides.sort((a, b) => {
    const groupDiff = (GROUP_ORDER[a.group] ?? 99) - (GROUP_ORDER[b.group] ?? 99)
    if (groupDiff !== 0) return groupDiff
    return a.order - b.order
  })
}

export function getGuideBySlug(slug: string): GuideMetadata | null {
  return getAllGuides().find(g => g.slug === slug) ?? null
}
