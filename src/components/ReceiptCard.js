import { Card } from "@/components/ui/card"

const ReceiptCard = ({ children, className = "" }) => {
  return (
    <div className={`receipt-card-container ${className}`}>
      <Card className="receipt-card-modern">
        {children}
      </Card>
    </div>
  )
}

export default ReceiptCard