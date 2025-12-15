import random
import json

import torch

from model import NeuralNet
from nltk_utils import bag_of_words, tokenize
from utils import (
    replace_placeholders,
    has_special_day_today,
    save_recommended_tasks,
    evaluate_recommended_tasks,
    evaluate_task_completion_status,
    evaluate_future_tasks_status,
    get_group_progress,
    get_member_progress,
)

device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

with open('intents.json', 'r', encoding='utf-8') as json_data:
    intents = json.load(json_data)

FILE = "data.pth"
data = torch.load(FILE)

input_size = data["input_size"]
hidden_size = data["hidden_size"]
output_size = data["output_size"]
all_words = data['all_words']
tags = data['tags']
model_state = data["model_state"]

model = NeuralNet(input_size, hidden_size, output_size).to(device)
model.load_state_dict(model_state)
model.eval()

bot_name = "Sam"


def _get_intent_by_tag(tag: str):
    for intent in intents["intents"]:
        if intent.get("tag") == tag:
            return intent
    return None


def _build_response_for_tag(tag: str, context=None) -> str:
    intent = _get_intent_by_tag(tag)
    if not intent or not intent.get("responses"):
        return ""
    template = random.choice(intent["responses"])
    return replace_placeholders(template, context)


def _create_today_only_context(context):
    """
    Tạo context mới chỉ chứa task hôm nay để dùng cho intent todayTask.
    """
    if not context:
        return context
    
    tasks_info = context.get("tasks") or {}
    today_tasks = tasks_info.get("todayTasks") or []
    today_task_details = tasks_info.get("todayTaskDetails") or []
    
    new_context = context.copy()
    new_context["tasks"] = {
        "activeTasks": today_tasks,
        "activeTasksCount": len(today_tasks),
        "todayTasks": today_tasks,
        "todayTasksCount": len(today_tasks),
        "futureTasks": [],
        "futureTasksCount": 0,
        "activeTaskDetails": today_task_details,
        "todayTaskDetails": today_task_details,
        "futureTaskDetails": []
    }
    return new_context


def _create_future_only_context(context):
    """
    Tạo context mới chỉ chứa task tương lai để dùng cho intent recommentedTasks.
    """
    if not context:
        return context
    
    tasks_info = context.get("tasks") or {}
    future_tasks = tasks_info.get("futureTasks") or []
    future_task_details = tasks_info.get("futureTaskDetails") or []
    
    new_context = context.copy()
    new_context["tasks"] = {
        "activeTasks": future_tasks,
        "activeTasksCount": len(future_tasks),
        "todayTasks": [],
        "todayTasksCount": 0,
        "futureTasks": future_tasks,
        "futureTasksCount": len(future_tasks),
        "activeTaskDetails": future_task_details,
        "todayTaskDetails": [],
        "futureTaskDetails": future_task_details
    }
    return new_context


def get_response(msg, context=None, token=None):
    """
    Lấy câu trả lời từ mô hình và apply context (thay placeholders nếu có),
    đồng thời áp dụng các rule đặc biệt theo yêu cầu.
    """
    sentence = tokenize(msg)
    X = bag_of_words(sentence, all_words)
    X = X.reshape(1, X.shape[0])
    X = torch.from_numpy(X).to(device)

    output = model(X)
    _, predicted = torch.max(output, dim=1)

    tag = tags[predicted.item()]

    probs = torch.softmax(output, dim=1)
    prob = probs[0][predicted.item()]

    # Nếu độ tin cậy thấp, trả lời mặc định
    if prob.item() <= 0.75:
        return "I do not understand..."

    # 1. Sau câu chào user, kiểm tra ngày đặc biệt; nếu đúng, trả greeting kèm specialDay.
    if tag == "greeting":
        greeting_resp = _build_response_for_tag("greeting", context)
        special_resp = ""

        if has_special_day_today():
            special_resp = _build_response_for_tag("specialDay", context)

        # Trả cả câu chào và chúc mừng ngày đặc biệt (nếu có)
        if greeting_resp and special_resp:
            return f"{greeting_resp}\n\n{special_resp}"
        if greeting_resp:
            return greeting_resp
        if special_resp:
            return special_resp

    # 2. Logic khi user nói đã hoàn thành tất cả task (finishAllTask)
    #    Kiểm tra trạng thái thực tế từ database:
    #    - Nếu đúng (không còn task active) -> finishAllRecommentedTask
    #    - Nếu sai, kiểm tra finishTodayTask (không còn task hôm nay) -> finishTodayTask
    #    - Nếu không -> todayTask
    #    Đồng thời, nếu đã hoàn thành task hôm nay nhưng vẫn còn task khác -> thêm recommentedTasks.
    if tag == "finishAllTask":
        # Đánh giá trạng thái task từ database
        task_status = evaluate_task_completion_status(context)
        
        if task_status["all_tasks_completed"]:
            # Đúng: không còn task active nào -> trả finishAllRecommentedTask
            resp = _build_response_for_tag("finishAllRecommentedTask", context)
        else:
            # Sai: vẫn còn task, kiểm tra finishTodayTask
            if task_status["today_tasks_completed"]:
                # Đúng: không còn task hôm nay -> trả finishTodayTask
                resp = _build_response_for_tag("finishTodayTask", context)
            else:
                # Không: vẫn còn task hôm nay -> trả todayTask
                resp = _build_response_for_tag("todayTask", context)

        # Nếu đã hoàn thành task hôm nay và có task tương lai -> gợi ý thêm (chỉ task tương lai)
        if task_status["today_tasks_completed"]:
            tasks_info = (context or {}).get("tasks") or {}
            future_tasks_count = tasks_info.get("futureTasksCount") or 0
            if future_tasks_count > 0:
                # Lưu danh sách task tương lai là "task được đề xuất"
                save_recommended_tasks(token, context)
                # Tạo context riêng cho recommentedTasks chỉ chứa task tương lai
                future_context = _create_future_only_context(context)
                extra = _build_response_for_tag("recommentedTasks", future_context)
                if extra:
                    return (resp or "") + "\n\n" + extra

        if resp:
            return resp

    # 3. Khi user hỏi về task hôm nay (todayTask)
    #    - Chỉ trả lời các task có due date là hôm nay
    #    - Nếu đã hoàn thành task hôm nay và có task tương lai -> thêm recommentedTasks (chỉ task tương lai)
    if tag == "todayTask":
        task_status = evaluate_task_completion_status(context)
        # Tạo context riêng cho todayTask chỉ chứa task hôm nay
        today_context = _create_today_only_context(context)
        resp = _build_response_for_tag("todayTask", today_context)
        
        # Nếu đã hoàn thành task hôm nay và có task tương lai -> gửi thêm recommentedTasks
        if task_status["today_tasks_completed"]:
            tasks_info = (context or {}).get("tasks") or {}
            future_tasks_count = tasks_info.get("futureTasksCount") or 0
            if future_tasks_count > 0:
                # Lưu danh sách task tương lai là "task được đề xuất"
                save_recommended_tasks(token, context)
                # Tạo context riêng cho recommentedTasks chỉ chứa task tương lai
                future_context = _create_future_only_context(context)
                extra = _build_response_for_tag("recommentedTasks", future_context)
                if extra:
                    return (resp or "") + "\n\n" + extra
        
        if resp:
            return resp

    # 4. Kiểm tra trạng thái hoàn thành các task được đề xuất dựa trên database
    #    Logic:
    #    1. Nếu finishAllRecommentedTask yes → trả response của intent finishAllRecommentedTask
    #    2. Nếu không → kiểm tra finishPartOfRecommentedTask:
    #       - Nếu user báo đã làm recommented task → kiểm tra trạng thái các task ở tương lai
    #       - Nếu đúng (có một phần completed) → trả response của intent finishPartOfRecommentedTask
    #       - Nếu không đúng (chưa có task nào completed) → trả Warning
    if tag in ("finishPartOfRecommentedTask", "finishAllRecommentedTask", "Warning"):
        # Bước 1: Kiểm tra finishAllRecommentedTask trước
        eval_result = evaluate_recommended_tasks(token)
        
        if eval_result and eval_result.get("hasRecommended"):
            # Nếu tất cả task được đề xuất đã completed → trả finishAllRecommentedTask
            if eval_result.get("allCompleted"):
                resp = _build_response_for_tag("finishAllRecommentedTask", context)
                if resp:
                    return resp
            
            # Bước 2: Nếu không phải finishAllRecommentedTask, kiểm tra finishPartOfRecommentedTask
            # Chỉ xử lý khi tag là finishPartOfRecommentedTask (user báo đã làm recommented task)
            if tag == "finishPartOfRecommentedTask":
                # Ưu tiên: Kiểm tra từ recommended tasks (đã lưu trong DB, là các task tương lai)
                if eval_result.get("anyCompleted"):
                    # Đúng: có một phần task được đề xuất đã completed → trả finishPartOfRecommentedTask
                    resp = _build_response_for_tag("finishPartOfRecommentedTask", context)
                else:
                    # Không đúng: chưa có task nào completed → trả Warning
                    resp = _build_response_for_tag("Warning", context)
                
        if resp:
            return resp
        
        # Fallback: nếu không có dữ liệu DB hoặc tag không phải finishPartOfRecommentedTask
        if tag == "finishAllRecommentedTask":
            resp = _build_response_for_tag("finishAllRecommentedTask", context)
        elif tag == "finishPartOfRecommentedTask":
            # Nếu không có dữ liệu DB, kiểm tra trạng thái task tương lai từ context
            future_status = evaluate_future_tasks_status(context)
            if future_status["has_future_tasks"]:
                future_details = future_status["future_task_details"]
                completed_future_tasks = [
                    task for task in future_details 
                    if task.get("status") == "completed"
                ]
                if len(completed_future_tasks) > 0:
                    # Đúng: có một phần task tương lai đã completed → trả finishPartOfRecommentedTask
                    resp = _build_response_for_tag("finishPartOfRecommentedTask", context)
                else:
                    # Không đúng: chưa có task tương lai nào completed → trả Warning
                    resp = _build_response_for_tag("Warning", context)
            else:
                # Không có task tương lai, dùng intent mặc định
                resp = _build_response_for_tag("finishPartOfRecommentedTask", context)
        else:
            resp = _build_response_for_tag("Warning", context)

        if resp:
            return resp

    # 5. Tiến độ toàn team trong group (chỉ cho Product Owner/PM)
    if tag == "teamProgress":
        # Nếu thiếu thông tin group trong context, yêu cầu user chỉ định group
        group_info = (context or {}).get("group") or {}
        if not group_info.get("id") and not group_info.get("name"):
            ask_resp = _build_response_for_tag("AskGroupName", context)
            if ask_resp:
                return ask_resp

        progress = get_group_progress(token)
        if not progress:
            return "Chatbot chỉ hỗ trợ xem tiến độ team cho Product Owner/PM của group này, hoặc hiện chưa có dữ liệu task phù hợp."

        total = progress.get("totalTasks", 0)
        todo = progress.get("todo", {})
        in_progress = progress.get("in_progress", {})
        completed = progress.get("completed", {})
        incomplete = progress.get("incomplete", {})

        # Map sang placeholders cho intents
        team_context = {
            "team_total_tasks": total,
            "team_todo_count": todo.get("count", 0),
            "team_todo_percent": todo.get("percent", 0),
            "team_inprogress_count": in_progress.get("count", 0),
            "team_inprogress_percent": in_progress.get("percent", 0),
            "team_completed_count": completed.get("count", 0),
            "team_completed_percent": completed.get("percent", 0),
            "team_incomplete_count": incomplete.get("count", 0),
            "team_incomplete_percent": incomplete.get("percent", 0),
        }

        # Gộp vào context tạm cho replace_placeholders
        merged_context = (context or {}).copy()
        merged_context.setdefault("stats", {})
        merged_context["stats"].update(team_context)

        resp = _build_response_for_tag("teamProgress", merged_context)
        if resp:
            return resp + f"\n(Tổng số task trong group: {total})"

    # 6. Tiến độ theo từng thành viên trong group (chỉ cho Product Owner/PM)
    if tag == "memberProgress":
        # Ở phiên bản đơn giản, tạm thời yêu cầu frontend/backend truyền sẵn memberId trong context
        member_info = (context or {}).get("member") or {}
        member_id = member_info.get("id") or ""
        member_name = member_info.get("name") or "thành viên này"

        progress = get_member_progress(token, member_id)
        if not progress:
            return "Chatbot chỉ hỗ trợ xem tiến độ theo thành viên cho Product Owner/PM của group này, hoặc hiện chưa có dữ liệu task phù hợp."

        total = progress.get("totalTasks", 0)
        todo = progress.get("todo", {})
        in_progress = progress.get("in_progress", {})
        completed = progress.get("completed", {})
        incomplete = progress.get("incomplete", {})

        member_context = {
            "member_name": member_name,
            "member_total_tasks": total,
            "member_todo_count": todo.get("count", 0),
            "member_todo_percent": todo.get("percent", 0),
            "member_inprogress_count": in_progress.get("count", 0),
            "member_inprogress_percent": in_progress.get("percent", 0),
            "member_completed_count": completed.get("count", 0),
            "member_completed_percent": completed.get("percent", 0),
            "member_incomplete_count": incomplete.get("count", 0),
            "member_incomplete_percent": incomplete.get("percent", 0),
        }

        merged_context = (context or {}).copy()
        merged_context.setdefault("memberStats", {})
        merged_context["memberStats"].update(member_context)

        resp = _build_response_for_tag("memberProgress", merged_context)
        if resp:
            return resp + f"\n(Tổng số task của {member_name} trong group: {total})"

    # 7. Mặc định: dùng intent được model dự đoán với context
    resp = _build_response_for_tag(tag, context)
    if resp:
        return resp

    return "I do not understand..."


if __name__ == "__main__":
    print("Let's chat! (type 'quit' to exit)")
    while True:
        sentence = input("You: ")
        if sentence == "quit":
            break

        resp = get_response(sentence)
        print(resp)
