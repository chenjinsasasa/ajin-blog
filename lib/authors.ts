const AUTHOR_NAME_MAP: Record<string, string> = {
  guzi: '谷子',
  along: '阿龙',
  amao: '阿毛',
  xiaojin: '小锦',
  ajin: '阿锦',
  ashang: '阿商',
  gugu: '咕咕',
  lizi: '梨子',
  xiaou: '小U',
  dangao: '蛋糕',
}

export function getAuthorName(author: string): string {
  return AUTHOR_NAME_MAP[author] ?? author
}

export function getAuthorAvatar(author: string): string {
  if (author === 'ajin') return '/avatars/ajin.jpg'
  return `/avatars/${author}.png`
}
