export type ArticleStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED"

export interface ArticleTag {
  id: string
  slug: string
  name: string
}

export interface ArticleCategory extends ArticleTag {
  description: string | null
  sortOrder: number
  isActive: boolean
  metaTitle: string | null
  metaDescription: string | null
}

export interface ArticleListItem {
  id: string
  slug: string
  title: string
  excerpt: string | null
  coverUrl: string | null
  coverAlt: string | null
  readingMinutes: number | null
  status: ArticleStatus
  publishedAt: string | null
  isFeatured: boolean
  viewCount: number
  authorName: string | null
  category: ArticleTag | null
  tags: ArticleTag[]
  updatedAt: string
}

export interface ArticleSeo {
  metaTitle: string | null
  metaDescription: string | null
  metaKeywords: string[]
  canonicalUrl: string | null
  ogTitle: string | null
  ogDescription: string | null
  ogImageUrl: string | null
  noIndex: boolean
  structuredData: unknown
}

export interface Article extends ArticleListItem {
  content: string
  sortOrder: number
  categoryId: string | null
  authorId: string | null
  seo: ArticleSeo
  createdAt: string
}

interface Paginated<T> {
  totalItems: number
  totalPages: number
  currentPage: number
  items: T[]
}

export const ARTICLE_REVALIDATE_SECONDS = 3600

async function apiGet<T>(path: string, query?: Record<string, string | number>): Promise<T | null> {
  const baseUrl = process.env.SSU_API_URL
  const apiKey = process.env.SSU_API_KEY

  if (!baseUrl || !apiKey) {
    console.error("Artikel: SSU_API_URL / SSU_API_KEY belum diisi; melewati pemanggilan API.")
    return null
  }

  const url = new URL(`/api/v1${path}`, baseUrl)
  for (const [key, value] of Object.entries(query ?? {})) {
    url.searchParams.set(key, String(value))
  }

  try {
    const res = await fetch(url, {
      headers: { "x-api-key": apiKey },
      next: { revalidate: ARTICLE_REVALIDATE_SECONDS },
    })

    if (!res.ok) {
      if (res.status !== 404) {
        console.error(`Artikel: API menjawab ${res.status} untuk ${path}`)
      }
      return null
    }

    const body = (await res.json()) as { data?: T }
    return body.data ?? null
  } catch (error) {
    console.error(`Artikel: gagal memanggil ${path}`, error)
    return null
  }
}

export async function getArticles(options?: {
  page?: number
  limit?: number
  categorySlug?: string
  tagSlug?: string
}): Promise<Paginated<ArticleListItem>> {
  const query: Record<string, string | number> = {
    page: options?.page ?? 1,
    limit: options?.limit ?? 20,
  }
  if (options?.categorySlug) query.categorySlug = options.categorySlug
  if (options?.tagSlug) query.tagSlug = options.tagSlug

  const result = await apiGet<Paginated<ArticleListItem>>("/articles", query)

  return result ?? { totalItems: 0, totalPages: 0, currentPage: 1, items: [] }
}

export async function getArticle(slug: string): Promise<Article | null> {
  return apiGet<Article>(`/articles/${encodeURIComponent(slug)}`)
}

export async function getArticleCategories(): Promise<ArticleCategory[]> {
  return (await apiGet<ArticleCategory[]>("/article-categories")) ?? []
}
