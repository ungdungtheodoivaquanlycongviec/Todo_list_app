from flask import Flask, render_template, request, jsonify
from flask_cors import CORS

from chat import get_response
from utils import get_user_context

app = Flask(__name__)
CORS(app)


@app.get("/")
def index_get():
    return render_template("base.html")


@app.post("/predict")
def predict():
    """
    Endpoint chính cho chatbot.
    Frontend gửi:
    {
      "message": "...",
      "token": "<JWT accessToken>"
    }
    """
    data = request.get_json(silent=True) or {}
    text = data.get("message", "")
    token = data.get("token")

    if not text or not text.strip():
        return jsonify({"error": "Message cannot be empty"}), 400

    # Lấy context từ backend (nếu có token)
    context = get_user_context(token)

    # Lấy câu trả lời từ model và apply context
    response_text = get_response(text, context=context)

    message = {
        "answer": response_text,
        "context": context,
    }
    return jsonify(message)


if __name__ == "__main__":
    app.run(debug=True)