type BrandingLogoProps = {
  src: string
  alt: string
  variant?: "color" | "white"
  className?: string
}

/** Renders uploaded logos with correct transparency (avoids black matte on mobile/PWA). */
export function BrandingLogo({
  src,
  alt,
  variant = "color",
  className = "",
}: BrandingLogoProps) {
  return (
    <img
      src={src}
      alt={alt}
      className={`bg-transparent object-contain ${className}`}
      style={{
        backgroundColor: "transparent",
        ...(variant === "white"
          ? undefined
          : { imageRendering: "auto" as const }),
      }}
    />
  )
}
