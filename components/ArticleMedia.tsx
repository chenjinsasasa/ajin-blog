'use client'

import {
  Children,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type ImgHTMLAttributes,
  type ReactNode,
  type SourceHTMLAttributes,
  type VideoHTMLAttributes,
} from 'react'

function joinClassNames(...classNames: Array<string | undefined>) {
  return classNames.filter(Boolean).join(' ')
}

export function ArticleImage({
  alt = '',
  className,
  decoding,
  loading,
  onError,
  onLoad,
  ...props
}: ImgHTMLAttributes<HTMLImageElement>) {
  const imageRef = useRef<HTMLImageElement>(null)
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading')

  useEffect(() => {
    const image = imageRef.current
    if (!image?.complete) return

    setStatus(image.naturalWidth > 0 ? 'loaded' : 'error')
  }, [])

  return (
    <span
      className={`article-image-shell article-image-shell--${status}`}
      aria-busy={status === 'loading'}
    >
      <img
        {...props}
        ref={imageRef}
        alt={alt}
        className={joinClassNames('article-image', className)}
        decoding={decoding ?? 'async'}
        loading={loading ?? 'lazy'}
        onError={(event) => {
          setStatus('error')
          onError?.(event)
        }}
        onLoad={(event) => {
          setStatus('loaded')
          onLoad?.(event)
        }}
      />
      {status === 'loading' && (
        <span className="article-image-shell__status" aria-live="polite">
          正在加载图片
        </span>
      )}
      {status === 'error' && (
        <span className="article-image-shell__status article-image-shell__status--error" role="status">
          图片加载失败
        </span>
      )}
    </span>
  )
}

function getVideoChildren(children: ReactNode) {
  let sourceProps: SourceHTMLAttributes<HTMLSourceElement> | undefined
  const fallbackChildren: ReactNode[] = []

  Children.forEach(children, (child) => {
    if (isValidElement(child) && child.type === 'source') {
      sourceProps = child.props as SourceHTMLAttributes<HTMLSourceElement>
      return
    }

    fallbackChildren.push(child)
  })

  return { fallbackChildren, sourceProps }
}

export function ArticleVideo({
  children,
  className,
  controls = true,
  onCanPlay,
  onError,
  onLoadedData,
  preload,
  ...props
}: VideoHTMLAttributes<HTMLVideoElement>) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [hasSource, setHasSource] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const { fallbackChildren, sourceProps } = getVideoChildren(children)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (!('IntersectionObserver' in window)) {
      setHasSource(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        setHasSource(true)
        observer.disconnect()
      },
      { rootMargin: '480px 0px' },
    )

    observer.observe(video)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (hasSource) videoRef.current?.load()
  }, [hasSource, loadAttempt])

  const activate = () => {
    setHasError(false)
    setIsReady(false)
    setHasSource(true)
  }

  const retry = () => {
    setHasError(false)
    setIsReady(false)
    setHasSource(true)
    setLoadAttempt((attempt) => attempt + 1)
  }

  const state = hasError ? 'error' : hasSource && !isReady ? 'loading' : hasSource ? 'ready' : 'idle'

  return (
    <span className={`article-video-shell article-video-shell--${state}`}>
      <video
        {...props}
        ref={videoRef}
        className={className}
        controls={hasSource && controls}
        preload={hasSource ? preload ?? 'metadata' : 'none'}
        onCanPlay={(event) => {
          setIsReady(true)
          onCanPlay?.(event)
        }}
        onError={(event) => {
          setHasError(true)
          onError?.(event)
        }}
        onLoadedData={(event) => {
          setIsReady(true)
          onLoadedData?.(event)
        }}
      >
        {hasSource && sourceProps?.src && <source key={loadAttempt} {...sourceProps} />}
        {hasSource && fallbackChildren}
      </video>

      {state === 'idle' && (
        <button type="button" className="article-video-shell__action" onClick={activate}>
          加载视频
        </button>
      )}
      {state === 'loading' && (
        <span className="article-video-shell__status" aria-live="polite">
          视频加载中
        </span>
      )}
      {state === 'error' && (
        <span className="article-video-shell__status article-video-shell__status--error" role="status">
          视频加载失败
          <button type="button" className="article-video-shell__action" onClick={retry}>
            重试
          </button>
        </span>
      )}
    </span>
  )
}
