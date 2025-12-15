import logging
from datetime import date
from typing import Any, Dict, Optional, Tuple

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


def format_task_list(context: Optional[Dict[str, Any]], task_type: str = "all") -> str:
    """
    Format danh sách task từ context thành 1 chuỗi đẹp.
    
    Args:
        context: Context từ backend
        task_type: "all" (tất cả), "today" (chỉ hôm nay), "future" (chỉ tương lai)
    """
    if not context:
        return ""

    tasks_info = context.get("tasks") or {}
    
    if task_type == "today":
        active_tasks = tasks_info.get("todayTasks") or []
        if not active_tasks:
            return "Hôm nay bạn không có task nào cần hoàn thành."
    elif task_type == "future":
        active_tasks = tasks_info.get("futureTasks") or []
        if not active_tasks:
            return "Hiện tại bạn không có task nào trong tương lai."
    else:
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


def _fetch_json_with_auth(url: str, token: Optional[str]) -> Optional[Dict[str, Any]]:
    """Helper: gọi GET JSON với Bearer token, trả về data.get('data')."""
    if not token:
        return None

    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
    }

    try:
        _debug_log("Fetching JSON with auth", url=url)
        resp = requests.get(url, headers=headers, timeout=5)
        _debug_log("JSON with auth response", status=resp.status_code)

        if resp.status_code != 200:
            return None

        data = resp.json()
        return data.get("data") if isinstance(data, dict) else data
    except Exception as exc:  # pylint: disable=broad-except
        logger.exception("Error while fetching JSON with auth: %s", exc)
        return None


def get_group_progress(token: Optional[str]) -> Optional[Dict[str, Any]]:
    """
    Lấy thống kê tiến độ cả team trong group hiện tại cho Product Owner/PM.
    Trả về dict dạng:
    {
      "totalTasks": int,
      "todo": { "count": int, "percent": float },
      "in_progress": { "count": int, "percent": float },
      "completed": { "count": int, "percent": float },
      "incomplete": { "count": int, "percent": float }
    }
    """
    url = f"{BACKEND_API_URL}/chatbot/group-progress"
    return _fetch_json_with_auth(url, token)


def get_member_progress(token: Optional[str], member_id: str) -> Optional[Dict[str, Any]]:
    """
    Lấy thống kê tiến độ cho một thành viên trong group hiện tại cho Product Owner/PM.
    """
    if not member_id:
        return None
    url = f"{BACKEND_API_URL}/chatbot/member-progress?memberId={member_id}"
    return _fetch_json_with_auth(url, token)


def save_recommended_tasks(token: Optional[str], context: Optional[Dict[str, Any]]) -> None:
    """
    Gửi danh sách task được đề xuất gần nhất lên backend để lưu lại cho user hiện tại.
    Chỉ lấy task có dueDate ở tương lai (futureTaskDetails).
    """
    if not token or not context:
        return

    tasks_info = context.get("tasks") or {}
    # Chỉ lấy task tương lai cho recommended tasks
    details = tasks_info.get("futureTaskDetails") or []
    task_ids = [item.get("id") for item in details if item.get("id")]

    if not task_ids:
        return

    url = f"{BACKEND_API_URL}/chatbot/recommended-tasks"
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }

    try:
        _debug_log("Saving recommended tasks (future only)", count=len(task_ids))
        resp = requests.post(url, headers=headers, json={"taskIds": task_ids}, timeout=5)
        _debug_log("Save recommended tasks response", status=resp.status_code)
    except Exception as exc:  # pylint: disable=broad-except
        logger.exception("Error while saving recommended tasks: %s", exc)


def evaluate_recommended_tasks(token: Optional[str]) -> Optional[Dict[str, Any]]:
    """
    Hỏi backend trạng thái hoàn thành của các task được đề xuất:
    - allCompleted
    - anyCompleted
    - noneCompleted
    - hasRecommended
    """
    if not token:
        return None

    url = f"{BACKEND_API_URL}/chatbot/recommended-tasks/evaluate"
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
    }

    try:
        _debug_log("Evaluating recommended tasks")
        resp = requests.get(url, headers=headers, timeout=5)
        _debug_log("Evaluate recommended tasks response", status=resp.status_code)

        if resp.status_code != 200:
            return None

        data = resp.json()
        result = data.get("data") if isinstance(data, dict) else None
        if not result:
            result = data
        return result
    except Exception as exc:  # pylint: disable=broad-except
        logger.exception("Error while evaluating recommended tasks: %s", exc)
        return None


def evaluate_future_tasks_status(context: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Đánh giá trạng thái các task tương lai (future tasks) từ context.
    
    Trả về dict với:
    - has_future_tasks: True nếu có task tương lai
    - future_tasks_count: Số lượng task tương lai
    - future_task_details: Danh sách chi tiết task tương lai
    """
    if not context:
        return {
            "has_future_tasks": False,
            "future_tasks_count": 0,
            "future_task_details": []
        }
    
    tasks_info = context.get("tasks") or {}
    future_tasks_count = tasks_info.get("futureTasksCount") or 0
    future_task_details = tasks_info.get("futureTaskDetails") or []
    
    return {
        "has_future_tasks": future_tasks_count > 0,
        "future_tasks_count": future_tasks_count,
        "future_task_details": future_task_details
    }


def evaluate_task_completion_status(context: Optional[Dict[str, Any]]) -> Dict[str, bool]:
    """
    Đánh giá trạng thái hoàn thành task dựa trên context từ database.
    
    Trả về dict với các flag:
    - all_tasks_completed: True nếu không còn task active nào
    - today_tasks_completed: True nếu không còn task hôm nay nào
    - has_active_tasks: True nếu vẫn còn task active
    - has_today_tasks: True nếu vẫn còn task hôm nay
    
    Logic:
    - all_tasks_completed = (activeTasksCount == 0)
    - today_tasks_completed = (todayTasksCount == 0)
    - has_active_tasks = (activeTasksCount > 0)
    - has_today_tasks = (todayTasksCount > 0)
    """
    if not context:
        return {
            "all_tasks_completed": False,
            "today_tasks_completed": False,
            "has_active_tasks": True,
            "has_today_tasks": True,
        }
    
    tasks_info = context.get("tasks") or {}
    active_tasks_count = tasks_info.get("activeTasksCount") or 0
    today_tasks_count = tasks_info.get("todayTasksCount") or 0
    
    return {
        "all_tasks_completed": active_tasks_count == 0,
        "today_tasks_completed": today_tasks_count == 0,
        "has_active_tasks": active_tasks_count > 0,
        "has_today_tasks": today_tasks_count > 0,
    }


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
    group_info = context.get("group") or {}
    stats = context.get("stats") or {}
    member_stats = context.get("memberStats") or {}

    full_name = user.get("name") or ""
    firstname = user.get("firstname") or ""
    gender = user.get("gender") or "bạn"

    active_tasks_count = tasks.get("activeTasksCount") or 0
    today_tasks_count = tasks.get("todayTasksCount") or 0
    future_tasks_count = tasks.get("futureTasksCount") or 0

    # Chuỗi mô tả danh sách task
    active_tasks_str = format_task_list(context, "all")
    today_tasks_str = format_task_list(context, "today")
    future_tasks_str = format_task_list(context, "future")

    mapping = {
        "user_name": full_name,
        "user_firstname": firstname or full_name,
        "gender": gender,
        "Gender": _capitalize_first(gender),
        "activeTasks": active_tasks_str,
        "activeTasksCount": str(active_tasks_count),
        "todayTasks": today_tasks_str,
        "todayTasksCount": str(today_tasks_count),
        "futureTasks": future_tasks_str,
        "futureTasksCount": str(future_tasks_count),
        "current_date": date_info.get("current_date") or "",
        "current_date_vn": date_info.get("current_date_vn") or "",
        # Thông tin group
        "group_name": group_info.get("name") or "",
        # Các placeholder mở rộng
        "special_day": get_today_special_day_label(),
        # Thống kê tiến độ team
        "team_total_tasks": str(stats.get("team_total_tasks", 0)),
        "team_todo_count": str(stats.get("team_todo_count", 0)),
        "team_todo_percent": str(stats.get("team_todo_percent", 0)),
        "team_inprogress_count": str(stats.get("team_inprogress_count", 0)),
        "team_inprogress_percent": str(stats.get("team_inprogress_percent", 0)),
        "team_completed_count": str(stats.get("team_completed_count", 0)),
        "team_completed_percent": str(stats.get("team_completed_percent", 0)),
        "team_incomplete_count": str(stats.get("team_incomplete_count", 0)),
        "team_incomplete_percent": str(stats.get("team_incomplete_percent", 0)),
        # Thống kê tiến độ theo thành viên
        "member_name": member_stats.get("member_name", ""),
        "member_total_tasks": str(member_stats.get("member_total_tasks", 0)),
        "member_todo_count": str(member_stats.get("member_todo_count", 0)),
        "member_todo_percent": str(member_stats.get("member_todo_percent", 0)),
        "member_inprogress_count": str(member_stats.get("member_inprogress_count", 0)),
        "member_inprogress_percent": str(member_stats.get("member_inprogress_percent", 0)),
        "member_completed_count": str(member_stats.get("member_completed_count", 0)),
        "member_completed_percent": str(member_stats.get("member_completed_percent", 0)),
        "member_incomplete_count": str(member_stats.get("member_incomplete_count", 0)),
        "member_incomplete_percent": str(member_stats.get("member_incomplete_percent", 0)),
        "location": "",
        "weather_condition": "",
        "temperature": "",
    }

    result = template
    for key, value in mapping.items():
        placeholder = "{" + key + "}"
        result = result.replace(placeholder, value)

    return result



