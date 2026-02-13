import {
  initializeDefaults,
  listTodos,
  upsertTodo,
  removeTodo,
  materializeRecurringTodos,
  STORAGE_KEYS,
  onStateChanged
} from "../core/store.js";
import {
  startOfToday,
  endOfToday,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  toInputDateTimeValue,
  formatDateTime
} from "../core/date.js";
import { bootI18n, isEnglish, tr, applyLangToLinks, setText, setPlaceholder } from "../core/i18n.js";
import { bootTheme } from "../core/theme.js";

initializeDefaults();
bootTheme();
bootI18n();

const todoForm = document.getElementById("todoForm");
const todoListEl = document.getElementById("todoList");
const todoFilterSelect = document.getElementById("todoFilterSelect");
const todoDueAtInput = document.getElementById("todoDueAt");
const todoStatAllEl = document.getElementById("todoStatAll");
const todoStatDoingEl = document.getElementById("todoStatDoing");
const todoStatDoneEl = document.getElementById("todoStatDone");

const locale = isEnglish() ? "en-US" : "zh-CN";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function cycleStatus(status) {
  if (status === "todo") return "doing";
  if (status === "doing") return "done";
  if (status === "done") return "todo";
  return "todo";
}

function statusLabel(status) {
  if (status === "doing") return tr("进行中", "In progress");
  if (status === "done") return tr("已完成", "Done");
  return tr("待办", "Todo");
}

function repeatLabel(repeat) {
  if (repeat === "hourly") return tr("每小时", "Hourly");
  if (repeat === "daily") return tr("每天", "Daily");
  if (repeat === "weekly") return tr("每周", "Weekly");
  if (repeat === "monthly") return tr("每月", "Monthly");
  return tr("不重复", "No repeat");
}

function getWindowByFilter(filter) {
  const now = new Date();
  if (filter === "today") {
    return [startOfToday(), endOfToday()];
  }
  if (filter === "24h") {
    return [now, new Date(Date.now() + 24 * 60 * 60 * 1000)];
  }
  if (filter === "week") {
    return [startOfWeek(now), endOfWeek(now)];
  }
  if (filter === "month") {
    return [startOfMonth(now), endOfMonth(now)];
  }
  return [null, null];
}

function collectVisibleItems(filter) {
  const todos = listTodos({ includeArchived: false });

  if (filter === "done") {
    return todos.filter((todo) => todo.status === "done").map((todo) => ({ ...todo, occurrenceISO: todo.dueAtISO }));
  }

  if (filter === "expired") {
    const nowMs = Date.now();
    return todos
      .filter((todo) => todo.status !== "done" && new Date(todo.dueAtISO).getTime() < nowMs)
      .map((todo) => ({ ...todo, occurrenceISO: todo.dueAtISO }));
  }

  if (filter === "all") {
    return todos.map((todo) => ({ ...todo, occurrenceISO: todo.dueAtISO }));
  }

  const [start, end] = getWindowByFilter(filter);
  if (!start || !end) {
    return todos.map((todo) => ({ ...todo, occurrenceISO: todo.dueAtISO }));
  }

  const occ = materializeRecurringTodos(start.toISOString(), end.toISOString());
  const byId = new Map(todos.map((todo) => [todo.id, todo]));

  return occ
    .map((item) => {
      const base = byId.get(item.todoId);
      if (!base || base.status === "archived") {
        return null;
      }
      return {
        ...base,
        occurrenceISO: item.startISO
      };
    })
    .filter(Boolean);
}

function renderStats() {
  const todos = listTodos({ includeArchived: false });
  todoStatAllEl.textContent = String(todos.length);
  todoStatDoingEl.textContent = String(todos.filter((todo) => todo.status === "doing").length);
  todoStatDoneEl.textContent = String(todos.filter((todo) => todo.status === "done").length);
}

function renderTodoList() {
  const filter = todoFilterSelect.value;
  const items = collectVisibleItems(filter).sort(
    (a, b) => new Date(a.occurrenceISO || a.dueAtISO).getTime() - new Date(b.occurrenceISO || b.dueAtISO).getTime()
  );

  if (items.length === 0) {
    todoListEl.innerHTML = `<li class="todo-item"><span class="muted">${tr(
      "当前筛选条件下暂无任务",
      "No tasks under current filter"
    )}</span></li>`;
    return;
  }

  todoListEl.innerHTML = items
    .map((item) => {
      const tags = Array.isArray(item.tags) ? item.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("") : "";
      return `
      <li class="todo-item" data-id="${item.id}">
        <div>
          <h3 class="todo-title">${escapeHtml(item.title)}</h3>
          <div class="todo-meta">${formatDateTime(item.occurrenceISO || item.dueAtISO, "Asia/Shanghai", locale)} · ${statusLabel(
            item.status
          )} · ${repeatLabel(item.repeat)}</div>
          ${item.note ? `<div class="muted" style="margin-top: 6px">${escapeHtml(item.note)}</div>` : ""}
          <div class="chips" style="margin-top: 8px">
            <span class="tag ${item.priority}">${item.priority}</span>
            ${tags}
          </div>
        </div>
        <div class="todo-actions">
          <button class="btn" data-action="cycle">${tr("下一状态", "Next status")}</button>
          <button class="btn" data-action="archive">${tr("归档", "Archive")}</button>
          <button class="btn btn-danger" data-action="delete">${tr("删除", "Delete")}</button>
        </div>
      </li>
    `;
    })
    .join("");
}

function bindListActions() {
  todoListEl.addEventListener("click", (event) => {
    const actionBtn = event.target.closest("button[data-action]");
    if (!actionBtn) {
      return;
    }
    const itemEl = actionBtn.closest("li[data-id]");
    const id = itemEl?.dataset.id;
    if (!id) {
      return;
    }

    const todo = listTodos({ includeArchived: true }).find((entry) => entry.id === id);
    if (!todo) {
      return;
    }

    const action = actionBtn.dataset.action;
    if (action === "delete") {
      removeTodo(id);
      return;
    }

    if (action === "archive") {
      upsertTodo({ ...todo, status: "archived" });
      return;
    }

    if (action === "cycle") {
      upsertTodo({ ...todo, status: cycleStatus(todo.status) });
    }
  });
}

function bindForm() {
  todoDueAtInput.value = toInputDateTimeValue(new Date(Date.now() + 60 * 60 * 1000));

  todoForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const title = document.getElementById("todoTitle").value.trim();
    const note = document.getElementById("todoNote").value.trim();
    const dueAt = document.getElementById("todoDueAt").value;
    const repeat = document.getElementById("todoRepeat").value;
    const priority = document.getElementById("todoPriority").value;
    const tags = document.getElementById("todoTags").value;

    if (!title || !dueAt) {
      return;
    }

    upsertTodo({
      title,
      note,
      dueAtISO: new Date(dueAt).toISOString(),
      repeat,
      status: "todo",
      priority,
      tags
    });

    todoForm.reset();
    todoDueAtInput.value = toInputDateTimeValue(new Date(Date.now() + 60 * 60 * 1000));
    document.getElementById("todoPriority").value = "medium";
    document.getElementById("todoRepeat").value = "none";
  });
}

function applyStaticI18n() {
  document.title = tr("BaoXiangGao Tools - TodoList", "BaoXiangGao Tools - TodoList");
  setText("#todoBrandTitle", "TodoList（日/小时/周/月）", "TodoList (Day/Hour/Week/Month)");
  setText("#todoBackHomeBtn", "返回首页", "Back Home");
  setText("#todoCreateTitle", "新建任务", "Create Task");
  setPlaceholder("#todoTitle", "任务标题", "Task title");
  setPlaceholder("#todoNote", "任务备注", "Task note");
  setText("#todoDueLabel", "截止时间", "Due time");
  setText("#todoRepeatLabel", "重复规则", "Repeat");
  setText("#todoPriorityLabel", "优先级", "Priority");
  setText("#todoTagsLabel", "标签（逗号分隔）", "Tags (comma separated)");
  setPlaceholder("#todoTags", "工作,学习", "work,study");
  setText("#todoStatAllLabel", "任务总数", "Total tasks");
  setText("#todoStatDoingLabel", "进行中", "In progress");
  setText("#todoStatDoneLabel", "已完成", "Done");

  setText("#todoForm button[type='submit']", "添加任务", "Add Task");

  const filterMap = {
    today: tr("今天", "Today"),
    "24h": tr("未来24小时", "Next 24 hours"),
    week: tr("本周", "This week"),
    month: tr("本月", "This month"),
    done: tr("已完成", "Done"),
    expired: tr("已过期", "Expired"),
    all: tr("全部", "All")
  };

  const repeatMap = {
    none: tr("不重复", "No repeat"),
    hourly: tr("每小时", "Hourly"),
    daily: tr("每天", "Daily"),
    weekly: tr("每周", "Weekly"),
    monthly: tr("每月", "Monthly")
  };

  const priorityMap = {
    high: tr("高", "High"),
    medium: tr("中", "Medium"),
    low: tr("低", "Low")
  };

  document.querySelectorAll("#todoFilterSelect option").forEach((opt) => {
    if (filterMap[opt.value]) {
      opt.textContent = filterMap[opt.value];
    }
  });

  document.querySelectorAll("#todoRepeat option").forEach((opt) => {
    if (repeatMap[opt.value]) {
      opt.textContent = repeatMap[opt.value];
    }
  });

  document.querySelectorAll("#todoPriority option").forEach((opt) => {
    if (priorityMap[opt.value]) {
      opt.textContent = priorityMap[opt.value];
    }
  });
}

function bootstrap() {
  applyStaticI18n();
  bindForm();
  bindListActions();

  todoFilterSelect.addEventListener("change", renderTodoList);

  onStateChanged((detail) => {
    if (detail.key === STORAGE_KEYS.todos) {
      renderTodoList();
      renderStats();
    }
  });

  renderTodoList();
  renderStats();
  applyLangToLinks();
}

bootstrap();
