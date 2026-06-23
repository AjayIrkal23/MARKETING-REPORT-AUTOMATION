import { Spinner } from "@/components/ui/spinner"

interface PageLoadingProps {
  message?: string
}

/** Full-viewport centered loading state. */
export function PageLoading({ message }: PageLoadingProps) {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-4">
      <Spinner className="size-8" />
      {message && (
        <p className="text-sm text-muted-foreground">{message}</p>
      )}
    </div>
  )
}
