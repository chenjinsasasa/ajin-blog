'use client'

import Image, { type ImageProps } from 'next/image'
import { useState } from 'react'

/** Keep the layout stable when a declared cover is temporarily unavailable. */
export default function CoverImage({ showUnavailable = true, alt, ...props }: ImageProps & { showUnavailable?: boolean }) {
  const [failedSource, setFailedSource] = useState('')
  const source = typeof props.src === 'string' ? props.src : 'src' in props.src ? props.src.src : props.src.default.src

  if (failedSource === source) {
    return showUnavailable ? <span className="cover-image-unavailable">封面暂不可用</span> : null
  }

  return <Image {...props} alt={alt} onError={() => setFailedSource(source)} />
}
