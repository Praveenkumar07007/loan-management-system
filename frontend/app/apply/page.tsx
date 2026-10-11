"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function ApplyPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to my-loans page - the form is now a slide-over panel there
    router.replace('/my-loans')
  }, [router])

  return null
}
