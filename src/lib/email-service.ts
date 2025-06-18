interface EmailData {
  to: string
  subject: string
  html: string
}

export async function sendEmail(emailData: EmailData) {
  try {
    console.log("Sending email to:", emailData.to)

    // For now, we'll use a simple email service
    // You can replace this with your preferred email service (SendGrid, Resend, etc.)
    const response = await fetch("/api/send-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailData),
    })

    console.log("Email API response status:", response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Email API error:", errorText)
      throw new Error(`Failed to send email: ${response.status} - ${errorText}`)
    }

    const result = await response.json()
    console.log("Email sent successfully:", result)
    return result
  } catch (error) {
    console.error("Error sending email:", error)
    throw error
  }
}

export function generateBillSplitEmail(
  recipientName: string,
  billName: string,
  totalAmount: number,
  userAmount: number,
  items: Array<{ name: string; price: number }>,
  senderName: string,
) {
  const itemsList = items.map((item) => `<li>${item.name} - $${item.price.toFixed(2)}</li>`).join("")

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Bill Split - ${billName}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
        .content { background: white; padding: 30px; border: 1px solid #e1e5e9; }
        .footer { background: #f8f9fa; padding: 20px; border-radius: 0 0 10px 10px; text-align: center; font-size: 14px; color: #666; }
        .amount { font-size: 32px; font-weight: bold; color: #667eea; text-align: center; margin: 20px 0; }
        .items { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .items ul { margin: 0; padding-left: 20px; }
        .items li { margin: 8px 0; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .summary { background: #e8f4fd; padding: 20px; border-radius: 8px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>💰 Bill Split</h1>
          <p>You've been included in a bill split</p>
        </div>
        
        <div class="content">
          <h2>Hi ${recipientName}! 👋</h2>
          
          <p><strong>${senderName}</strong> has split a bill with you from <strong>${billName}</strong>.</p>
          
          <div class="amount">
            Your share: $${userAmount.toFixed(2)}
          </div>
          
          <div class="summary">
            <h3>📋 Bill Summary</h3>
            <p><strong>Restaurant:</strong> ${billName}</p>
            <p><strong>Total Bill:</strong> $${totalAmount.toFixed(2)}</p>
            <p><strong>Your Share:</strong> $${userAmount.toFixed(2)}</p>
          </div>
          
          ${
            items.length > 0
              ? `
          <div class="items">
            <h3>🍽️ Your Items</h3>
            <ul>
              ${itemsList}
            </ul>
          </div>
          `
              : ""
          }
          
          <p>Please settle your portion with ${senderName} at your convenience.</p>
          
          <div style="text-align: center;">
            <a href="#" class="button">View Full Details</a>
          </div>
        </div>
        
        <div class="footer">
          <p>This email was sent from the Bill Splitter app</p>
          <p>If you have any questions, please contact ${senderName} directly.</p>
        </div>
      </div>
    </body>
    </html>
  `
}
