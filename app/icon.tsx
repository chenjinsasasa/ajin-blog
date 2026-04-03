export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new Response(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
      <text y="26" font-size="26" font-family="Apple Color Emoji,Segoe UI Emoji,sans-serif">📝</text>
    </svg>`,
    { headers: { 'Content-Type': 'image/svg+xml' } }
  )
}
