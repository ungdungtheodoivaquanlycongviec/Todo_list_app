import os

"""
Cấu hình cho chatbot Flask.

Có thể override bằng environment variables:
- BACKEND_API_URL: URL base của backend Node (bao gồm /api), vd: http://localhost:8080/api
- CHATBOT_DEBUG: "true"/"false" để bật log debug đơn giản
"""

BACKEND_API_URL = os.getenv("BACKEND_API_URL", "http://localhost:8080/api")

CHATBOT_DEBUG = os.getenv("CHATBOT_DEBUG", "false").lower() == "true"


