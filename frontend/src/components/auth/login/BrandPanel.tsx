/**
 * Left brand/showcase panel for the login screen. Always deep-navy
 * (`bg-sidebar`) in both light and dark modes — a fixed brand anchor. Hidden
 * below `lg`. Purely presentational.
 */
export function BrandPanel() {
  return (
    <aside className="relative hidden flex-col justify-between overflow-hidden bg-sidebar p-12 text-sidebar-foreground lg:flex">
      {/* Soft indigo glow, upper-right */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-28 -right-24 size-[30rem] rounded-full bg-sidebar-primary/15 blur-3xl"
      />
      {/* Blueprint grid motif, fading toward the lower-right */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(to right, var(--sidebar-foreground) 1px, transparent 1px), linear-gradient(to bottom, var(--sidebar-foreground) 1px, transparent 1px)",
          backgroundSize: "34px 34px",
          maskImage: "radial-gradient(130% 80% at 85% 100%, black, transparent 72%)",
          WebkitMaskImage: "radial-gradient(130% 80% at 85% 100%, black, transparent 72%)",
        }}
      />

      {/* Logo on a clean chip so the brand reads on navy */}
      <div className="relative z-10">
        <span className="inline-flex rounded-md bg-white px-4 py-3 shadow-sm">
          <img src="/logo.png" alt="JSW Steel" className="h-14 w-auto" />
        </span>
        <div className="mt-3 h-1 w-10 rounded-full bg-sidebar-primary/70" />
      </div>

      {/* Headline + sub-copy */}
      <div className="relative z-10 max-w-md motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:duration-700">
        <h2 className="text-4xl leading-tight tracking-tight">
          <span className="block font-light text-sidebar-foreground/90">West-Central Region</span>
          <span className="block font-bold">Performance Intelligence.</span>
        </h2>
        <p className="mt-4 max-w-sm text-sm leading-relaxed text-sidebar-foreground/70">
          SAP-integrated credit, stock, and dispatch analytics for JSW Steel&apos;s marketing
          operations.
        </p>
      </div>

      {/* Trust line */}
      <p className="relative z-10 text-xs tracking-wide text-sidebar-foreground/45">
        JSW Steel Ltd. · Authorized personnel only · All activity is monitored and logged.
      </p>
    </aside>
  )
}
