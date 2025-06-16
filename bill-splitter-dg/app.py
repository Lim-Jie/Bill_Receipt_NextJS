from flask import Flask, request, jsonify
from google.cloud import vision

import google.generativeai as genai
import io
import os
from flask_cors import CORS
from dotenv import load_dotenv

app = Flask(__name__)
CORS(app)  # Allow all origins

# Load environment variables
load_dotenv(dotenv_path=".env.local")

# Setup
os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = os.getenv('GOOGLE_APPLICATION_CREDENTIALS_PATH')
genai.configure(api_key=os.getenv('GEMINI_API_KEY'))

PROMPT_TEMPLATE = """
You are a helpful assistant that extracts structured data from OCR-detected receipt text.

Given the raw receipt text below, extract and format the data according to these specifications:

1. Generate a bill_id with format "BILL" + current date (YYYYMMDD) + "-001"
2. Extract restaurant/store name, date, and time
3. Classify the receipt into one of these categories: "Food", "Education", "Transportation", "Clothing", "Entertainment", or "Other"
   - Food: restaurants, cafes, grocery stores, food delivery
   - Education: books, courses, tuition, school supplies
   - Transportation: gas, ride-sharing, public transit, parking
   - Clothing: apparel, shoes, accessories
   - Entertainment: movies, events, subscriptions
   - Other: anything that doesn't fit the above categories
4. Calculate tax_rate and service_charge_rate if possible (default to 0.06 and 0.1 respectively)
5. Extract all items with details
6. Set "split_method" to "item_based"
7. Create a default participant using the first email found (or "alice@example.com" if none)
8. Assign all items to the first participant initially

Return the data in EXACTLY this JSON format:
{
  "bill_id": "BILL20250606-001",
  "name": "Restaurant Name",
  "date": "YYYY-MM-DD",
  "time": "HH:MM",
  "category": "Food",
  "tax_rate": 0.06,
  "service_charge_rate": 0.1,
  "subtotal_amount": 0.00,
  "tax_amount": 0.00,
  "service_charge_amount": 0.00,
  "nett_amount": 0.00,
  "paid_by": "alice@example.com",
  "items": [
    {
      "id": 1,
      "name": "Item Name",
      "price": 0.00,
      "tax_amount": 0.00,
      "nett_price": 0.00,
      "quantity": 1,
      "consumed_by": []
    }
  ],
  "split_method": "item_based",
  "participants": [
    {
      "email": "alice@example.com",
      "total_paid": 0.00,
      "items_paid": [
        { "id": 1, "percentage": 100, "value": 0.00 }
      ]
    },
    {
      "email": "lijiebiz@gmail.com",
      "total_paid": 0,
      "items_paid": []
    },
    {
      "email": "charlie@gmail.com",
      "total_paid": 0,
      "items_paid": []
    }
  ],
  "notes": "Brief description of any special charges or notes"
}

Raw text:
---
{{RECEIPT_TEXT}}
---
IMPORTANT: Return ONLY the raw JSON object. Do NOT include any explanations, formatting, or code block markers like triple backticks. Return just plain JSON with no decoration.
"""

def extract_text_from_image(image_bytes):
    client = vision.ImageAnnotatorClient()
    image = vision.Image(content=image_bytes)
    response = client.text_detection(image=image)
    if response.error.message:
        raise Exception(response.error.message)
    return response.text_annotations[0].description if response.text_annotations else ""



def clean_json_response(text):
    # Remove triple backticks and optional 'json' language hint
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\n", "", text, flags=re.IGNORECASE)
        text = re.sub(r"\n```$", "", text)
    return text.strip()

def generate_structured_output(ocr_text):
    model = genai.GenerativeModel(model_name="models/gemini-2.0-flash-lite")
    prompt = PROMPT_TEMPLATE.replace("{{RECEIPT_TEXT}}", ocr_text)
    response = model.generate_content(prompt)
    cleaned_response = clean_json_response(response.text)
    return cleaned_response

@app.route("/analyze-receipt", methods=["POST"])
def analyze_receipt():
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files['file']
    image_bytes = file.read()

    ocr_text = extract_text_from_image(image_bytes)
    structured_output_text = generate_structured_output(ocr_text)

    try:
        structured_output = json.loads(structured_output_text)
    except json.JSONDecodeError as e:
        return jsonify({
            "raw_text": ocr_text,
            "error": f"Invalid JSON from Gemini: {str(e)}",
            "structured_data_raw": structured_output_text
        }), 500

    return jsonify({
        "raw_text": ocr_text,
        "structured_data": structured_output
    })


if __name__ == "__main__":
    app.run(debug=True)
