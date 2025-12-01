import logging
from datetime import date
from typing import Any, Dict, Optional

import requests

from config import BACKEND_API_URL, CHATBOT_DEBUG


logger = logging.getLogger(__name__)


def _debug_log(message: str, **kwargs: Any) -> None:
    """Log đơn giản khi bật CHATBOT_DEBUG."""
    if CHATBOT_DEBUG:
        extra = f" | {kwargs}" if kwargs else ""
        print(f"[CHATBOT_DEBUG] {message}{extra}")


def get_user_context(token: Optional[str]) -> Optional[Dict[str, Any]]:
    """
    Gọi backend để lấy context cho chatbot.

    - token: JWT token từ frontend (localStorage accessToken)
    - Trả về: object context (user, tasks, date, ...) hoặc None nếu lỗi.
    """
    if not token:
        _debug_log("No token provided, skipping context fetch")
        return None

    url = f"{BACKEND_API_URL}/chatbot/context"
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
    }

    try:
        _debug_log("Fetching chatbot context from backend", url=url)
        resp = requests.get(url, headers=headers, timeout=5)
        _debug_log("Backend context response", status=resp.status_code)

        if resp.status_code != 200:
            logger.warning(
                "Failed to fetch chatbot context: %s %s",
                resp.status_code,
                resp.text[:200],
            )
            return None

        data = resp.json()
        # Backend đang dùng sendSuccess nên data thường nằm trong field "data"
        context = data.get("data") if isinstance(data, dict) else None
        if not context:
            context = data

        return context
    except Exception as exc:  # pylint: disable=broad-except
        logger.exception("Error while fetching chatbot context: %s", exc)
        return None


def format_task_list(context: Optional[Dict[str, Any]]) -> str:
    """
    Format danh sách task từ context.tasks.activeTasks thành 1 chuỗi đẹp.
    """
    if not context:
        return ""

    tasks_info = context.get("tasks") or {}
    active_tasks = tasks_info.get("activeTasks") or []

    if not active_tasks:
        return "Hiện tại bạn không có task nào đang hoạt động."

    # Dạng bullet list
    lines = [f"- {title}" for title in active_tasks]
    return "\n".join(lines)


def _capitalize_first(value: str) -> str:
    return value[:1].upper() + value[1:] if value else value


def get_today_special_day_label() -> str:
    """
    Xác định ngày đặc biệt hôm nay (dạng chuỗi mô tả) để dùng cho intent specialDay.
    Chỉ xử lý các ngày dương lịch phổ biến giống trong ví dụ intents.json.
    """
    today = date.today()
    key = (today.month, today.day)

    special_days = {
        (1, 1): "Ngày Tết Dương lịch 1/1",
        (2, 14): "Ngày Valentine 14/2",
        (3, 8): "Ngày Quốc tế Phụ nữ 8/3",
        (4, 14): "Ngày Lễ Tình nhân Đen 14/4",
        (6, 1): "Ngày Quốc tế Thiếu nhi 1/6",
        (9, 2): "Ngày Quốc khánh 2/9",
        (10, 31): "Ngày Halloween 31/10",
        (11, 20): "Ngày Nhà giáo Việt Nam 20/11",
        (12, 25): "Ngày Giáng Sinh 25/12",
    }

    return special_days.get(key, "")


def has_special_day_today() -> bool:
    """Trả về True nếu hôm nay là 1 trong các ngày đặc biệt được hỗ trợ."""
    return bool(get_today_special_day_label())


def replace_placeholders(template: str, context: Optional[Dict[str, Any]]) -> str:
    """
    Thay thế các placeholders trong câu trả lời bằng dữ liệu thật từ context.

    Hỗ trợ các placeholder trong intents.json:
    - {user_name}, {user_firstname}
    - {gender}, {Gender}
    - {activeTasks}, {activeTasksCount}
    - {current_date}, {current_date_vn}
    - {special_day} (tự xác định theo ngày hiện tại)
    """
    if not context:
        # Vẫn xử lý {special_day} nếu không có context
        special_day = get_today_special_day_label()
        return template.replace("{special_day}", special_day)

    user = context.get("user") or {}
    tasks = context.get("tasks") or {}
    date_info = context.get("date") or {}

    full_name = user.get("name") or ""
    firstname = user.get("firstname") or ""
    gender = user.get("gender") or "bạn"

    active_tasks_count = tasks.get("activeTasksCount") or 0

    # Chuỗi mô tả danh sách task
    active_tasks_str = format_task_list(context)

    mapping = {
        "user_name": full_name,
        "user_firstname": firstname or full_name,
        "gender": gender,
        "Gender": _capitalize_first(gender),
        "activeTasks": active_tasks_str,
        "activeTasksCount": str(active_tasks_count),
        "current_date": date_info.get("current_date") or "",
        "current_date_vn": date_info.get("current_date_vn") or "",
        # Các placeholder mở rộng
        "special_day": get_today_special_day_label(),
        "location": "",
        "weather_condition": "",
        "temperature": "",
    }

    result = template
    for key, value in mapping.items():
        placeholder = "{" + key + "}"
        result = result.replace(placeholder, value)

    return result



