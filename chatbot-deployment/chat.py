import random
import json

import torch

from model import NeuralNet
from nltk_utils import bag_of_words, tokenize
from utils import replace_placeholders, has_special_day_today

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


def get_response(msg, context=None):
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

    # Lấy thông tin tasks từ context (nếu có)
    tasks_info = (context or {}).get("tasks") or {}
    active_tasks_count = tasks_info.get("activeTasksCount") or 0
    today_tasks_count = tasks_info.get("todayTasksCount") or 0

    # 1. Sau câu chào user, kiểm tra ngày đặc biệt; nếu đúng, trả response từ intent specialDay.
    if tag == "greeting":
        if has_special_day_today():
            resp = _build_response_for_tag("specialDay", context)
            if resp:
                return resp
        # Không phải ngày đặc biệt hoặc không tìm thấy intent -> dùng greeting bình thường
        resp = _build_response_for_tag("greeting", context)
        if resp:
            return resp

    # 2. Logic khi user nói đã hoàn thành tất cả task (finishAllTask)
    #    - Nếu thực sự không còn task đang active -> finishAllRecommentedTask
    #    - Nếu vẫn còn nhưng không còn task hôm nay -> finishTodayTask
    #    - Ngược lại -> todayTask
    #    Đồng thời, nếu đã hoàn thành task hôm nay nhưng vẫn còn task khác -> thêm recommentedTasks.
    if tag == "finishAllTask":
        if active_tasks_count == 0:
            # Hoàn thành hết mọi task đang active
            resp = _build_response_for_tag("finishAllRecommentedTask", context)
        else:
            if today_tasks_count == 0:
                # Không còn task hôm nay, nhưng vẫn còn task khác
                resp = _build_response_for_tag("finishTodayTask", context)
            else:
                # Vẫn còn task hôm nay
                resp = _build_response_for_tag("todayTask", context)

        # Nếu đã hoàn thành task hôm nay nhưng vẫn còn task khác -> gợi ý thêm
        if today_tasks_count == 0 and active_tasks_count > 0:
            extra = _build_response_for_tag("recommentedTasks", context)
            if extra:
                return (resp or "") + "\n\n" + extra

        if resp:
            return resp

    # 3. Khi user hỏi về task hôm nay (todayTask)
    #    - Nếu không còn task hôm nay nhưng vẫn có task khác -> trả todayTask + thêm recommentedTasks.
    if tag == "todayTask":
        resp = _build_response_for_tag("todayTask", context)
        if today_tasks_count == 0 and active_tasks_count > 0:
            extra = _build_response_for_tag("recommentedTasks", context)
            if extra:
                return (resp or "") + "\n\n" + extra
        if resp:
            return resp

    # 4. Kiểm tra trạng thái hoàn thành các task được đề xuất
    #    Ưu tiên:
    #    - Nếu model nhận diện là finishPartOfRecommentedTask -> dùng intent tương ứng
    #    - Nếu không, nhưng là finishAllRecommentedTask -> dùng intent tương ứng
    #    - Ngược lại -> dùng intent Warning
    if tag in ("finishPartOfRecommentedTask", "finishAllRecommentedTask", "Warning"):
        if tag == "finishPartOfRecommentedTask":
            resp = _build_response_for_tag("finishPartOfRecommentedTask", context)
        elif tag == "finishAllRecommentedTask":
            resp = _build_response_for_tag("finishAllRecommentedTask", context)
        else:
            resp = _build_response_for_tag("Warning", context)

        if resp:
            return resp

    # 5. Mặc định: dùng intent được model dự đoán với context
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
