export async function POST(request) {
  try {
    // Get the form data from the request
    const formData = await request.formData()
    
    // Forward the form data to your backend
    const response = await fetch(`${process.env.MAIN_BACKEND_API}/analyze-receipt`, {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Backend error:", errorText)
      throw new Error(`Backend error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    
    return Response.json(data)
  } catch (error) {
    console.error('API route error:', error)
    return Response.json(
      { error: 'Failed to analyze receipt', details: error.message },
      { status: 500 }
    )
  }
}