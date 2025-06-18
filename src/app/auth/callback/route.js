import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function GET(request) {
  try {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get("code")

    if (code) {
      const cookieStore = cookies()
      const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

      const { error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        console.error("Auth error:", error)
        return NextResponse.redirect(`${requestUrl.origin}/login?error=auth_error`)
      }
    }

    // Redirect to dashboard on success
    return NextResponse.redirect(`${requestUrl.origin}/`)
  } catch (error) {
    console.error("Callback error:", error)
    const requestUrl = new URL(request.url)
    return NextResponse.redirect(`${requestUrl.origin}/login?error=callback_error`)
  }
}
