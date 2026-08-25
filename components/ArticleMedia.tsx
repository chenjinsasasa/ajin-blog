import type {
  ImgHTMLAttributes,
  VideoHTMLAttributes,
} from 'react'

function joinClassNames(...classNames: Array<string | undefined>) {
  return classNames.filter(Boolean).join(' ')
}

/**
 * Keep article media in the server-rendered document.
 *
 * These components intentionally do not use client-side state or observers:
 * an article remains readable even when a media script cannot run.
 */
export function ArticleImage({
  alt = '',
  className,
  decoding,
  loading,
  onError: _onError,
  onLoad: _onLoad,
  ...props
}: ImgHTMLAttributes<HTMLImageElement>) {
  return (
    <span className="article-image-shell article-image-shell--native">
      <img
        {...props}
        alt={alt}
        className={joinClassNames('article-image', className)}
        decoding={decoding ?? 'async'}
        loading={loading ?? 'lazy'}
      />
    </span>
  )
}

export function ArticleVideo({
  children,
  className,
  controls = true,
  preload: _preload,
  ...props
}: VideoHTMLAttributes<HTMLVideoElement>) {
  return (
    <span className="article-video-shell article-video-shell--native">
      <video
        {...props}
        className={className}
        controls={controls}
        preload="none"
      >
        {children}
      </video>
    </span>
  )
}
