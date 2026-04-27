interface SectionIntroProps {
  eyebrow: string
  title: string
  description?: string
  titleAs?: 'h1' | 'h2' | 'h3'
}

export function SectionIntro({
  eyebrow,
  title,
  description,
  titleAs = 'h2',
}: SectionIntroProps) {
  const TitleTag = titleAs

  return (
    <section className="section-intro">
      <p className="section-intro__eyebrow">{eyebrow}</p>
      <TitleTag className="section-intro__title">{title}</TitleTag>
      {description ? <p className="section-intro__description">{description}</p> : null}
    </section>
  )
}
