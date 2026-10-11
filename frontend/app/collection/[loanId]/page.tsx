import { Suspense } from "react"
import { CollectionPageContent } from "./collection-page-content"

export default function CollectionPage({ params }: { params: Promise<{ loanId: string }> }) {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    }>
      <CollectionPageContent params={params} />
    </Suspense>
  )
}
