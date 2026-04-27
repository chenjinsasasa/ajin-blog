import type { PostMeta } from '@/lib/posts'
import { getPostCategoryTagLabel } from '@/lib/postPresentation'

interface PostCategoryTagProps {
  category: PostMeta['category']
}

export function PostCategoryTag({ category }: PostCategoryTagProps) {
  return (
    <span className={`tag ${category === 'progress' ? 'tag-progress' : 'tag-diary'}`}>
      {getPostCategoryTagLabel(category)}
    </span>
  )
}
