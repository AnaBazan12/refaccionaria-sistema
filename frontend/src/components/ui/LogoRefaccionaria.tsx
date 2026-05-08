export default function LogoRefaccionaria({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Refaccionaria Sistema"
    >
      <rect width="40" height="40" rx="10" fill="#7c3aed" />

      {/* Gear outer ring */}
      <circle cx="20" cy="20" r="8" stroke="white" strokeWidth="2" fill="none" />
      <circle cx="20" cy="20" r="3.5" fill="white" fillOpacity="0.5" />

      {/* Gear teeth — 8 pequeñas líneas radiales */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
        const rad = (deg * Math.PI) / 180
        const x1 = 20 + 8  * Math.cos(rad)
        const y1 = 20 + 8  * Math.sin(rad)
        const x2 = 20 + 12 * Math.cos(rad)
        const y2 = 20 + 12 * Math.sin(rad)
        return (
          <line
            key={deg}
            x1={x1} y1={y1}
            x2={x2} y2={y2}
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        )
      })}

      {/* Llave inglesa encima del engranaje */}
      <path
        d="M24.5 10.5 C26.5 10.5 28 12 28 14 C28 14.6 27.8 15.2 27.5 15.7 L26 17.2 L22.8 14 L24.3 12.5 C23.8 12.2 23.2 12 22.5 12 C20.6 12 19 13.6 19 15.5 C19 16.1 19.2 16.7 19.5 17.2 L13 23.7 C12.5 23.4 11.9 23.2 11.3 23.2 C9.4 23.2 7.8 24.8 7.8 26.7 C7.8 28.6 9.4 30.2 11.3 30.2 C13.2 30.2 14.8 28.6 14.8 26.7 C14.8 26.1 14.6 25.5 14.3 25 L20.8 18.5 C21.3 18.8 21.9 19 22.5 19 C24.4 19 26 17.4 26 15.5 L24.5 10.5 Z"
        fill="white"
        opacity="0.9"
      />
    </svg>
  )
}
